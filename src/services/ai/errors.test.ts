import { Cause, Effect, Exit, Option } from "effect"
import { describe, expect, it } from "vitest"
import {
    AIError,
    AuthenticationError,
    ContentFilterError,
    ContextLengthError,
    ProviderAPIError,
    RateLimitError,
    TimeoutError,
    mapProviderError,
    withErrorMapping
} from "./errors.js"

describe("AI Error Types", () => {
    describe("Base AIError", () => {
        it("should create error with default values", () => {
            const error = new AIError("test error")
            expect(error.name).toBe("AIError")
            expect(error.code).toBe("ai_error")
            expect(error.module).toBe("ai")
            expect(error.method).toBe("unknown")
            expect(error.message).toBe("test error")
        })

        it("should create error with custom values", () => {
            const error = new AIError("test error", {
                code: "custom_code",
                name: "CustomError",
                module: "custom_module",
                method: "custom_method"
            })
            expect(error.name).toBe("CustomError")
            expect(error.code).toBe("custom_code")
            expect(error.module).toBe("custom_module")
            expect(error.method).toBe("custom_method")
        })
    })

    describe("Specific Error Types", () => {
        it("should create AuthenticationError with correct code", () => {
            const error = new AuthenticationError("auth failed")
            expect(error.code).toBe("authentication_error")
            expect(error.name).toBe("AuthenticationError")
        })

        it("should create RateLimitError with correct code", () => {
            const error = new RateLimitError("rate limit exceeded")
            expect(error.code).toBe("rate_limit_error")
            expect(error.name).toBe("RateLimitError")
        })

        it("should create ContextLengthError with correct code", () => {
            const error = new ContextLengthError("context too long")
            expect(error.code).toBe("context_length_exceeded")
            expect(error.name).toBe("ContextLengthError")
        })

        it("should create ProviderAPIError with status and response", () => {
            const error = new ProviderAPIError("api error", {
                status: 429,
                response: { error: "rate limited" }
            })
            expect(error.code).toBe("provider_api_error")
            expect(error.status).toBe(429)
            expect(error.response).toEqual({ error: "rate limited" })
        })
    })

    describe("Error Mapping", () => {
        it("should map authentication error", () => {
            const error = new Error("authentication failed")
            error.name = "AuthenticationError"
            const mapped = mapProviderError(error)
            expect(mapped).toBeInstanceOf(AuthenticationError)
        })

        it("should map rate limit error", () => {
            const error = new Error("rate limit exceeded")
            const mapped = mapProviderError(error)
            expect(mapped).toBeInstanceOf(RateLimitError)
        })

        it("should map context length error", () => {
            const error = new Error("context length exceeded maximum")
            const mapped = mapProviderError(error)
            expect(mapped).toBeInstanceOf(ContextLengthError)
        })

        it("should map content filter error", () => {
            const error = new Error("content filter triggered")
            const mapped = mapProviderError(error)
            expect(mapped).toBeInstanceOf(ContentFilterError)
        })

        it("should map timeout error", () => {
            const error = new Error("request timed out")
            const mapped = mapProviderError(error)
            expect(mapped).toBeInstanceOf(TimeoutError)
        })

        it("should default to ProviderAPIError", () => {
            const error = new Error("unknown error")
            const mapped = mapProviderError(error)
            expect(mapped).toBeInstanceOf(ProviderAPIError)
        })
    })

    describe("Error Middleware", () => {
        it("should map errors in Effect chain", async () => {
            const failingEffect = Effect.fail(new Error("authentication failed"))
            const program = failingEffect.pipe(withErrorMapping)

            const result = await Effect.runPromiseExit(program)
            expect(Effect.isFailure(result)).toBe(true)
            Exit.match(result, {
                onFailure: (cause) => {
                    const error = Cause.failureOption(cause);
                    expect(Option.isSome(error)).toBe(true);
                    const value = Option.getOrThrow(error) as AIError;
                    expect(value).toBeInstanceOf(AuthenticationError);
                },
                onSuccess: () => {
                    expect.fail("Expected failure");
                }
            });
        })

        it("should pass through success values", async () => {
            const successEffect = Effect.succeed("success")
            const program = successEffect.pipe(withErrorMapping)

            const result = await Effect.runPromiseExit(program)
            expect(Effect.isSuccess(result)).toBe(true)
            if (Effect.isSuccess(result)) {
                expect(Effect.succeed(result)).toBe("success")
            }
        })

        it("should handle non-Error failures", async () => {
            const failingEffect = Effect.fail("string error")
            const program = failingEffect.pipe(withErrorMapping)

            const result = await Effect.runPromiseExit(program)
            expect(Effect.isFailure(result)).toBe(true)
            Exit.match(result, {
                onFailure: (cause) => {
                    const error = Cause.failureOption(cause);
                    expect(Option.isSome(error)).toBe(true);
                    const value = Option.getOrThrow(error) as AIError;
                    expect(value).toBeInstanceOf(AIError);
                    expect(value.message).toBe("string error");
                },
                onSuccess: () => {
                    expect.fail("Expected failure");
                }
            });
        })
    })
}) 