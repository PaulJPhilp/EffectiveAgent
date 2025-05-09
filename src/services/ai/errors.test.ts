import { EffectiveError } from "@/errors.js"
import { Cause, Effect, Exit, Option } from "effect"
import { describe, expect, it } from "vitest"
import {
    AuthenticationError,
    ChatCompletionError,
    ProviderAPIError,
    RateLimitError,
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
            expect(error).toBeInstanceOf(EffectiveError)
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
            expect(error).toBeInstanceOf(EffectiveError)
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
        expect(mappedError).toBeInstanceOf(RateLimitError)
        expect(mappedError.description).toBe("Rate limit exceeded")
        expect(mappedError.cause).toBe(originalError)
    })

    it("should map authentication error", () => {
        const originalError = new Error("authentication failed")
        const mappedError = mapProviderError(originalError)
        expect(mappedError).toBeInstanceOf(AuthenticationError)
        expect(mappedError.description).toBe("Authentication failed")
        expect(mappedError.cause).toBe(originalError)
    })

    it("should map unknown error to ProviderAPIError", () => {
        const originalError = new Error("unknown error")
        const mappedError = mapProviderError(originalError)
        expect(mappedError).toBeInstanceOf(ProviderAPIError)
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
            expect(effectiveError).toBeInstanceOf(EffectiveError)
            expect(effectiveError.description).toBe("Provider API error")
        } else {
            throw new Error("Effect should have failed")
        }
    })

    it("should handle non-Error failures", async () => {
        const effect = Effect.fail("string error")
        const mappedEffect = withErrorMapping(effect)
        const result = await Effect.runPromiseExit(mappedEffect)
        if (Exit.isFailure(result)) {
            const error = Cause.failureOption(result.cause)
            const effectiveError = Option.getOrThrow(error) as EffectiveError
            expect(effectiveError).toBeInstanceOf(EffectiveError)
            expect(effectiveError.description).toBe("Unknown error")
            expect(effectiveError.module).toBe("Unknown")
            expect(effectiveError.method).toBe("unknown")
        } else {
            throw new Error("Effect should have failed")
        }
    })
}) 