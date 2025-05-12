/**
 * Integration tests for model and provider services
 * 
 * These tests verify that the model service and provider service
 * work correctly together in realistic scenarios.
 */

import { createMockService } from "@/__tests__/mocks/service-mocks.js"
import { ModelCapability } from "@/schema.js"
import { ModelService } from "@/services/ai/model/service.js"
import { ProviderService } from "@/services/ai/provider/service.js"
import { runWithTimeout } from "@/services/core/test-harness/utils/effect-test-harness.js"
import { Effect, Layer } from "effect"
import { describe, expect, it } from "vitest"

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
            readConfig: vi.fn().mockResolvedValue(providerConfig)
        }

        // Create layers with mock dependencies
        const mockConfigLayer = Layer.succeed("ConfigService", mockConfigService)

        // Compose application layers with mocked dependencies
        const testLayer = Layer.provide(
            Layer.merge(ModelService.Default, ProviderService.Default),
            mockConfigLayer
        )

        // Test that the model service can validate models from the provider
        const testEffect = Effect.gen(function* () {
            const modelService = yield* ModelService
            const validationResult = yield* modelService.validateModel("gpt-4o", ModelCapability)
            expect(validationResult).toBe(true)

            // Test model capabilities match what's in the provider config
            const models = yield* modelService.findModelsByCapabilities(ModelCapability)
            const gpt4o = models.find(m => m.id === "gpt-4o")

            expect(gpt4o).toBeDefined()
            expect(gpt4o?.vendorCapabilities).toContain("text-generation")
            expect(gpt4o?.vendorCapabilities).toContain("chat")
            expect(gpt4o?.contextWindowSize).toBe(128000)
        })

        await runWithTimeout(Effect.provide(testEffect, testLayer))
    })

    /**
     * Integration test that verifies the provider service can correctly use models
     * validated by the model service
     */
    it("should use valid models to make API requests", async () => {
        // Create mock HttpClient with our test implementation
        const { layer: mockHttpLayer } = createMockService("HttpClient", mockHttpClient)

        // Create mock ConfigService with our test provider config
        const mockConfigService = {
            readConfig: vi.fn().mockResolvedValue(providerConfig)
        }

        const mockConfigLayer = Layer.succeed("ConfigService", mockConfigService)

        // Compose application layers with mocked dependencies
        const testLayer = Layer.provide(
            Layer.merge(ModelService.Default, ProviderService.Default),
            Layer.merge(mockHttpLayer, mockConfigLayer)
        )

        // Test the complete flow from model validation to API request
        const testEffect = Effect.gen(function* () {
            const modelService = yield* ModelService
            const providerService = yield* ProviderService

            // First validate the model
            const validationResult = yield* modelService.validateModel("gpt-4o", ModelCapability)
            expect(validationResult).toBe(true)

            // Then use the provider service to call the API
            // Note: this is a simplified example, actual implementation may differ
            const response = yield* Effect.tryPromise(() =>
                providerService.callModelApi({
                    provider: "openai",
                    model: "gpt-4o",
                    messages: [{ role: "user", content: "Hello" }]
                })
            )

            expect(response).toBeDefined()
            expect(response.id).toBe("gpt-4-response")
            expect(response.choices[0].message.content).toBe("Test response")

            // Verify the HTTP client was called correctly
            expect(mockHttpClient.fetch).toHaveBeenCalled()
            const fetchArgs = mockHttpClient.fetch.mock.calls[0]
            expect(fetchArgs[0]).toContain("openai")
            expect(fetchArgs[1].headers.Authorization).toBe("Bearer test-key")
        })

        await runWithTimeout(Effect.provide(testEffect, testLayer))
    })
})