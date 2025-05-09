import { TestHarnessService } from "@/services/core/test-harness/service.js"
import { createServiceTestHarness } from "@/services/core/test-harness/utils/service-test.js"
import { ChatService } from "@/services/pipeline/producers/chat/service.js"
import { Effect } from "effect"
import { describe, expect, it } from "vitest"

describe("ChatService", () => {
  const harness = createServiceTestHarness(
    ChatService,
    () => Effect.gen(function* () {
      return Effect.succeed({
        generate: (options: any) => Effect.succeed({
          data: {
            output: "Test response",
            usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
            finishReason: "stop",
            providerMetadata: {},
            toolCalls: []
          },
          messages: []
        })
      })
    })
  )

  describe("generate", () => {
    it("should generate chat completion successfully", async () => {
      const effect = Effect.gen(function* () {
        const service = yield* ChatService
        const result = yield* service.generate({
          input: "Test input",
          modelId: "test-model",
          span: Effect.currentSpan,
          text: "Test text"
        })

        expect(result.data.output).toBe("Test response")
        expect(result.data.usage.totalTokens).toBe(30)
      })

      await harness.runTest(effect)
    })

    it("should fail when input is empty", async () => {
      const effect = Effect.gen(function* () {
        const service = yield* ChatService
        yield* service.generate({
          input: "",
          modelId: "test-model",
          span: Effect.currentSpan,
          text: ""
        })
      })

      await harness.expectError(effect, "ChatInputError")
    })
  })
})
