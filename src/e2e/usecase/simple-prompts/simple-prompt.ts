/**
 * e2e simple prompt test using ea-cli chat command
 */

import { join } from "node:path"
import { Args, Command } from "@effect/cli"
import { NodeContext } from "@effect/platform-node"
import { Chunk, Console, Effect, Layer, pipe } from "effect"
import { AgentRuntimeService } from "@/ea-agent-runtime/service.js"
import { ModelService } from "@/services/ai/model/service.js"
import { ProviderService } from "@/services/ai/provider/service.js"
import { EffectiveInput } from "@/types.js"

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

      // Get provider client and send chat request
      const client = yield* provider.getProviderClient("google")
      const response = yield* client.generateText(
        new EffectiveInput(input, Chunk.empty()),
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
  const response = yield* service.chat("What is the capital of France?")

  // Log the response
  yield* Effect.logInfo("AI Response:", response)

  // Check if the response mentions Paris
  if (response.toLowerCase().includes("paris")) {
    yield* Effect.logInfo("Test passed: Response correctly identified Paris as the capital")
  } else {
    return yield* Effect.fail(new Error(
      "Test failed: Response did not correctly identify Paris as the capital of France"
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
  Effect.withLogSpan("simple-prompt")
)

Effect.runPromise(runWithServices as Effect.Effect<void, unknown, never>).catch(handleError)