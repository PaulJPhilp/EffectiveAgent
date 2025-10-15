/**
 * e2e test for OpenAI GPT-4 using the calculator tool
 */

import { ok } from "node:assert"
import { join } from "node:path"
import { NodeContext } from "@effect/platform-node"
import { Message, TextPart } from "@effective-agent/ai-sdk"
import { Chunk, Effect, pipe } from "effect"
import { ModelService } from "@/services/ai/model/service.js"
import { ProviderService } from "@/services/ai/provider/service.js"
import { ToolNotFoundErrorInRegistry } from "@/services/ai/tool-registry/errors.js"
import { ToolRegistryService } from "@/services/ai/tool-registry/service.js"
import type { ToolDefinition } from "@/services/ai/tool-registry/types.js"
import { EffectiveInput } from "@/types.js"

// OpenAI function tool type
type OpenAIFunctionTool = {
  type: "function"
  function: {
    name: string
    description: string
    parameters: {
      type: "object"
      properties: {
        [key: string]: {
          type: string
          description: string
        }
      }
      required: string[]
    }
  }
}

// Use e2e configuration
process.env.EFFECTIVE_AGENT_MASTER_CONFIG = join(
  process.cwd(),
  "src/e2e/config/master-config.json"
)

const makeChatCommand = Effect.gen(function* () {
  // Get required services
  const provider = yield* ProviderService
  const _model = yield* ModelService
  const toolRegistry = yield* ToolRegistryService

  return {
    chat: (input: string) => Effect.gen(function* () {
      // Get calculator tool and convert to OpenAI function format
      const calculatorDef = yield* pipe(
        toolRegistry.getTool("e2e-tools:calculator"),
        Effect.mapError((error: unknown) => {
          if (error instanceof ToolNotFoundErrorInRegistry) {
            return new Error(`Calculator tool not found: ${error.message}`)
          }
          return error
        }))

      // Get provider client and send chat request
      const openaiClient = yield* provider.getProviderClient("openai")
      const response = yield* openaiClient.chat(
        new EffectiveInput(
          "",
          Chunk.fromIterable([
            new Message({
              role: "system",
              parts: Chunk.fromIterable([
                new TextPart({ _tag: "Text", content: "You are a math assistant that helps solve calculations. When you need to perform calculations, always use the calculator tool to ensure accuracy. After using the calculator, explain the result in a clear way." })
              ])
            }),
            new Message({
              role: "user",
              parts: Chunk.fromIterable([
                new TextPart({ _tag: "Text", content: input })
              ])
            })
          ])
        ),
        {
          modelId: "gpt-4",
          tools: [calculatorDef as unknown as ToolDefinition]
        }
      )

      return response.data.text
    })
  }
})



const testEffect = Effect.gen(function* () {
  // Run chat command directly
  const service = yield* makeChatCommand
  const response = yield* service.chat("What is the square root of 169 multiplied by the cube of 3?")

  // Log the response
  yield* Effect.logInfo("AI Response:", response)

  // Verify that the response includes both the calculation (13 * 27 = 351) and an explanation
  const text = response.toLowerCase()
  ok(text.includes("351"), "Response should include the correct calculation result (351)")
  ok(
    text.includes("square root") && text.includes("cube"),
    "Response should explain the mathematical operations"
  )
  ok(
    text.includes("calculator"),
    "Response should mention using the calculator tool"
  )

  yield* Effect.logInfo("Tool call test passed: Calculator used correctly")
})

const handleError = (error: Error | unknown) => {
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
  Effect.withLogSpan("openai-gpt4-calculator")
)

Effect.runPromise(runWithServices as Effect.Effect<void, unknown, never>).catch(handleError)
