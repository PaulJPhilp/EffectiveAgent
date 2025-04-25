import { ConfigProvider, Effect, Exit, Layer } from "effect"
import { describe, expect, it } from "vitest"
import { ProviderConfigError, ProviderMissingApiKeyError, ProviderNotFoundError } from "./errors.js"
import type { ProvidersType } from "./schema.js"
import { ProviderService } from "./service.js"

// Test configuration with multiple providers
const testConfig = {
    description: "Test provider configuration",
    name: "test-provider-config",
    providers: [
        {
            name: "openai" as ProvidersType,
            displayName: "OpenAI",
            type: "llm",
            apiKeyEnvVar: "OPENAI_API_KEY",
            baseUrl: "https://api.openai.com/v1",
            rateLimit: { requestsPerMinute: 60 }
        },
        {
            name: "anthropic" as ProvidersType,
            displayName: "Anthropic",
            type: "llm",
            apiKeyEnvVar: "ANTHROPIC_API_KEY",
            rateLimit: { requestsPerMinute: 50 }
        }
    ]
}

describe("ProviderService", () => {
    // Layer with valid test configuration
    const testConfigLayer = Layer.succeed(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromMap(new Map([
            ["provider", JSON.stringify(testConfig)]
        ]))
    )

    // Layer with invalid JSON
    const invalidJsonLayer = Layer.succeed(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromMap(new Map([
            ["provider", "{ invalid json"]
        ]))
    )

    // Layer with invalid schema
    const invalidSchemaLayer = Layer.succeed(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromMap(new Map([
            ["provider", JSON.stringify({ description: "Invalid schema" })]
        ]))
    )

    describe("Configuration Loading", () => {
        it("should load valid provider configuration", async () => {
            const program = Effect.gen(function* () {
                const service = yield* ProviderService
                const config = yield* service.load()

                expect(config.name).toBe("test-provider-config")
                expect(config.providers).toHaveLength(2)
                expect(config.providers[0].name).toBe("openai")
                expect(config.providers[1].name).toBe("anthropic")
            })

            await Effect.runPromise(
                program.pipe(Effect.provide(Layer.mergeAll(testConfigLayer, ProviderService.Default)))
            )
        })

        it("should fail with ProviderConfigError on invalid JSON", async () => {
            const program = Effect.gen(function* () {
                const service = yield* ProviderService
                yield* service.load()
            })

            const result = await Effect.runPromiseExit(
                program.pipe(Effect.provide(Layer.mergeAll(invalidJsonLayer, ProviderService.Default)))
            )

            expect(Exit.isFailure(result)).toBe(true)
            if (Exit.isFailure(result)) {
                const error = Effect.failureError(result)
                expect(error).toBeInstanceOf(ProviderConfigError)
                expect(error.message).toContain("Failed to parse provider config")
            }
        })

        it("should fail with ProviderConfigError on invalid schema", async () => {
            const program = Effect.gen(function* () {
                const service = yield* ProviderService
                yield* service.load()
            })

            const result = await Effect.runPromiseExit(
                program.pipe(Effect.provide(Layer.mergeAll(invalidSchemaLayer, ProviderService.Default)))
            )

            expect(Exit.isFailure(result)).toBe(true)
            if (Exit.isFailure(result)) {
                const error = Effect.failureError(result)
                expect(error).toBeInstanceOf(ProviderConfigError)
                expect(error.message).toContain("Failed to validate provider config")
            }
        })
    })

    describe("Provider Client Management", () => {
        it("should get OpenAI provider client successfully", async () => {
            const program = Effect.gen(function* () {
                const service = yield* ProviderService
                yield* service.load()
                const client = yield* service.getProviderClient("openai")
                expect(client).toBeDefined()
                expect(typeof client.getProviderName).toBe("function")
                expect(typeof client.generateText).toBe("function")
            })

            await Effect.runPromise(
                program.pipe(Effect.provide(Layer.mergeAll(testConfigLayer, ProviderService.Default)))
            )
        })

        it("should fail with ProviderNotFoundError for non-existent provider", async () => {
            const program = Effect.gen(function* () {
                const service = yield* ProviderService
                yield* service.load()
                // @ts-expect-error Testing invalid provider
                yield* service.getProviderClient("nonexistent")
            })

            const result = await Effect.runPromiseExit(
                program.pipe(Effect.provide(Layer.mergeAll(testConfigLayer, ProviderService.Default)))
            )

            expect(Exit.isFailure(result)).toBe(true)
            if (Exit.isFailure(result)) {
                const error = Effect.failureError(result)
                expect(error).toBeInstanceOf(ProviderNotFoundError)
                expect(error.message).toContain("nonexistent")
            }
        })

        it("should fail with ProviderConfigError if config not loaded", async () => {
            const program = Effect.gen(function* () {
                const service = yield* ProviderService
                yield* service.getProviderClient("openai")
            })

            const result = await Effect.runPromiseExit(
                program.pipe(Effect.provide(Layer.mergeAll(testConfigLayer, ProviderService.Default)))
            )

            expect(Exit.isFailure(result)).toBe(true)
            if (Exit.isFailure(result)) {
                const error = Effect.failureError(result)
                expect(error).toBeInstanceOf(ProviderConfigError)
                expect(error.message).toContain("Provider config not loaded")
            }
        })
    })

    describe("Real Provider Integration", () => {
        // Only run these tests if API keys are available
        const hasOpenAIKey = process.env.OPENAI_API_KEY
        const hasAnthropicKey = process.env.ANTHROPIC_API_KEY

        if (hasOpenAIKey) {
            it("should initialize OpenAI provider with real credentials", async () => {
                const program = Effect.gen(function* () {
                    const service = yield* ProviderService
                    yield* service.load()
                    const client = yield* service.getProviderClient("openai")

                    // Test basic capabilities
                    const providerName = client.getProviderName()
                    expect(providerName).toBe("openai")

                    // Test model capabilities
                    const models = yield* client.getModels()
                    expect(models.length).toBeGreaterThan(0)
                })

                await Effect.runPromise(
                    program.pipe(Effect.provide(Layer.mergeAll(testConfigLayer, ProviderService.Default)))
                )
            })
        }

        if (hasAnthropicKey) {
            it("should initialize Anthropic provider with real credentials", async () => {
                const program = Effect.gen(function* () {
                    const service = yield* ProviderService
                    yield* service.load()
                    const client = yield* service.getProviderClient("anthropic")

                    // Test basic capabilities
                    const providerName = client.getProviderName()
                    expect(providerName).toBe("anthropic")

                    // Test model capabilities
                    const models = yield* client.getModels()
                    expect(models.length).toBeGreaterThan(0)
                })

                await Effect.runPromise(
                    program.pipe(Effect.provide(Layer.mergeAll(testConfigLayer, ProviderService.Default)))
                )
            })
        }

        it("should fail gracefully with missing API key", async () => {
            // Temporarily unset API key
            const originalKey = process.env.OPENAI_API_KEY
            process.env.OPENAI_API_KEY = undefined

            const program = Effect.gen(function* () {
                const service = yield* ProviderService
                yield* service.load()
                yield* service.getProviderClient("openai")
            })

            const result = await Effect.runPromiseExit(
                program.pipe(Effect.provide(Layer.mergeAll(testConfigLayer, ProviderService.Default)))
            )

            // Restore API key
            if (originalKey) {
                process.env.OPENAI_API_KEY = originalKey
            }

            expect(Exit.isFailure(result)).toBe(true)
            if (Exit.isFailure(result)) {
                const error = Effect.failureError(result)
                expect(error).toBeInstanceOf(ProviderMissingApiKeyError)
            }
        })
    })
}) 