/**
 * Tests for EA SDK service implementation
 * @file Tests the EA SDK service using Effect.Service pattern (v3.16+)
 */

import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import type { AgentRuntimeServiceApi } from "../../api.js"
import type { EASdkApi } from "../api.js"
import {
    EASdkConfigurationError,
    EASdkValidationError
} from "../errors.js"
import type { LangGraphAgentConfig, LangGraphAgentState } from "../types.js"

// Mock AgentRuntimeServiceApi for testing
const createMockAgentRuntime = (): AgentRuntimeServiceApi => ({
    create: () => Effect.succeed({} as any),
    terminate: () => Effect.succeed(undefined),
    send: () => Effect.succeed(undefined),
    getState: () => Effect.succeed({} as any),
    subscribe: () => ({} as any),
    getModelService: () => Effect.succeed({} as any),
    getProviderService: () => Effect.succeed({} as any),
    getPolicyService: () => Effect.succeed({} as any),
    getToolRegistryService: () => Effect.succeed({} as any),
    getFileService: () => Effect.succeed({} as any),
    createLangGraphAgent: () => Effect.succeed({
        agentRuntime: {
            id: "test-agent-123" as any,
            send: () => Effect.succeed(undefined),
            getState: () => Effect.succeed({} as any),
            subscribe: () => ({} as any)
        },
        agentRuntimeId: "test-agent-123" as any
    }),
    run: <Output, LogicError = any>(logicToRun: Effect.Effect<Output, LogicError, any>) => Effect.runPromise(logicToRun as Effect.Effect<Output, LogicError, never>)
})

// Create a test-only EASdk service that doesn't require AgentRuntimeService
class TestEASdk extends Effect.Service<EASdkApi>()("TestEASdk", {
    effect: Effect.succeed({
        createEnhancedLangGraphAgent: () => Effect.succeed({
            agentRuntime: {
                id: "test-agent-123" as any,
                send: () => Effect.succeed(undefined),
                getState: () => Effect.succeed({} as any),
                subscribe: () => ({} as any)
            },
            agentRuntimeId: "test-agent-123" as any
        }),
        validateAgentState: <TState extends LangGraphAgentState>(state: TState) => {
            const errors: string[] = []
            const warnings: string[] = []

            if (!state.agentRuntime) {
                errors.push("Missing required property: agentRuntime")
            }

            if (state.agentRuntime) {
                if (typeof state.agentRuntime.run !== 'function') {
                    errors.push("agentRuntime.run is not a function")
                }
            }

            return Effect.succeed({
                isValid: errors.length === 0,
                errors: errors.length > 0 ? errors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined
            })
        },
        createActivityPayload: (operation: string, data?: Record<string, unknown>, metadata?: Record<string, unknown>) => Effect.succeed({
            operation,
            data: data ?? {},
            metadata: {
                timestamp: new Date().toISOString(),
                source: "ea-sdk",
                version: "1.0.0",
                ...metadata
            }
        }),
        validateConfiguration: (config: LangGraphAgentConfig) => Effect.gen(function* () {
            if (config.recursionLimit !== undefined) {
                if (typeof config.recursionLimit !== 'number' || config.recursionLimit < 1 || config.recursionLimit > 1000) {
                    return yield* Effect.fail(new EASdkConfigurationError({
                        message: "recursionLimit must be a number between 1 and 1000",
                        module: "EASdk",
                        method: "validateConfiguration",
                        configKey: "recursionLimit",
                        expectedType: "number (1-1000)"
                    }))
                }
            }

            if (config.errorHandling !== undefined) {
                const validErrorHandling = ["propagate", "capture", "retry"] as const
                if (!validErrorHandling.includes(config.errorHandling as any)) {
                    return yield* Effect.fail(new EASdkConfigurationError({
                        message: `errorHandling must be one of: ${validErrorHandling.join(", ")}`,
                        module: "EASdk",
                        method: "validateConfiguration",
                        configKey: "errorHandling",
                        expectedType: `"${validErrorHandling.join('" | "')}"`
                    }))
                }
            }

            return {
                recursionLimit: 50,
                timeoutMs: 30000,
                enableStreaming: false,
                errorHandling: "propagate",
                retryAttempts: 3,
                ...config
            }
        }),
        checkCompatibility: (requirements?: any) => Effect.gen(function* () {
            if (requirements?.requiredFeatures) {
                const supportedFeatures = ["streaming", "retry", "validation", "enhanced-creation"]
                const unsupportedFeatures = requirements.requiredFeatures.filter(
                    (feature: string) => !supportedFeatures.includes(feature)
                )
                if (unsupportedFeatures.length > 0) {
                    return yield* Effect.fail(new EASdkConfigurationError({
                        message: `Unsupported features required: ${unsupportedFeatures.join(", ")}`,
                        module: "EASdk",
                        method: "checkCompatibility"
                    }))
                }
            }
            return true
        }),
        createErrorHandler: (agentId: string, operation: string) => Effect.succeed((error: unknown) => {
            return Effect.fail(new EASdkValidationError({
                message: `Operation '${operation}' failed for agent '${agentId}': ${error instanceof Error ? error.message : String(error)}`,
                module: "EASdk",
                method: "errorHandler"
            }))
        })
    } satisfies EASdkApi),
    dependencies: []
}) { }

describe("EASdk Service", () => {
    describe("validateAgentState", () => {
        it("should validate a valid agent state", async () => {
            const mockRuntime = createMockAgentRuntime()
            const validState: LangGraphAgentState = {
                agentRuntime: mockRuntime,
                context: { userId: "123" }
            }

            const program = Effect.gen(function* () {
                const sdk = yield* TestEASdk
                const result = yield* sdk.validateAgentState(validState)

                expect(result.isValid).toBe(true)
                expect(result.errors).toBeUndefined()

                return result
            })

            const result = await Effect.runPromise(
                program.pipe(
                    Effect.provide(TestEASdk.Default)
                )
            )

            expect(result.isValid).toBe(true)
        })

        it("should fail validation for state missing agentRuntime", async () => {
            // @ts-expect-error Testing invalid state
            const invalidState: LangGraphAgentState = {
                context: { userId: "123" }
            }

            const program = Effect.gen(function* () {
                const sdk = yield* TestEASdk
                const result = yield* sdk.validateAgentState(invalidState)

                expect(result.isValid).toBe(false)
                expect(result.errors).toContain("Missing required property: agentRuntime")

                return result
            })

            const result = await Effect.runPromise(
                program.pipe(
                    Effect.provide(TestEASdk.Default)
                )
            )

            expect(result.isValid).toBe(false)
        })
    })

    describe("validateConfiguration", () => {
        it("should validate and normalize valid configuration", async () => {
            const config: LangGraphAgentConfig = {
                recursionLimit: 25,
                timeoutMs: 45000,
                enableStreaming: true
            }

            const program = Effect.gen(function* () {
                const sdk = yield* TestEASdk
                const result = yield* sdk.validateConfiguration(config)

                expect(result.recursionLimit).toBe(25)
                expect(result.timeoutMs).toBe(45000)
                expect(result.enableStreaming).toBe(true)
                expect(result.errorHandling).toBe("propagate") // default value

                return result
            })

            const result = await Effect.runPromise(
                program.pipe(
                    Effect.provide(TestEASdk.Default)
                )
            )

            expect(result.recursionLimit).toBe(25)
        })

        it("should fail validation for invalid recursionLimit", async () => {
            const invalidConfig: LangGraphAgentConfig = {
                recursionLimit: -1 // Invalid: must be >= 1
            }

            const program = Effect.gen(function* () {
                const sdk = yield* TestEASdk
                return yield* sdk.validateConfiguration(invalidConfig)
            })

            await expect(
                Effect.runPromise(
                    program.pipe(
                        Effect.provide(TestEASdk.Default)
                    )
                )
            ).rejects.toThrow("recursionLimit must be a number between 1 and 1000")
        })

        it("should fail validation for invalid errorHandling", async () => {
            const invalidConfig: LangGraphAgentConfig = {
                // @ts-expect-error Testing invalid value
                errorHandling: "invalid-option"
            }

            const program = Effect.gen(function* () {
                const sdk = yield* TestEASdk
                return yield* sdk.validateConfiguration(invalidConfig)
            })

            await expect(
                Effect.runPromise(
                    program.pipe(
                        Effect.provide(TestEASdk.Default)
                    )
                )
            ).rejects.toThrow("errorHandling must be one of: propagate, capture, retry")
        })
    })

    describe("createActivityPayload", () => {
        it("should create a properly formatted activity payload", async () => {
            const operation = "user_message"
            const data = { message: "Hello, world!" }
            const metadata = { priority: "high" }

            const program = Effect.gen(function* () {
                const sdk = yield* TestEASdk
                const payload = yield* sdk.createActivityPayload(operation, data, metadata)

                expect(payload.operation).toBe(operation)
                expect(payload.data).toEqual(data)
                expect(payload.metadata?.source).toBe("ea-sdk")
                expect(payload.metadata?.version).toBe("1.0.0")
                expect(payload.metadata?.priority).toBe("high")
                expect(payload.metadata?.timestamp).toBeDefined()

                return payload
            })

            const result = await Effect.runPromise(
                program.pipe(
                    Effect.provide(TestEASdk.Default)
                )
            )

            expect(result.operation).toBe(operation)
        })
    })

    describe("checkCompatibility", () => {
        it("should pass compatibility check with no requirements", async () => {
            const program = Effect.gen(function* () {
                const sdk = yield* TestEASdk
                const isCompatible = yield* sdk.checkCompatibility()

                expect(isCompatible).toBe(true)

                return isCompatible
            })

            const result = await Effect.runPromise(
                program.pipe(
                    Effect.provide(TestEASdk.Default)
                )
            )

            expect(result).toBe(true)
        })

        it("should pass compatibility check with valid requirements", async () => {
            const requirements = {
                minEAVersion: "0.9.0",
                maxEAVersion: "2.0.0",
                requiredFeatures: ["streaming", "validation"] as const
            }

            const program = Effect.gen(function* () {
                const sdk = yield* TestEASdk
                const isCompatible = yield* sdk.checkCompatibility(requirements)

                expect(isCompatible).toBe(true)

                return isCompatible
            })

            const result = await Effect.runPromise(
                program.pipe(
                    Effect.provide(TestEASdk.Default)
                )
            )

            expect(result).toBe(true)
        })

        it("should fail compatibility check with unsupported features", async () => {
            const requirements = {
                requiredFeatures: ["unsupported-feature"] as const
            }

            const program = Effect.gen(function* () {
                const sdk = yield* TestEASdk
                return yield* sdk.checkCompatibility(requirements)
            })

            await expect(
                Effect.runPromise(
                    program.pipe(
                        Effect.provide(TestEASdk.Default)
                    )
                )
            ).rejects.toThrow("Unsupported features required: unsupported-feature")
        })
    })

    describe("createErrorHandler", () => {
        it("should create an error handler function", async () => {
            const agentId = "test-agent-123"
            const operation = "process_message"

            const program = Effect.gen(function* () {
                const sdk = yield* TestEASdk
                const errorHandler = yield* sdk.createErrorHandler(agentId, operation)

                expect(typeof errorHandler).toBe("function")

                return errorHandler
            })

            const errorHandler = await Effect.runPromise(
                program.pipe(
                    Effect.provide(TestEASdk.Default)
                )
            )

            expect(typeof errorHandler).toBe("function")

            // Test the error handler
            const testError = new Error("Test error")
            const errorEffect = errorHandler(testError)

            await expect(
                Effect.runPromise(errorEffect)
            ).rejects.toThrow("Operation 'process_message' failed for agent 'test-agent-123': Test error")
        })
    })
}) 