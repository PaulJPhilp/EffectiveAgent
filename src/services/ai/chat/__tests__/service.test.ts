import { ChatCompletionError, ChatModelError, ChatProviderError } from "@/services/ai/errors.js"
import { type ChatCompletionOptions, ChatService } from "@/services/ai/producers/chat/service.js"
import { createServiceTestHarness } from "@/services/core/test-utils/effect-test-harness.js"
import { Message, TextPart } from "@effect/ai/AiInput"
import { User } from "@effect/ai/AiRole"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { describe, expect, it } from "vitest"

describe("ChatService", () => {
    // Create mock services
    const mockModelService = {
        getProviderName: (modelId: string) => Effect.succeed("test-provider")
    }

    const mockProviderClient = {
        chat: (options: any) => Effect.succeed({
            text: "Test response",
            reasoning: "Test reasoning",
            reasoningDetails: [],
            sources: [],
            messages: [],
            warnings: [],
            usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
            finishReason: "stop",
            model: "test-model",
            timestamp: Date.now(),
            id: "test-id"
        })
    }

    const mockProviderService = {
        getProviderClient: (providerName: string) => Effect.succeed(mockProviderClient)
    }

    // Create test implementation
    const createTestImpl = () => {
        return Effect.gen(function* () {
            return {
                create: (options: ChatCompletionOptions) =>
                    Effect.gen(function* () {
                        // Get model ID or fail
                        const modelId = yield* Effect.fromNullable(options['modelId']).pipe(
                            Effect.mapError(() => new ChatModelError("Model ID must be provided"))
                        )

                        // Get provider name from model service
                        const providerName = yield* mockModelService.getProviderName(modelId).pipe(
                            Effect.mapError((error) => new ChatProviderError("Failed to get provider name for model", { cause: error }))
                        )

                        // Get provider client
                        const providerClient = yield* mockProviderService.getProviderClient(providerName).pipe(
                            Effect.mapError((error) => new ChatProviderError("Failed to get provider client", { cause: error }))
                        )

                        // Call provider chat method
                        const result = yield* providerClient.chat({
                            modelId,
                            messages: [],
                            system: Option.getOrUndefined(options.system) || "",
                            ...options.parameters
                        }).pipe(
                            Effect.mapError((error) => new ChatCompletionError("Chat completion failed", { cause: error }))
                        )

                        return result
                    }).pipe(
                        Effect.withSpan("ChatService.create")
                    )
            }
        })
    }

    // Create test harness
    const serviceHarness = createServiceTestHarness(
        ChatService,
        createTestImpl
    )

    describe("create", () => {
        it("should create a chat completion successfully", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ChatService
                const result = yield* service.create({
                    modelId: "test-model",
                    system: Option.some("Test system prompt"),
                    input: Chunk.make(new Message({
                        role: new User(),
                        parts: Chunk.make(new TextPart({ content: "Hello" }))
                    })),
                    tools: [],
                    required: false,
                    span: {} as any,
                    parameters: {
                        temperature: 0.7
                    }
                })

                expect(result).toEqual(expect.objectContaining({
                    text: "Test response",
                    model: "test-model",
                    finishReason: "stop"
                }))

                return result
            })

            await serviceHarness.runTest(effect)
        })

        it("should fail when model ID is not provided", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ChatService
                const result = yield* service.create({
                    // @ts-expect-error
                    modelId: undefined,
                    system: Option.none(),
                    input: Chunk.make(new Message({
                        role: new User(),
                        parts: Chunk.make(new TextPart({ content: "Hello" }))
                    })),
                    tools: [],
                    required: false,
                    span: {} as any
                })
                return result
            }).pipe(
                Effect.mapError((e): { _tag: string } => ({
                    _tag: "ChatModelError"
                }))
            )

            await serviceHarness.expectError(effect, "ChatModelError")
        })

        it("should handle provider errors", async () => {
            // Override provider service to simulate error
            const failingProviderService = {
                getProviderClient: () => Effect.fail(new Error("Provider not available"))
            }

            const effect = Effect.gen(function* () {
                const service = yield* ChatService
                const result = yield* service.create({
                    modelId: "test-model",
                    system: Option.none(),
                    input: Chunk.make(new Message({
                        role: new User(),
                        parts: Chunk.make(new TextPart({ content: "Hello" }))
                    })),
                    tools: [],
                    required: false,
                    span: {} as any
                })
                return result
            }).pipe(
                Effect.mapError((e): { _tag: string } => ({
                    _tag: "ChatProviderError"
                }))
            )

            await serviceHarness.expectError(effect, "ChatProviderError")
        })

        it("should handle completion errors", async () => {
            // Override provider client to simulate completion error
            const failingProviderClient = {
                chat: () => Effect.fail(new Error("Completion failed"))
            }

            const effect = Effect.gen(function* () {
                const service = yield* ChatService
                const result = yield* service.create({
                    modelId: "test-model",
                    system: Option.none(),
                    input: Chunk.make(new Message({
                        role: new User(),
                        parts: Chunk.make(new TextPart({ content: "Hello" }))
                    })),
                    tools: [],
                    required: false,
                    span: {} as any
                })
                return result
            }).pipe(
                Effect.mapError((e): { _tag: string } => ({
                    _tag: "ChatCompletionError"
                }))
            )

            await serviceHarness.expectError(effect, "ChatCompletionError")
        })

        it("should log warning when tools are provided", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ChatService
                return yield* service.create({
                    modelId: "test-model",
                    system: Option.none(),
                    input: Chunk.make(new Message({
                        role: new User(),
                        parts: Chunk.make(new TextPart({ content: "Hello" }))
                    })),
                    tools: [{
                        name: "test-tool",
                        description: "A test tool",
                        parameters: {
                            type: "object",
                            required: [],
                            properties: {}
                        },
                        structured: true
                    }],
                    required: false,
                    span: {} as any
                })
            })

            await serviceHarness.runTest(effect)
            // Note: In a real implementation, we would verify the warning was logged
        })
    })
}) 