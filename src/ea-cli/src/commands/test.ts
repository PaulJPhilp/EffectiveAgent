import { Args, Command, Options } from "@effect/cli"
import { FileSystem, Path } from "@effect/platform"
import { Console, Data, Effect, Option, Schema } from "effect"
import { StructuredOutputAgent } from "../../../examples/structured-output/agent.js"
import { ModelService } from "../../../services/ai/model/service.js"

// Define predefined schemas that can be referenced by name in the input config.
const PersonSchema = Schema.Struct({
  name: Schema.String,
  age: Schema.Number,
  isStudent: Schema.Boolean,
  address: Schema.Struct({ street: Schema.String, city: Schema.String }),
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

export interface Person extends Schema.Schema.Type<typeof PersonSchema> {}

// Define a schema for individual test cases
const TestCaseSchema = Schema.Struct({
  caseName: Schema.String,
  type: Schema.Literal("generate", "extract"),
  schema: Schema.String, // This should be a string key for PREDEFINED_SCHEMAS
  prompt: Schema.optional(Schema.String),
  text: Schema.optional(Schema.String),
})
export interface TestCase extends Schema.Schema.Type<typeof TestCaseSchema> {}

// Define a schema for the main input configuration file
const InputConfigSchema = Schema.Struct({
  testSuite: Schema.String,
  cases: Schema.Array(TestCaseSchema),
})
export interface InputConfig
  extends Schema.Schema.Type<typeof InputConfigSchema> {}

export class TestCommandError extends Data.TaggedError("TestCommandError")<{
  readonly message: string
  readonly cause?: unknown
}> {}

export const testCommand = Command.make(
  "test",
  {
    example: Args.text({ name: "example" }).pipe(
      Args.withDescription(
        "The name of the example to run (e.g., 'structured-output')",
      ),
    ),
    input: Options.text("input").pipe(
      Options.withDescription("Path to a JSON file defining the test cases"),
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
  // Type the options for clarity, matching @effect/cli's inferred types
  (options: {
    example: string
    models: Option.Option<string>
    input: string
    output: string
    runs: number
  }) =>
    Effect.gen(function* () {
      const { example, models: modelsOption, input, output, runs } = options
      const modelsString = Option.getOrUndefined(modelsOption)

      yield* Console.log("🚀 Starting E2E Test Runner")
      yield* Console.log("---------------------------------")
      yield* Console.log(`▶️  Example: ${example}`)
      yield* Console.log(`📝 Input Config: ${input}`)
      yield* Console.log(`🗂️  Output Directory: ${output}`)
      yield* Console.log(`🤖 Models: ${modelsString ?? "default"}`)
      yield* Console.log(`🔁 Runs per case: ${runs}`)
      yield* Console.log("---------------------------------")

      const fs = yield* FileSystem.FileSystem
      const path = yield* Path.Path
      const modelService = yield* ModelService

      // Read and validate the input file
      yield* Console.log(`📄 Reading input file: ${input}`)

      // Read the input file content directly
      const inputContent = yield* fs.readFileString(input).pipe(
        Effect.catchAll((error) => {
          return Effect.gen(function* () {
            yield* Console.error(`❌ Error reading input file: ${error}`)
            return yield* Effect.fail(
              new TestCommandError({
                message: `Failed to read input file: ${input}`,
                cause: error,
              }),
            )
          })
        }),
      )

      yield* Console.log("✅ Input file read successfully")

      // Parse the JSON content
      const config = yield* Effect.try({
        try: () => JSON.parse(inputContent),
        catch: (error) =>
          new TestCommandError({
            message: `Failed to parse input file as JSON: ${error}`,
            cause: error,
          }),
      })

      // Validate against schema
      const inputConfig = yield* Schema.decode(InputConfigSchema)(config).pipe(
        Effect.mapError((error) => {
          return new TestCommandError({
            message: `Invalid input file format: ${error}`,
            cause: error,
          })
        }),
      )

      yield* Console.log("✅ Input file validated successfully")
      yield* Console.log(`📋 Test suite: ${inputConfig.testSuite}`)
      yield* Console.log(`🧪 Test cases: ${inputConfig.cases.length}`)

      // Verify output directory exists or create it
      const outputExists = yield* Effect.flatMap(
        fs.exists(output),
        (exists) => {
          return Effect.succeed(exists)
        },
      ).pipe(
        Effect.catchAll((error) => {
          return Effect.gen(function* () {
            yield* Console.error(
              `❌ Error checking if output directory exists: ${error}`,
            )
            return false
          })
        }),
      )

      if (!outputExists) {
        yield* Console.log(`Creating output directory: ${output}`)
        yield* fs.makeDirectory(output, { recursive: true }).pipe(
          Effect.catchAll((error) => {
            return Effect.gen(function* () {
              yield* Console.error(
                `❌ Error creating output directory: ${error}`,
              )
              return yield* Effect.fail(
                new TestCommandError({
                  message: `Failed to create output directory: ${output}`,
                  cause: error,
                }),
              )
            })
          }),
        )
      } else {
        // Verify output is a directory
        const outputStat = yield* fs.stat(output).pipe(
          Effect.catchAll((error) => {
            return Effect.gen(function* () {
              yield* Console.error(
                `❌ Error getting output directory stats: ${error}`,
              )
              return yield* Effect.fail(
                new TestCommandError({
                  message: `Failed to get stats for output directory: ${output}`,
                  cause: error,
                }),
              )
            })
          }),
        )

        if (outputStat.type !== "Directory") {
          return yield* Effect.fail(
            new TestCommandError({
              message: `Output path is not a directory: ${output}`,
            }),
          )
        }
      }

      yield* Console.log(`✅ Output directory verified: ${output}`)

      // Verify models
      if (modelsString) {
        const modelIds = modelsString.split(",").map((id) => id.trim())
        for (const modelId of modelIds) {
          yield* modelService.exists(modelId).pipe(
            Effect.match({
              onSuccess: (exists) =>
                Effect.gen(function* () {
                  if (exists) {
                    yield* Console.log(`✅ Model verified: ${modelId}`)
                  } else {
                    yield* Console.warn(
                      `⚠️ Model not found: ${modelId}. Will attempt to use anyway.`,
                    )
                  }
                }),
              onFailure: (_error) =>
                Effect.gen(function* () {
                  yield* Console.warn(
                    `⚠️ Error checking model: ${modelId}. Will attempt to use anyway.`,
                  )
                }),
            }),
          )
        }
      }

      // 1. Create timestamped output directory
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      const resultsDir = path.join(output, timestamp)
      yield* Console.log(`Creating results directory: ${resultsDir}`)
      yield* fs.makeDirectory(resultsDir, { recursive: true }).pipe(
        Effect.mapError(
          (cause) =>
            new TestCommandError({
              message: `Failed to create output directory ${resultsDir}`,
              cause,
            }),
        ),
      )
      yield* Console.log(`✅ Results directory created: ${resultsDir}`)

      // 2. Read and parse input config JSON
      yield* Console.log(`Reading input config: ${input}`)
      const configFileContent = yield* fs.readFileString(input).pipe(
        Effect.mapError(
          (cause) =>
            new TestCommandError({
              message: `Failed to read input file ${input}`,
              cause,
            }),
        ),
      )
      const parsedConfig = yield* Schema.decode(InputConfigSchema)(
        JSON.parse(configFileContent),
      ).pipe(
        Effect.mapError(
          (cause) =>
            new TestCommandError({
              message: "Failed to parse or validate input config",
              cause,
            }),
        ),
      )
      yield* Console.log(`Found ${parsedConfig.cases.length} test cases.`)

      let modelIdsToTest: string[]
      if (modelsString) {
        modelIdsToTest = modelsString.split(",")
      } else {
        const defaultModelId = yield* modelService.getDefaultModelId().pipe(
          Effect.catchAll((error) =>
            Effect.die(
              new TestCommandError({
                message: "Failed to get default model ID",
                cause: error,
              }),
            ),
          ),
        )
        modelIdsToTest = [defaultModelId]
        yield* Console.log(
          `ℹ️  No models specified, using default: ${defaultModelId}`,
        )
      }

      yield* Console.log(
        `🧪 Testing against models: ${modelIdsToTest.join(", ")}`,
      )
      yield* Console.log(
        "ℹ️  Note: Schemas are referenced by name from a predefined set (e.g., 'Person', 'Product').",
      )
      yield* Console.log(
        "ℹ️  Note: 'modelId' from CLI is used for 'extract' tasks; 'generate' tasks currently use agent's default.",
      )

      const agent = yield* StructuredOutputAgent

      for (const testCase of parsedConfig.cases) {
        yield* Console.log(`\n--- Running Test Case: ${testCase.caseName} ---`)
        for (const modelId of modelIdsToTest) {
          const isValidModel = yield* modelService.exists(modelId)
          if (!isValidModel) {
            yield* Console.warn(
              `⚠️ Model '${modelId}' not found or invalid. Skipping tests for this model.`,
            )
            continue
          }
          yield* Console.log(`   M Model: ${modelId}`)
          for (let run = 1; run <= runs; run++) {
            yield* Console.log(`    🔄 Run: ${run}/${runs}`)

            let agentResult: unknown
            const currentSchema = PREDEFINED_SCHEMAS[testCase.schema]

            if (!currentSchema) {
              yield* Console.error(
                `❌ Schema '${testCase.schema}' not found in predefined schemas. Skipping run.`,
              )
              agentResult = { error: `Schema '${testCase.schema}' not found.` }
            } else {
              if (testCase.type === "generate") {
                if (!testCase.prompt) {
                  yield* Console.error(
                    `❌ Skipping generate case '${testCase.caseName}' due to missing prompt.`,
                  )
                  agentResult = {
                    error: "Missing prompt for generate operation",
                  }
                } else {
                  agentResult = yield* agent.generateStructuredOutput({
                    schema: currentSchema,
                    prompt: testCase.prompt,
                    modelId,
                  })
                }
              } else if (testCase.type === "extract") {
                if (!testCase.text) {
                  yield* Console.error(
                    `❌ Skipping extract case '${testCase.caseName}' due to missing text.`,
                  )
                  agentResult = { error: "Missing text for extract operation" }
                } else {
                  // Use the same agent with model ID
                  const agentWithModel = { ...agent, modelId }
                  agentResult = yield* agentWithModel.extractStructured(
                    testCase.text,
                    currentSchema,
                  )
                }
              } else {
                yield* Console.error(
                  `❌ Unknown test case type: ${testCase.type}`,
                )
                agentResult = {
                  error: `Unknown test case type: ${testCase.type}`,
                }
              }
            }

            const outputFileName = `${testCase.caseName}_${modelId}_run${run}.json`
            const outputFilePath = path.join(resultsDir, outputFileName)

            yield* Console.log(`    💾 Saving output to: ${outputFilePath}`)
            yield* fs
              .writeFileString(
                outputFilePath,
                JSON.stringify(agentResult, null, 2),
              )
              .pipe(
                Effect.mapError(
                  (cause) =>
                    new TestCommandError({
                      message: `Failed to write output file ${outputFilePath}`,
                      cause,
                    }),
                ),
              )
          }
        }
      }
      yield* Console.log("\n🎉 All test runs completed.")
    }).pipe(
      Effect.provide(StructuredOutputAgent.Default),
      Effect.provide(ModelService.Default),
      Effect.catchAll((error) => {
        if (error instanceof TestCommandError) {
          return Console.error(
            `❌ Error: ${error.message}${error.cause ? `\nCause: ${JSON.stringify(error.cause, null, 2)}` : ""}`,
          )
        }
        // For other errors, log them directly. Add more specific handling if needed.
        return Console.error("An unexpected error occurred:", error)
      }),
    ),
).pipe(Command.withDescription("Runs end-to-end tests for examples."))

export default testCommand
