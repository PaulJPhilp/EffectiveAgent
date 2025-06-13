import { Args, Command, Options } from "@effect/cli"
import { Console, Effect, Schema, Data, Option } from "effect"
import { FileSystem, Path } from "@effect/platform"
import { StructuredOutputAgent } from "../../../examples/structured-output/agent.js"
import { ModelService } from "../../../services/ai/model/service.js"

/**
 * Predefined schemas available for structured-output testing.
 */
const PersonSchema = Schema.Struct({
  name: Schema.String,
  age: Schema.Number,
  isStudent: Schema.Boolean,
  address: Schema.Struct({
    street: Schema.String,
    city: Schema.String,
  }),
})

const ProductSchema = Schema.Struct({
  productName: Schema.String,
  price: Schema.Number,
  inStock: Schema.Boolean,
})

const PREDEFINED_SCHEMAS: Record<string, Schema.Schema<any, any>> = {
  Person: PersonSchema,
  Product: ProductSchema,
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface Person extends Schema.Schema.Type<typeof PersonSchema> {}

const TestCaseSchema = Schema.Struct({
  caseName: Schema.String,
  type: Schema.Literal("generate", "extract"),
  schema: Schema.String,
  prompt: Schema.optional(Schema.String),
  text: Schema.optional(Schema.String),
})
export interface TestCase extends Schema.Schema.Type<typeof TestCaseSchema> {}

const InputConfigSchema = Schema.Struct({
  testSuite: Schema.String,
  cases: Schema.Array(TestCaseSchema),
})
export interface InputConfig
  extends Schema.Schema.Type<typeof InputConfigSchema> {}

// -----------------------------------------------------------------------------
// Error Type
// -----------------------------------------------------------------------------

export class StructureOutputCommandError extends Data.TaggedError(
  "StructureOutputCommandError",
)<{
  readonly message: string
  readonly cause?: unknown
}> {}

// -----------------------------------------------------------------------------
// Command Implementation
// -----------------------------------------------------------------------------

export const structureOutputCommand = Command.make(
  "structure-output",
  {
    example: Args.text({ name: "example" }).pipe(
      Args.withDescription(
        "The name of the example to run (e.g., 'structured-output')",
      ),
    ),
    input: Options.text("input").pipe(
      Options.withDescription(
        "Path to a JSON file defining the test cases",
      ),
    ),
    output: Options.text("output").pipe(
      Options.withDescription(
        "Path to a directory to save the raw JSON outputs",
      ),
    ),
    models: Options.text("models").pipe(
      Options.withDescription(
        "Comma-separated list of model IDs to test against",
      ),
      Options.optional,
    ),
    runs: Options.integer("runs").pipe(
      Options.withDescription(
        "Number of times to run each test case against each model",
      ),
      Options.withDefault(1),
    ),
  },
  (
    options: {
      example: string
      models: Option.Option<string>
      input: string
      output: string
      runs: number
    },
  ) =>
    Effect.gen(function* () {
      const { example, models: modelsOpt, input, output, runs } = options
      const modelsString = Option.getOrUndefined(modelsOpt)

      // -----------------------------------------------------------------------
      // Startup banner
      // -----------------------------------------------------------------------

      yield* Console.log("🚀 Starting Structured-Output Test Runner")
      yield* Console.log("---------------------------------")
      yield* Console.log(`▶️  Example: ${example}`)
      yield* Console.log(`📝 Input Config: ${input}`)
      yield* Console.log(`🗂️  Output Directory: ${output}`)
      yield* Console.log(`🤖 Models: ${modelsString ?? "default"}`)
      yield* Console.log(`🔁 Runs per case: ${runs}`)
      yield* Console.log("---------------------------------")

      // -----------------------------------------------------------------------
      // Service access
      // -----------------------------------------------------------------------

      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const modelService = yield* ModelService

      // -----------------------------------------------------------------------
      // Read & validate input config
      // -----------------------------------------------------------------------

      yield* Console.log(`📄 Reading input file: ${input}`)

      const inputContent = yield* fs.readFileString(input).pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new StructureOutputCommandError({
              message: `Failed to read input file: ${input}`,
              cause: error,
            }),
          ),
        ),
      )

      const parsedConfig = yield* Effect.try({
        try: () => JSON.parse(inputContent) as InputConfig,
        catch: (error) =>
          new StructureOutputCommandError({
            message: `Failed to parse input file as JSON`,
            cause: error,
          }),
      })

      const validatedConfig = yield* Schema.decode(InputConfigSchema)(
        parsedConfig,
      ).pipe(
        Effect.mapError((error) =>
          new StructureOutputCommandError({
            message: `Input config validation failed`,
            cause: error,
          }),
        ),
      )

      // -----------------------------------------------------------------------
      // Prepare output directory
      // -----------------------------------------------------------------------

      const outputExists = yield* fs.exists(output).pipe(
        Effect.catchAll((error) =>
          Effect.fail(
            new StructureOutputCommandError({
              message: `Error checking output directory`,
              cause: error,
            }),
          ),
        ),
      )

      if (!outputExists) {
        yield* Console.log(`Creating output directory: ${output}`)
        yield* fs.makeDirectory(output, { recursive: true }).pipe(
          Effect.mapError((error) =>
            new StructureOutputCommandError({
              message: `Failed to create output directory: ${output}`,
              cause: error,
            }),
          ),
        )
      } else {
        const stat = yield* fs.stat(output)
        if (stat.type !== "Directory") {
          return yield* Effect.fail(
            new StructureOutputCommandError({
              message: `${output} exists and is not a directory`,
            }),
          )
        }
      }

      yield* Console.log(`✅ Output directory verified: ${output}`)

      // -----------------------------------------------------------------------
      // Determine models to test
      // -----------------------------------------------------------------------

      const modelIds = modelsString
        ? modelsString.split(",").map((id) => id.trim())
        : [yield* modelService.getDefaultModelId()]

      yield* Console.log(
        "ℹ️  Note: 'modelId' from CLI is used for 'extract' tasks; " +
          "'generate' tasks currently use agent's default.",
      )

      // -----------------------------------------------------------------------
      // Ensure model availability
      // -----------------------------------------------------------------------

      const availableModels = [] as string[]
      for (const id of modelIds) {
        const exists = yield* modelService.exists(id)
        if (!exists) {
          yield* Console.warn(`⚠️  Model '${id}' not found. Skipping.`)
        } else {
          availableModels.push(id)
        }
      }

      if (availableModels.length === 0) {
        return yield* Effect.fail(
          new StructureOutputCommandError({
            message: `No valid models to run tests against`,
          }),
        )
      }

      // -----------------------------------------------------------------------
      // Prepare results directory (timestamped)
      // -----------------------------------------------------------------------

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      const resultsDir = path.join(output, timestamp)
      yield* fs.makeDirectory(resultsDir, { recursive: true }).pipe(
        Effect.mapError((cause) =>
          new StructureOutputCommandError({
            message: `Failed to create output dir ${resultsDir}`,
            cause,
          }),
        ),
      )

      yield* Console.log(`Found ${validatedConfig.cases.length} test cases.`)

      // -----------------------------------------------------------------------
      // Execute test cases
      // -----------------------------------------------------------------------

      const agent = yield* StructuredOutputAgent

      for (const testCase of validatedConfig.cases) {
        yield* Console.log(`\n--- Test Case: ${testCase.caseName} ---`)

        for (const modelId of availableModels) {
          yield* Console.log(`   🤖 Model: ${modelId}`)

          for (let run = 1; run <= runs; run++) {
            yield* Console.log(`    🔄 Run: ${run}/${runs}`)

            const schema = PREDEFINED_SCHEMAS[testCase.schema]
            let result: unknown

            if (!schema) {
              yield* Console.error(
                `❌ Schema '${testCase.schema}' not found. Skipping run.`,
              )
              result = { error: `Schema '${testCase.schema}' not found.` }
            } else if (testCase.type === "generate") {
              if (!testCase.prompt) {
                yield* Console.error(
                  `❌ Missing prompt for generate operation. Skipping.`,
                )
                result = { error: "Missing prompt" }
              } else {
                result = yield* agent.generateStructuredOutput({
                  schema,
                  prompt: testCase.prompt,
                  modelId,
                })
              }
            } else if (testCase.type === "extract") {
              if (!testCase.text) {
                yield* Console.error(
                  `❌ Missing text for extract operation. Skipping.`,
                )
                result = { error: "Missing text" }
              } else {
                const agentWithModel = { ...agent, modelId }
                result = yield* agentWithModel.extractStructured(
                  testCase.text,
                  schema,
                )
              }
            } else {
              result = { error: `Unknown case type ${testCase.type}` }
            }

            const fileName = `${testCase.caseName}_${modelId}_run${run}.json`
            const filePath = path.join(resultsDir, fileName)
            yield* fs.writeFileString(filePath, JSON.stringify(result, null, 2)).pipe(
              Effect.mapError((cause) =>
                new StructureOutputCommandError({
                  message: `Failed to write output ${filePath}`,
                  cause,
                }),
              ),
            )
          }
        }
      }

      yield* Console.log("\n🎉 All test runs completed.")
    }).pipe(
      Effect.catchAll((error) =>
        Console.error(
          error instanceof StructureOutputCommandError
            ? `❌ Error: ${error.message}`
            : "An unexpected error occurred:",
          error,
        ),
      ),
    ),
).pipe(
  Command.withDescription("Runs structured-output E2E test suites."),
)

export default structureOutputCommand
