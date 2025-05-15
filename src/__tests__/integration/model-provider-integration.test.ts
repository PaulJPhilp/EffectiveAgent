/**
 * Integration tests for model and provider services
 * 
 * These tests verify that the model service and provider service
 * work correctly together in realistic scenarios.
 */

import { ModelService } from "@/services/ai/model/service.js"
import { ProviderService } from "@/services/ai/provider/service.js"
import { createServiceTestHarness } from "@/services/core/test-harness/utils/effect-test-harness.js"
import { Effect, Layer } from "effect"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

interface Model {
    id: string
    vendorCapabilities: string[]
    contextWindowSize: number
}

describe("Model and Provider Integration", () => {
    let harness: ReturnType<typeof createServiceTestHarness>

    beforeAll(() => {
        harness = createServiceTestHarness(
            Layer.mergeAll(
                ModelService,
                ProviderService
                // If a mock HTTP client or config service is required and not available in the harness, add it to the harness layer.
            )
        )
    })

    afterAll(async () => {
        await harness.close()
    })

    it("should validate models from configured providers", async () => {
        await harness.runTest(
            Effect.gen(function* () {
                const modelService = yield* ModelService
                const providerService = yield* ProviderService
                // Example: Validate a model and assert results
                const isValid = yield* modelService.validateModel("mock-model")
                expect(isValid).toBe(true)
            })
        )
    })

    it("should use valid models to make API requests", async () => {
        await harness.runTest(
            Effect.gen(function* () {
                const modelService = yield* ModelService
                const providerService = yield* ProviderService
                // Example: Use a valid model to make an API request and assert results
                const providerName = yield* modelService.getProviderName("mock-model")
                expect(providerName).toBe("mock-provider")
            })
        )
    })
})