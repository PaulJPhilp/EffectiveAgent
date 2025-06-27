/**
 * @file E2E test for a simple tool call using Google Gemini.
 */

import { Console, Effect, Chunk, pipe, Data, Layer } from "effect"
import { Args, Command } from "@effect/cli"
import { join } from "node:path"
import { ProviderService } from "@/services/ai/provider/service.js"
import { ModelService } from "@/services/ai/model/service.js"
import { Message, TextPart } from "@/schema.js"
import { ToolExecutionError } from "@/types.js"
import { EffectiveInput } from "@/types.js"
import { NodeContext } from "@effect/platform-node"

// Use e2e configuration
process.env.EFFECTIVE_AGENT_MASTER_CONFIG = join(
  process.cwd(),
  "src/e2e/config/master-config.json"
)

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
      const response = yield* client.generateText(
        new EffectiveInput(input, Chunk.fromIterable([message])),
        {
          modelId: defaultModel.id,
          system: "You are a helpful assistant that provides accurate, factual answers."
        }
      )

      return response.data.text
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
        yield* Console.log(response)
        return response
      }),
      Effect.provide(ProviderService.Default),
      Effect.provide(ModelService.Default)
    )
)

const testEffect = Effect.gen(function* () {
  // Run chat command directly
  const service = yield* makeChatCommand
  const response = yield* service.chat("What's the weather like in San Francisco?")

  // Log the response
  yield* Effect.logInfo("AI Response:", response)

  // Check if the response includes weather-related terms
  const weatherTerms = ["temperature", "weather", "climate", "degrees", "forecast"]
  if (weatherTerms.some(term => response.toLowerCase().includes(term))) {
    yield* Effect.logInfo("Tool call test passed: Response contains weather information")
  } else {
    return yield* Effect.fail(new ToolExecutionError(
      "Tool call test failed: Response does not contain weather information",
      "e2e",
      "testEffect"
    ))
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
  Effect.provide(NodeContext.layer),
  Effect.withLogSpan("google-gemini-tool-call")
)

Effect.runPromise(runWithServices as Effect.Effect<void, unknown, never>).catch(handleError)
