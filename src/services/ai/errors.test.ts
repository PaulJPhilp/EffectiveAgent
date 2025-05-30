/**
 * @file AI Service Error Tests
 * @module services/ai/errors/tests
 */

import { EffectiveError } from "@/effective-error.js"
import { Cause, Effect, Exit, Option } from "effect"
import { describe, expect, it } from "vitest"
import {
    AuthenticationError,
    ChatCompletionError,
    mapProviderError,
    withErrorMapping
} from "./errors.js"

describe("Error Classes", () => {
    describe("ChatCompletionError", () => {
        it("should create error with correct properties", () => {
            const error = new ChatCompletionError({
                description: "Chat completion failed",
                module: "TestModule",
                method: "testMethod",
            })
            expect(error.name).toBe("ChatCompletionError")
            expect(error.description).toBe("Chat completion failed")
            expect(error.module).toBe("TestModule")
            expect(error.method).toBe("testMethod")
        })
    })

    describe("AuthenticationError", () => {
        it("should create error with correct properties", () => {
            const error = new AuthenticationError({
                description: "Authentication failed",
                module: "TestModule",
                method: "testMethod",
            })
            expect(error.name).toBe("AuthenticationError")
            expect(error.description).toBe("Authentication failed")
            expect(error.module).toBe("TestModule")
            expect(error.method).toBe("testMethod")
        })
    })
})

describe("Error Mapping", () => {
    it("should map rate limit error", () => {
        const originalError = new Error("rate limit exceeded")
        const mappedError = mapProviderError(originalError)
        expect(mappedError.name).toBe("RateLimitError")
        expect(mappedError.description).toBe("Rate limit exceeded")
        expect(mappedError.cause).toBe(originalError)
    })

    it("should map authentication error", () => {
        const originalError = new Error("authentication failed")
        const mappedError = mapProviderError(originalError)
        expect(mappedError.name).toBe("AuthenticationError")
        expect(mappedError.description).toBe("Authentication failed")
        expect(mappedError.cause).toBe(originalError)
    })

    it("should map unknown error to ProviderAPIError", () => {
        const originalError = new Error("unknown error")
        const mappedError = mapProviderError(originalError)
        expect(mappedError.name).toBe("ProviderAPIError")
        expect(mappedError.description).toBe("Provider API error")
        expect(mappedError.cause).toBe(originalError)
    })
})

describe("withErrorMapping", () => {
    it("should map Effect errors to EffectiveError", async () => {
        const effect = Effect.fail(new Error("test error"))
        const mappedEffect = withErrorMapping(effect)
        const result = await Effect.runPromiseExit(mappedEffect)
        if (Exit.isFailure(result)) {
            const error = Cause.failureOption(result.cause)
            const effectiveError = Option.getOrThrow(error)
            expect(effectiveError.name).toBe("ProviderAPIError")
            expect(effectiveError.description).toBe("Provider API error")
        } else {
            throw new Error("Expected failure but got success")
        }
    })

    it("should handle non-Error failures", async () => {
        const effect = Effect.fail("string error")
        const mappedEffect = withErrorMapping(effect)
        const result = await Effect.runPromiseExit(mappedEffect)
        if (Exit.isFailure(result)) {
            const error = Cause.failureOption(result.cause)
            const effectiveError = Option.getOrThrow(error) as EffectiveError
            expect(effectiveError.name).toBe("EffectiveError")
            expect(effectiveError.description).toBe("Unknown error")
            expect(effectiveError.cause).toBe("string error")
        } else {
            throw new Error("Expected failure but got success")
        }
    })
}) 