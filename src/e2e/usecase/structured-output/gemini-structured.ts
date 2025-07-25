/**
 * e2e Gemini structured output test using ea-cli chat command
 */

import { Console, Effect, Chunk, pipe } from "effect"
import { Args, Command } from "@effect/cli"
import { join } from "node:path"
import { ProviderService } from "@/services/ai/provider/service.js"
import { ModelService } from "@/services/ai/model/service.js"
import { ToolRegistryService } from "@/services/ai/tool-registry/service.js"
import { NodeContext } from "@effect/platform-node"
import { EffectiveInput } from "@/types.js"
import { Message, TextPart } from "@/schema.js"

// Use e2e configuration
process.env.EFFECTIVE_AGENT_MASTER_CONFIG = join(
  process.cwd(),
  "src/e2e/config/master-config.json"
)

const prompt = "Return a raw JSON object with two keys: 'name' and 'age'. Do not wrap it in markdown or add any other text."

// Create chat command
const makeChatCommand = Effect.gen(function* () {
  // Get required services
  const provider = yield* ProviderService
  const model = yield* ModelService

  return {
    chat: (input: string) => Effect.gen(function* () {
      // Load available models
      const models = yield* model.load()
      const defaultModel = models.models[0]

      // Create message with user input
      const message = new Message({
        role: "user",
        parts: Chunk.fromIterable([new TextPart({ _tag: "Text", content: input })])
      })

      // Get provider client and send chat request
      const client = yield* provider.getProviderClient("google")
      const response = yield* client.chat(
        new EffectiveInput("", Chunk.fromIterable([message])),
        {
          modelId: "gemini-2.0-flash",
          tools: [],
          system: "You are a JSON data generator. You must ONLY return raw JSON data. Do not include any markdown formatting (no \`\`\`json), explanations, or additional text. The response must start with { and end with }. For this task, return an object with exactly two fields: name (string) and age (number)."
        }
      )

      return response
    })
  }
})

// Create chat command
const chatCommand = Command.make(
  "chat",
  {
    message: Args.text({ name: "message" }).pipe(
      Args.withDescription("Message to send to the AI assistant")
    )
  },
  ({ message }) =>
    pipe(
      Effect.gen(function* () {
        const service = yield* makeChatCommand
        const response = yield* service.chat(message)
        yield* Console.log(response.data.text)
        return response
      }),
      Effect.provide(ProviderService.Default),
      Effect.provide(ModelService.Default)
    )
)

const testEffect = Effect.gen(function* () {
  // Run chat command directly
  const service = yield* makeChatCommand
  const response = yield* service.chat(prompt)

  // Log the response
  yield* Effect.logInfo("Model output:", response.data.text)

  // Parse and validate JSON
  const parsed = yield* Effect.try({
    try: () => JSON.parse(response.data.text),
    catch: (e) => new Error(`Failed to parse model output as JSON: ${e}`)
  })

  // Verify the output has expected fields
  if (typeof parsed.name === "string" && typeof parsed.age === "number") {
    yield* Effect.logInfo("Structured output test passed.")
  } else {
    return yield* Effect.fail(new Error("Output JSON does not have expected fields."))
  }
})

const handleError = (error: unknown) => {
  console.error("Test failed:", error)
  process.exit(1)
}

process.on("uncaughtException", handleError)
process.on("unhandledRejection", handleError)

const runWithServices = pipe(
  testEffect,
  Effect.provide(ModelService.Default),
  Effect.provide(ProviderService.Default),
  Effect.provide(ToolRegistryService.Default),
  Effect.provide(NodeContext.layer),
  Effect.withLogSpan("gemini-structured")
)

Effect.runPromise(runWithServices as Effect.Effect<void, unknown, never>).catch(handleError)
