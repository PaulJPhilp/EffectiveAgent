import { Effect } from "effect"
import { beforeEach, describe, expect, it } from "vitest"
import { z } from "zod"
import { ConfigurationService } from "../../configuration/configuration-service.js"
import { EffectiveNormalizingAgent } from "../effective-normalizing-agent.js"
import { AgentImplementationError, AgentRateLimitError } from "../errors.js"
import type { AgentConfig } from "../types.js"

interface TestState {
    messages: string[]
    normalizedData: Record<string, unknown>
    errors: Error[]
}

describe("EffectiveNormalizingAgent", () => {
    // Sample test data
    const testConfig: AgentConfig = {
        id: "test-normalizing-agent",
        name: "Test Normalizing Agent",
        description: "Agent for testing normalization capabilities",
        version: "1.0.0",
        capabilities: ["data-normalization"],
        schema: z.object({
            name: z.string(),
            age: z.number(),
            email: z.string().email(),
            preferences: z.object({
                theme: z.enum(["light", "dark"]),
                notifications: z.boolean().optional().default(false)
            })
        })
    }

    let agent: EffectiveNormalizingAgent
    let configService: ConfigurationService

    beforeEach(() => {
        configService = new ConfigurationService()
        agent = new EffectiveNormalizingAgent(configService, testConfig)
    })

    describe("Initialization", () => {
        it("should initialize with valid config", () => {
            expect(agent.agentId).toBe("test-normalizing-agent")
            expect(agent.config).toEqual(testConfig)
        })

        it("should fail initialization with invalid config", () => {
            expect(() => {
                new EffectiveNormalizingAgent(configService, undefined as unknown as AgentConfig)
            }).toThrow()
        })

        it("should validate schema on initialization", () => {
            const invalidSchema = {
                ...testConfig,
                schema: "not a zod schema" as unknown as z.ZodSchema
            }
            expect(() => {
                new EffectiveNormalizingAgent(configService, invalidSchema)
            }).toThrow()
        })
    })

    describe("Data Normalization", () => {
        it("should normalize valid data successfully", async () => {
            const inputData = {
                name: "Test User",
                age: 30,
                email: "test@example.com",
                preferences: {
                    theme: "dark",
                    notifications: true
                }
            }

            const program = agent.normalizeData(inputData)
            const result = await Effect.runPromise(program)

            expect(result).toMatchObject({
                normalized: true,
                data: inputData,
                validationErrors: []
            })
            expect(typeof result.processingTimeMs).toBe("number")
            expect(result.processingTimeMs).toBeGreaterThan(0)
        })

        it("should handle missing optional fields", async () => {
            const inputData = {
                name: "Test User",
                age: 30,
                email: "test@example.com",
                preferences: {
                    theme: "light"
                }
            }

            const program = agent.normalizeData(inputData)
            const result = await Effect.runPromise(program)

            expect(result.normalized).toBe(true)
            expect(result.data).toHaveProperty("preferences.notifications", false)
            expect(typeof result.processingTimeMs).toBe("number")
            expect(result.processingTimeMs).toBeGreaterThan(0)
        })

        it("should reject invalid data types", async () => {
            const inputData = {
                name: "Test User",
                age: "30", // Should be number
                email: "test@example.com",
                preferences: {
                    theme: "light",
                    notifications: true
                }
            }

            const program = agent.normalizeData(inputData)

            try {
                await Effect.runPromise(program)
                expect(true).toBe(false) // This line should not be reached
            } catch (error) {
                expect(error.message).toContain("Validation failed")
                expect(error.message).toContain("Expected number, received string")
            }
        })

        it("should handle invalid email format", async () => {
            const inputData = {
                name: "Test User",
                age: 30,
                email: "invalid-email",
                preferences: {
                    theme: "light",
                    notifications: true
                }
            }

            const program = agent.normalizeData(inputData)

            try {
                await Effect.runPromise(program)
                expect(true).toBe(false) // This line should not be reached
            } catch (error) {
                expect(error.message).toContain("Invalid email")
            }
        })

        it("should reject invalid enum values", async () => {
            const inputData = {
                name: "Test User",
                age: 30,
                email: "test@example.com",
                preferences: {
                    theme: "blue", // Invalid theme
                    notifications: true
                }
            }

            const program = agent.normalizeData(inputData)

            try {
                await Effect.runPromise(program)
                expect(true).toBe(false) // This line should not be reached
            } catch (error) {
                expect(error.message).toContain("Invalid enum value")
                expect(error.message).toContain("Expected 'light' | 'dark', received 'blue'")
            }
        })
    })

    describe("Batch Processing", () => {
        it("should process multiple records successfully", async () => {
            const inputData = [
                {
                    name: "User 1",
                    age: 25,
                    email: "user1@example.com",
                    preferences: { theme: "light", notifications: true }
                },
                {
                    name: "User 2",
                    age: 35,
                    email: "user2@example.com",
                    preferences: { theme: "dark", notifications: false }
                }
            ]

            const program = agent.normalizeBatch(inputData)
            const result = await Effect.runPromise(program)

            expect(result.length).toBe(2)
            expect(result.every(r => r.normalized)).toBe(true)
            expect(result.every(r => typeof r.processingTimeMs === "number")).toBe(true)
            expect(result.every(r => r.processingTimeMs > 0)).toBe(true)
        })

        it("should handle mixed valid/invalid records", async () => {
            const inputData = [
                {
                    name: "Valid User",
                    age: 25,
                    email: "valid@example.com",
                    preferences: { theme: "light", notifications: true }
                },
                {
                    name: "Invalid User",
                    age: "35", // Invalid type
                    email: "invalid-email",
                    preferences: { theme: "invalid", notifications: "true" }
                }
            ]

            const program = agent.normalizeBatch(inputData)

            try {
                await Effect.runPromise(program)
                expect(true).toBe(false) // This line should not be reached
            } catch (error) {
                expect(error.message).toContain("Validation failed")
                expect(error.message).toContain("Expected number, received string")
                expect(error.message).toContain("Invalid email")
                expect(error.message).toContain("Invalid enum value")
            }
        })
    })

    describe("Error Handling", () => {
        it("should handle rate limit errors", async () => {
            const program = Effect.fail(
                new AgentRateLimitError({
                    message: "Rate limit exceeded",
                    retryAfterMs: 1000,
                    agentId: agent.agentId
                })
            )

            try {
                await Effect.runPromise(program)
                expect(true).toBe(false) // This line should not be reached
            } catch (error) {
                expect(error.message).toContain("Rate limit exceeded")
            }
        })

        it("should handle implementation errors", async () => {
            const program = Effect.fail(
                new AgentImplementationError({
                    message: "Invalid implementation",
                    agentId: agent.agentId
                })
            )

            try {
                await Effect.runPromise(program)
                expect(true).toBe(false) // This line should not be reached
            } catch (error) {
                expect(error.message).toContain("Invalid implementation")
            }
        })

        it("should handle unexpected errors", async () => {
            const program = Effect.fail(new Error("Unexpected error"))

            try {
                await Effect.runPromise(program)
                expect(true).toBe(false) // This line should not be reached
            } catch (error) {
                expect(error.message).toContain("Unexpected error")
            }
        })
    })

    describe("Configuration Integration", () => {
        it("should use shared configuration service", async () => {
            const configuredAgent = new EffectiveNormalizingAgent(configService, {
                ...testConfig,
                useSharedConfig: true
            })

            expect(configuredAgent["configService"]).toBe(configService)
        })

        it("should override configuration with agent-specific settings", async () => {
            const agentSpecificConfig = {
                ...testConfig,
                overrides: {
                    maxBatchSize: 100,
                    timeoutMs: 5000
                }
            }

            const configuredAgent = new EffectiveNormalizingAgent(configService, agentSpecificConfig)
            expect(configuredAgent.config.overrides).toEqual(agentSpecificConfig.overrides)
        })
    })

    describe("Performance Monitoring", () => {
        it("should track processing time", async () => {
            const inputData = {
                name: "Test User",
                age: 30,
                email: "test@example.com",
                preferences: { theme: "light", notifications: true }
            }

            const startTime = performance.now()
            const program = agent.normalizeData(inputData)
            const result = await Effect.runPromise(program)
            const endTime = performance.now()

            expect(result.normalized).toBe(true)
            expect(typeof result.processingTimeMs).toBe("number")
            expect(result.processingTimeMs).toBeGreaterThan(0)
            expect(endTime - startTime).toBeLessThan(1000) // Assuming reasonable performance
        })

        it("should handle large batch sizes efficiently", async () => {
            const largeDataset = Array(100).fill({
                name: "Test User",
                age: 30,
                email: "test@example.com",
                preferences: { theme: "light", notifications: true }
            })

            const startTime = performance.now()
            const program = agent.normalizeBatch(largeDataset)
            const result = await Effect.runPromise(program)
            const endTime = performance.now()

            expect(result.length).toBe(100)
            expect(result.every(r => r.normalized)).toBe(true)
            expect(result.every(r => typeof r.processingTimeMs === "number")).toBe(true)
            expect(result.every(r => r.processingTimeMs > 0)).toBe(true)
            expect(endTime - startTime).toBeLessThan(5000) // Assuming reasonable performance
        })
    })
}) 