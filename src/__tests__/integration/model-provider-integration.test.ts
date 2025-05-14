/**
 * Integration tests for model and provider services
 * 
 * These tests verify that the model service and provider service
 * work correctly together in realistic scenarios.
 */

import { ModelService } from "@/services/ai/model/service.js"
import { ProviderService } from "@/services/ai/provider/service.js"
import { ConfigurationService } from "@/services/core/configuration/service.js"

import { Effect, Layer } from "effect"
import { UnknownException } from "effect/Cause"
import { describe, expect, it, vi } from "vitest"

interface Model {
    id: string
    vendorCapabilities: string[]
    contextWindowSize: number
}

// Integration test suite for model and provider interaction
describe("Model and Provider Integration", () => {
    // Create mock HttpClient service for testing
    const mockHttpClient = {
        fetch: vi.fn().mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                id: "gpt-4-response",
                choices: [{
                    message: { content: "Test response" }
                }]
            })
        })
    }

    // Create provider config
    const providerConfig = {
        providers: [{
            id: "openai",
            name: "OpenAI",
            baseUrl: "https://api.openai.com/v1",
            defaultModel: "gpt-4o",
            apiKey: "test-key",
            models: [{
                id: "gpt-4o",
                vendorCapabilities: ["text-generation", "chat", "vision"],
                contextWindowSize: 128000,
                costPer1kInputTokens: 0.01,
                costPer1kOutputTokens: 0.03
            }]
        }]
    }

    /**
     * Integration test to verify that the model service can validate models
     * that are configured in the provider service
     */
    it("should validate models from configured providers", async () => {
        // Create mock ConfigService with our test provider config
        const mockConfigService = {
            readConfig: vi.fn().mockResolvedValue(providerConfig),
            readFile: vi.fn(),
            parseJson: vi.fn(),
            validateWithSchema: vi.fn(),
            loadConfig: vi.fn()
        }

        // Create layers with mock dependencies
        const mockConfigLayer = Layer.succeed(ConfigurationService, mockConfigService)

        // Define minimal mocks for ModelService and ProviderService
        const mockModelService = {
            validateModel: vi.fn().mockResolvedValue(true),
            findModelsByCapabilities: vi.fn().mockResolvedValue([
                {
                    id: "gpt-4o",
                    vendorCapabilities: ["text-generation", "chat", "vision"],
                    contextWindowSize: 128000
                }
            ]),
            exists: vi.fn(),
            load: vi.fn(),
            getProviderName: vi.fn(),
            findModelsByCapability: vi.fn(),
            getDefaultModelId: vi.fn(),
            getModelsForProvider: vi.fn()
        }
        const mockProviderService = {
            load: vi.fn(),
            getProviderClient: vi.fn()
        }

        // Compose application layers with real implementations and mocked config
        const testLayer = Layer.mergeAll(
            ModelService.Default,
            ProviderService.Default,
            mockConfigLayer
        )

        // Test that the model service can validate models from the provider
        const testEffect = Effect.gen(function* () {
            const modelService = yield* ModelService
            const validationResult = yield* modelService.validateModel("gpt-4o")
            expect(validationResult).toBe(true)

            // Test model capabilities match what's in the provider config
            const models = yield* modelService.findModelsByCapabilities(["text-generation", "chat"])
            const gpt4o = (models as Model[]).find(m => m.id === "gpt-4o")

            expect(gpt4o).toBeDefined()
            expect(gpt4o?.vendorCapabilities).toContain("text-generation")
            expect(gpt4o?.vendorCapabilities).toContain("chat")
            expect(gpt4o?.contextWindowSize).toBe(128000)
        })

        await Effect.runPromise(
            Effect.provide(testEffect, testLayer) as Effect.Effect<void, never, never>
        )
    })

    /**
     * Integration test that verifies the provider service can correctly use models
     * validated by the model service
     */
    it("should use valid models to make API requests", async () => {
        // Create mock ConfigService with our test provider config
        const mockConfigService = {
            readConfig: vi.fn().mockResolvedValue(providerConfig),
            readFile: vi.fn(),
            parseJson: vi.fn(),
            validateWithSchema: vi.fn(),
            loadConfig: vi.fn()
        }

        const mockConfigLayer = Layer.succeed(ConfigurationService, mockConfigService)

        // Compose application layers with real implementations and mocked config
        const testLayer = Layer.mergeAll(
            ModelService.Default,
            ProviderService.Default,
            mockConfigLayer
        )

        // Test the complete flow from model validation to API request
        const testEffect = Effect.gen(function* () {
            const modelService = yield* ModelService
            const providerService = yield* ProviderService

            // First validate the model
            const validationResult = yield* modelService.validateModel("gpt-4o")
            expect(validationResult).toBe(true)

            // Then use the provider service to call the API
            // Note: this is a simplified example, actual implementation may differ
            // You may need to type assert the response if it's unknown
            const response = yield* Effect.tryPromise(() =>
                (providerService as any).callModelApi({
                    provider: "openai",
                    model: "gpt-4o",
                    messages: [{ role: "user", content: "Hello" }]
                })
            )

            expect(response).toBeDefined()
            expect((response as any).id).toBe("gpt-4-response")
            expect((response as any).choices[0].message.content).toBe("Test response")

            // Verify the HTTP client was called correctly
            expect(mockHttpClient.fetch).toHaveBeenCalled()
            const fetchArgs = mockHttpClient.fetch.mock.calls[0] ?? []
            expect(fetchArgs[0]).toContain("openai")
            expect(fetchArgs[1]?.headers?.Authorization).toBe("Bearer test-key")
        })

        await Effect.runPromise(
            Effect.provide(testEffect, testLayer) as Effect.Effect<void, UnknownException, never>
        )
    })
})