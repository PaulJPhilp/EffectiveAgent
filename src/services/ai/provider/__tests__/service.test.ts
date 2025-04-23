import * as fs from "fs";
import * as path from "path";
import { FinishReason } from "@/types.js";
import { LanguageModelV1 } from "@ai-sdk/provider";
import { Cause, ConfigProvider, Effect, Exit, Layer, Option } from "effect";
import { describe, expect, it } from "vitest";
import { ProviderClient, ProviderClientApi } from "../client.js";
import { ProviderConfigError, ProviderNotFoundError, ProviderOperationError } from "../errors.js";
import { ProviderService } from "../service.js";

// --- Test Data ---
const testModel: LanguageModelV1 = {
    name: "GPT-4",
    provider: "openai",
    contextLength: 8192,
    maxOutputTokens: 4096,
    temperature: 0.7,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stopSequences: [],
    functions: []
};

const validProviderConfig = {
    description: "Test provider config",
    name: "test-provider-config",
    providers: [
        {
            name: "openai",
            displayName: "OpenAI",
            type: "llm",
            apiKeyEnvVar: "OPENAI_API_KEY",
            baseUrl: "https://api.openai.com/v1",
            rateLimit: { requestsPerMinute: 60 }
        }
    ]
};

// --- Mock Base ProviderClient ---
const mockBaseClient: ProviderClientApi = {
    getCapabilities: () => new Set(["text-generation", "chat"]),
    getModels: () => Effect.succeed([testModel]),
    getProviderName: () => "openai",
    generateText: () => Effect.die("Mock base generateText called"),
    streamText: () => Effect.die("Mock base streamText called"),
    generateObject: () => Effect.die("Mock base generateObject called"),
    streamObject: () => Effect.die("Mock base streamObject called"),
    generateSpeech: () => Effect.die("Mock base generateSpeech called"),
    generateImage: () => Effect.die("Mock base generateImage called"),
    transcribe: () => Effect.die("Mock base transcribe called"),
    generateEmbeddings: () => Effect.die("Mock base generateEmbeddings called"),
    chat: () => Effect.die("Mock base chat called")
};

const mockBaseClientLayer = Layer.succeed(ProviderClient, mockBaseClient);

const providersJsonPath = path.resolve(__dirname, "providers.json");
const validConfig = fs.readFileSync(providersJsonPath, "utf-8");

const validConfigLayer = Layer.succeed(
    ConfigProvider.ConfigProvider,
    ConfigProvider.fromMap(new Map([["provider", validConfig]]))
);

const invalidJsonLayer = Layer.succeed(
    ConfigProvider.ConfigProvider,
    ConfigProvider.fromMap(new Map([["provider", "not a json"]]))
);

const invalidSchemaLayer = Layer.succeed(
    ConfigProvider.ConfigProvider,
    ConfigProvider.fromMap(new Map([["provider", JSON.stringify({ description: "Missing name and providers" })]]))
);

describe("ProviderService", () => {
    describe("load", () => {
        it("should load and validate provider config successfully", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ProviderService;
                const loaded = yield* service.load();
                expect(loaded.name).toBe("test-provider-config");
                expect(loaded.providers.length).toBeGreaterThan(0);
            });

            await Effect.runPromise(
                Effect.provide(effect, Layer.mergeAll(validConfigLayer, ProviderService.Default))
            );
        });

        it("should fail with ProviderConfigError if config is invalid JSON", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ProviderService;
                yield* service.load();
            });

            const exit = await Effect.runPromise(
                Effect.exit(
                    Effect.provide(effect, Layer.mergeAll(invalidJsonLayer, ProviderService.Default))
                )
            );

            expect(Exit.isFailure(exit)).toBe(true);
            if (Exit.isFailure(exit)) {
                const error = Cause.failureOption(exit.cause);
                expect(Option.isSome(error)).toBe(true);
                const value = Option.getOrThrow(error);
                expect(value).toBeInstanceOf(ProviderConfigError);
                expect((value as ProviderConfigError).message).toContain("Failed to parse provider config");
            }
        });

        it("should fail with ProviderConfigError if config fails schema validation", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ProviderService;
                yield* service.load();
            });

            const exit = await Effect.runPromise(
                Effect.exit(
                    Effect.provide(effect, Layer.mergeAll(invalidSchemaLayer, ProviderService.Default))
                )
            );

            expect(Exit.isFailure(exit)).toBe(true);
            if (Exit.isFailure(exit)) {
                const error = Cause.failureOption(exit.cause);
                expect(Option.isSome(error)).toBe(true);
                const value = Option.getOrThrow(error);
                expect(value).toBeInstanceOf(ProviderConfigError);
                expect((value as ProviderConfigError).message).toContain("Failed to validate provider config");
            }
        });
    });

    describe("getProviderClient", () => {
        it("should retrieve a provider client successfully", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ProviderService;
                yield* service.load();
                const client = yield* service.getProviderClient("openai");
                expect(client).toBeDefined();
            });

            await Effect.runPromise(
                Effect.provide(effect, Layer.mergeAll(validConfigLayer, ProviderService.Default, mockBaseClientLayer))
            );
        });

        it("should fail with ProviderConfigError if config not loaded", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ProviderService;
                yield* service.getProviderClient("openai");
            });

            const exit = await Effect.runPromise(
                Effect.exit(
                    Effect.provide(effect, Layer.mergeAll(validConfigLayer, ProviderService.Default))
                )
            );

            expect(Exit.isFailure(exit)).toBe(true);
            if (Exit.isFailure(exit)) {
                const error = Cause.failureOption(exit.cause);
                expect(Option.isSome(error)).toBe(true);
                const value = Option.getOrThrow(error);
                expect(value).toBeInstanceOf(ProviderConfigError);
                expect((value as ProviderConfigError).message).toContain("Provider config not loaded");
            }
        });

        it("should fail with ProviderNotFoundError for invalid provider", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ProviderService;
                yield* service.load();
                // @ts-expect-error - testing invalid provider name explicitly
                yield* service.getProviderClient("notarealprovider");
            });

            const exit = await Effect.runPromise(
                Effect.exit(
                    Effect.provide(effect, Layer.mergeAll(validConfigLayer, ProviderService.Default))
                )
            );

            expect(Exit.isFailure(exit)).toBe(true);
            if (Exit.isFailure(exit)) {
                const error = Cause.failureOption(exit.cause);
                expect(Option.isSome(error)).toBe(true);
                const value = Option.getOrThrow(error);
                expect(value).toBeInstanceOf(ProviderNotFoundError);
                expect((value as ProviderNotFoundError).providerName).toBe("notarealprovider");
            }
        });

        it("should fail with ProviderOperationError if provider layer not found", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ProviderService;
                yield* service.load();
                // @ts-expect-error - testing missing layer explicitly
                yield* service.getProviderClient("missinglayer");
            });

            const exit = await Effect.runPromise(
                Effect.exit(
                    Effect.provide(effect, Layer.mergeAll(validConfigLayer, ProviderService.Default))
                )
            );

            expect(Exit.isFailure(exit)).toBe(true);
            if (Exit.isFailure(exit)) {
                const error = Cause.failureOption(exit.cause);
                expect(Option.isSome(error)).toBe(true);
                const value = Option.getOrThrow(error);
                expect(value).toBeInstanceOf(ProviderOperationError);
                expect((value as ProviderOperationError).operation).toBe("getProviderClient");
                expect((value as ProviderOperationError).message).toContain("No ProviderClient layer found");
            }
        });
    });

    describe("provider capabilities", () => {
        it("should initialize provider with correct capabilities", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ProviderService;
                yield* service.load();
                const client = yield* service.getProviderClient("openai");
                const capabilities = client.getCapabilities();

                // OpenAI should have these basic capabilities
                expect(capabilities.has("text-generation")).toBe(true);
                expect(capabilities.has("chat")).toBe(true);
            });

            await Effect.runPromise(
                Effect.provide(effect, Layer.mergeAll(validConfigLayer, ProviderService.Default, mockBaseClientLayer))
            );
        });

        it("should respect provider-specific capabilities", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ProviderService;
                yield* service.load();

                // Test different providers with their expected capabilities
                const openaiClient = yield* service.getProviderClient("openai");
                const anthropicClient = yield* service.getProviderClient("anthropic");

                // OpenAI specific capabilities
                expect(openaiClient.getCapabilities().has("image-generation")).toBe(true);

                // Anthropic specific capabilities
                expect(anthropicClient.getCapabilities().has("tool-use")).toBe(true);
            });

            await Effect.runPromise(
                Effect.provide(effect, Layer.mergeAll(validConfigLayer, ProviderService.Default, mockBaseClientLayer))
            );
        });
    });

    describe("rate limiting", () => {
        it("should respect provider rate limits", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ProviderService;
                yield* service.load();
                const client = yield* service.getProviderClient("openai");

                // Make multiple rapid requests
                const requests = Array(5).fill(null).map(() =>
                    client.generateText({
                        model: testModel,
                        prompt: "test"
                    })
                );

                // All requests should complete without rate limit errors
                const results = yield* Effect.all(requests, { concurrency: 5 });
                expect(results).toHaveLength(5);
            });

            await Effect.runPromise(
                Effect.provide(effect, Layer.mergeAll(validConfigLayer, ProviderService.Default, mockBaseClientLayer))
            );
        });

        it("should handle rate limit errors gracefully", async () => {
            // Create a mock client that simulates rate limiting
            const rateLimitedClient: ProviderClientApi = {
                ...mockBaseClient,
                generateText: () => Effect.fail(new Error("Rate limit exceeded"))
            };

            const rateLimitedLayer = Layer.succeed(ProviderClient, rateLimitedClient);

            const effect = Effect.gen(function* () {
                const service = yield* ProviderService;
                yield* service.load();
                const client = yield* service.getProviderClient("openai");

                yield* client.generateText({
                    model: { id: "gpt-4", name: "GPT-4", provider: "openai" },
                    prompt: "test"
                });
            });

            const exit = await Effect.runPromise(
                Effect.exit(
                    Effect.provide(effect, Layer.mergeAll(validConfigLayer, ProviderService.Default, rateLimitedLayer))
                )
            );

            expect(Exit.isFailure(exit)).toBe(true);
            if (Exit.isFailure(exit)) {
                const error = Cause.failureOption(exit.cause);
                expect(Option.isSome(error)).toBe(true);
                expect(Option.getOrThrow(error).message).toContain("Rate limit exceeded");
            }
        });
    });

    describe("provider operations", () => {
        it("should handle text generation", async () => {
            const mockTextClient: ProviderClientApi = {
                ...mockBaseClient,
                generateText: () => Effect.succeed({
                    id: "test-1",
                    model: "gpt-4",
                    text: "Generated text",
                    timestamp: new Date(),
                    finishReason: "stop" as FinishReason,
                    usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
                })
            };

            const mockTextLayer = Layer.succeed(ProviderClient, mockTextClient);

            const effect = Effect.gen(function* () {
                const service = yield* ProviderService;
                yield* service.load();
                const client = yield* service.getProviderClient("openai");

                const result = yield* client.generateText({
                    model: testModel,
                    prompt: "test"
                });

                expect(result.text).toBe("Generated text");
                expect(result.usage.totalTokens).toBe(30);
            });

            await Effect.runPromise(
                Effect.provide(effect, Layer.mergeAll(validConfigLayer, ProviderService.Default, mockTextLayer))
            );
        });

        it("should handle streaming text generation", async () => {
            const mockStreamClient: ProviderClientApi = {
                ...mockBaseClient,
                streamText: () => Effect.succeed({
                    id: "test-1",
                    model: "gpt-4",
                    chunk: "Streamed ",
                    text: "Streamed text",
                    timestamp: new Date(),
                    finishReason: "stop" as FinishReason,
                    isLast: true,
                    currentTokenCount: 2,
                    usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
                    controller: {
                        pause: () => { },
                        resume: () => { },
                        cancel: () => { },
                        isPaused: false
                    }
                })
            };

            const mockStreamLayer = Layer.succeed(ProviderClient, mockStreamClient);

            const effect = Effect.gen(function* () {
                const service = yield* ProviderService;
                yield* service.load();
                const client = yield* service.getProviderClient("openai");

                const result = yield* client.streamText({
                    model: testModel,
                    prompt: "test"
                });

                expect(result.text).toBe("Streamed text");
                expect(result.isLast).toBe(true);
                expect(result.controller).toBeDefined();
            });

            await Effect.runPromise(
                Effect.provide(effect, Layer.mergeAll(validConfigLayer, ProviderService.Default, mockStreamLayer))
            );
        });

        it("should handle image generation", async () => {
            const mockImageClient: ProviderClientApi = {
                ...mockBaseClient,
                generateImage: () => Effect.succeed({
                    id: "test-1",
                    model: "dall-e-3",
                    imageUrl: "https://example.com/image.png",
                    timestamp: new Date(),
                    finishReason: "stop" as FinishReason,
                    usage: { promptTokens: 10, totalTokens: 10 },
                    parameters: {
                        size: "1024x1024",
                        quality: "standard",
                        style: "natural"
                    }
                })
            };

            const mockImageLayer = Layer.succeed(ProviderClient, mockImageClient);

            const effect = Effect.gen(function* () {
                const service = yield* ProviderService;
                yield* service.load();
                const client = yield* service.getProviderClient("openai");

                const result = yield* client.generateImage("A test image");

                expect(result.imageUrl).toBe("https://example.com/image.png");
                expect(result.parameters.size).toBe("1024x1024");
            });

            await Effect.runPromise(
                Effect.provide(effect, Layer.mergeAll(validConfigLayer, ProviderService.Default, mockImageLayer))
            );
        });
    });

    describe("error handling", () => {
        it("should handle missing API keys", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ProviderService;
                yield* service.load();
                const client = yield* service.getProviderClient("openai");

                // Attempt operation without API key
                yield* client.generateText({
                    model: { id: "gpt-4", name: "GPT-4", provider: "openai" },
                    prompt: "test"
                });
            });

            const exit = await Effect.runPromise(
                Effect.exit(
                    Effect.provide(effect, Layer.mergeAll(
                        Layer.succeed(
                            ConfigProvider.ConfigProvider,
                            ConfigProvider.fromMap(new Map([
                                ["provider", JSON.stringify({
                                    ...validProviderConfig,
                                    providers: [{
                                        ...validProviderConfig.providers[0],
                                        apiKeyEnvVar: undefined
                                    }]
                                })]
                            ]))
                        ),
                        ProviderService.Default,
                        mockBaseClientLayer
                    ))
                )
            );

            expect(Exit.isFailure(exit)).toBe(true);
            if (Exit.isFailure(exit)) {
                const error = Cause.failureOption(exit.cause);
                expect(Option.isSome(error)).toBe(true);
                const value = Option.getOrThrow(error);
                expect(value.message).toContain("API key not found");
            }
        });

        it("should handle missing capabilities", async () => {
            const effect = Effect.gen(function* () {
                const service = yield* ProviderService;
                yield* service.load();
                const client = yield* service.getProviderClient("openai");

                // Attempt operation that provider doesn't support
                yield* client.generateSpeech("test");
            });

            const exit = await Effect.runPromise(
                Effect.exit(
                    Effect.provide(effect, Layer.mergeAll(validConfigLayer, ProviderService.Default, mockBaseClientLayer))
                )
            );

            expect(Exit.isFailure(exit)).toBe(true);
            if (Exit.isFailure(exit)) {
                const error = Cause.failureOption(exit.cause);
                expect(Option.isSome(error)).toBe(true);
                const value = Option.getOrThrow(error);
                expect(value.message).toContain("Provider does not support");
            }
        });
    });

    describe("provider-specific implementations", () => {
        it("should handle OpenAI-specific features", async () => {
            const mockOpenAIClient: ProviderClientApi = {
                ...mockBaseClient,
                getCapabilities: () => new Set(["text-generation", "chat", "image-generation"]),
                generateText: () => Effect.succeed({
                    id: "test-1",
                    model: "gpt-4",
                    text: "OpenAI specific response",
                    timestamp: new Date(),
                    finishReason: "stop" as FinishReason,
                    usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
                })
            };

            const mockOpenAILayer = Layer.succeed(ProviderClient, mockOpenAIClient);

            const effect = Effect.gen(function* () {
                const service = yield* ProviderService;
                yield* service.load();
                const client = yield* service.getProviderClient("openai");

                // Test OpenAI-specific capabilities
                const capabilities = client.getCapabilities();
                expect(capabilities.has("image-generation")).toBe(true);

                // Test OpenAI-specific response format
                const result = yield* client.generateText({
                    model: testModel,
                    prompt: "test"
                });

                expect(result.text).toBe("OpenAI specific response");
                expect(result.usage).toBeDefined();
            });

            await Effect.runPromise(
                Effect.provide(effect, Layer.mergeAll(validConfigLayer, ProviderService.Default, mockOpenAILayer))
            );
        });

        it("should handle Anthropic-specific features", async () => {
            const mockAnthropicClient: ProviderClientApi = {
                ...mockBaseClient,
                getCapabilities: () => new Set(["text-generation", "chat", "tool-use"]),
                getProviderName: () => "anthropic",
                generateText: () => Effect.succeed({
                    id: "test-1",
                    model: "claude-3",
                    text: "Anthropic specific response",
                    timestamp: new Date(),
                    finishReason: "stop" as FinishReason,
                    usage: { promptTokens: 15, completionTokens: 25, totalTokens: 40 }
                })
            };

            const mockAnthropicLayer = Layer.succeed(ProviderClient, mockAnthropicClient);

            const effect = Effect.gen(function* () {
                const service = yield* ProviderService;
                yield* service.load();
                const client = yield* service.getProviderClient("anthropic");

                // Test Anthropic-specific capabilities
                const capabilities = client.getCapabilities();
                expect(capabilities.has("tool-use")).toBe(true);

                // Test Anthropic-specific response format
                const result = yield* client.generateText({
                    model: { ...testModel, provider: "anthropic" },
                    prompt: "test"
                });

                expect(result.text).toBe("Anthropic specific response");
            });

            await Effect.runPromise(
                Effect.provide(effect, Layer.mergeAll(validConfigLayer, ProviderService.Default, mockAnthropicLayer))
            );
        });
    });

    describe("configuration validation", () => {
        it("should validate provider rate limits", async () => {
            const invalidRateLimitConfig = {
                ...validProviderConfig,
                providers: [{
                    ...validProviderConfig.providers[0],
                    rateLimit: { requestsPerMinute: -1 }
                }]
            };

            const invalidConfigLayer = Layer.succeed(
                ConfigProvider.ConfigProvider,
                ConfigProvider.fromMap(new Map([["provider", JSON.stringify(invalidRateLimitConfig)]]))
            );

            const effect = Effect.gen(function* () {
                const service = yield* ProviderService;
                yield* service.load();
            });

            const exit = await Effect.runPromise(
                Effect.exit(
                    Effect.provide(effect, Layer.mergeAll(invalidConfigLayer, ProviderService.Default))
                )
            );

            expect(Exit.isFailure(exit)).toBe(true);
            if (Exit.isFailure(exit)) {
                const error = Cause.failureOption(exit.cause);
                expect(Option.isSome(error)).toBe(true);
                const value = Option.getOrThrow(error);
                expect(value).toBeInstanceOf(ProviderConfigError);
                expect((value as ProviderConfigError).message).toContain("Invalid rate limit");
            }
        });

        it("should validate required provider fields", async () => {
            const invalidProviderConfig = {
                ...validProviderConfig,
                providers: [{
                    name: "openai",
                    // Missing required fields
                    type: "llm"
                }]
            };

            const invalidConfigLayer = Layer.succeed(
                ConfigProvider.ConfigProvider,
                ConfigProvider.fromMap(new Map([["provider", JSON.stringify(invalidProviderConfig)]]))
            );

            const effect = Effect.gen(function* () {
                const service = yield* ProviderService;
                yield* service.load();
            });

            const exit = await Effect.runPromise(
                Effect.exit(
                    Effect.provide(effect, Layer.mergeAll(invalidConfigLayer, ProviderService.Default))
                )
            );

            expect(Exit.isFailure(exit)).toBe(true);
            if (Exit.isFailure(exit)) {
                const error = Cause.failureOption(exit.cause);
                expect(Option.isSome(error)).toBe(true);
                const value = Option.getOrThrow(error);
                expect(value).toBeInstanceOf(ProviderConfigError);
                expect((value as ProviderConfigError).message).toContain("Missing required fields");
            }
        });
    });

    describe("provider switching and cleanup", () => {
        it("should handle provider switching gracefully", async () => {
            const mockOpenAIClient: ProviderClientApi = {
                ...mockBaseClient,
                getProviderName: () => "openai",
                generateText: () => Effect.succeed({
                    id: "test-1",
                    model: "gpt-4",
                    text: "OpenAI response",
                    timestamp: new Date(),
                    finishReason: "stop" as FinishReason
                })
            };

            const mockAnthropicClient: ProviderClientApi = {
                ...mockBaseClient,
                getProviderName: () => "anthropic",
                generateText: () => Effect.succeed({
                    id: "test-2",
                    model: "claude-3",
                    text: "Anthropic response",
                    timestamp: new Date(),
                    finishReason: "stop" as FinishReason
                })
            };

            let currentClient = mockOpenAIClient;
            const switchableClientLayer = Layer.succeed(
                ProviderClient,
                currentClient
            );

            const effect = Effect.gen(function* () {
                const service = yield* ProviderService;
                yield* service.load();

                // Initial provider
                const openaiClient = yield* service.getProviderClient("openai");
                const openaiResult = yield* openaiClient.generateText({
                    model: testModel,
                    prompt: "test"
                });
                expect(openaiResult.text).toBe("OpenAI response");

                // Switch provider
                currentClient = mockAnthropicClient;
                yield* service.reload();

                const anthropicClient = yield* service.getProviderClient("anthropic");
                const anthropicResult = yield* anthropicClient.generateText({
                    model: { ...testModel, provider: "anthropic" },
                    prompt: "test"
                });
                expect(anthropicResult.text).toBe("Anthropic response");
            });

            await Effect.runPromise(
                Effect.provide(effect, Layer.mergeAll(validConfigLayer, ProviderService.Default, switchableClientLayer))
            );
        });

        it("should clean up resources on shutdown", async () => {
            const mockCleanupClient: ProviderClientApi = {
                ...mockBaseClient,
                cleanup: () => Effect.succeed(void 0)
            };

            const cleanupSpy = vi.spyOn(mockCleanupClient, "cleanup");
            const cleanupLayer = Layer.succeed(ProviderClient, mockCleanupClient);

            const effect = Effect.gen(function* () {
                const service = yield* ProviderService;
                yield* service.load();
                yield* service.shutdown();
            });

            await Effect.runPromise(
                Effect.provide(effect, Layer.mergeAll(validConfigLayer, ProviderService.Default, cleanupLayer))
            );

            expect(cleanupSpy).toHaveBeenCalled();
        });

        it("should handle cleanup errors gracefully", async () => {
            const mockErrorClient: ProviderClientApi = {
                ...mockBaseClient,
                cleanup: () => Effect.fail(new Error("Cleanup failed"))
            };

            const errorLayer = Layer.succeed(ProviderClient, mockErrorClient);

            const effect = Effect.gen(function* () {
                const service = yield* ProviderService;
                yield* service.load();
                yield* service.shutdown();
            });

            const exit = await Effect.runPromise(
                Effect.exit(
                    Effect.provide(effect, Layer.mergeAll(validConfigLayer, ProviderService.Default, errorLayer))
                )
            );

            expect(Exit.isFailure(exit)).toBe(true);
            if (Exit.isFailure(exit)) {
                const error = Cause.failureOption(exit.cause);
                expect(Option.isSome(error)).toBe(true);
                const value = Option.getOrThrow(error);
                expect(value.message).toContain("Cleanup failed");
            }
        });
    });
});
