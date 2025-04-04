import { Effect, Option } from "effect"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ConfigurationService } from "../../../configuration/configuration-service.js"
import { type ILoggingService } from "../../../logging/types/index.js"
import { type Logger } from "../../../logging/types/logger.js"
import { calculatorTool } from "../calculator.tool.js"
import { webSearchTool } from "../web-search.tool.js"

// Mock logger
const createMockLogger = (): Logger => ({
    log: () => Effect.succeed(undefined),
    debug: () => Effect.succeed(undefined),
    info: () => Effect.succeed(undefined),
    warn: () => Effect.succeed(undefined),
    error: () => Effect.succeed(undefined)
})

// Mock logging service
const createMockLoggingService = (): ILoggingService => ({
    getLogger: () => Effect.succeed(createMockLogger())
})

// Mock configuration service
class MockConfigurationService implements ConfigurationService {
    private config: Map<string, string>

    constructor(initialConfig: Record<string, string> = {}) {
        this.config = new Map(Object.entries(initialConfig))
    }

    get(key: string) {
        const value = this.config.get(key)
        return Effect.succeed(value ? Option.some(value) : Option.none())
    }

    set(key: string, value: string) {
        this.config.set(key, value)
        return Effect.succeed(undefined)
    }
}

describe("Standard Library Tools", () => {
    let mockLoggingService: ILoggingService
    let mockConfigService: MockConfigurationService
    let mockContext: { loggingService: ILoggingService; configurationService: ConfigurationService }

    beforeEach(() => {
        mockLoggingService = createMockLoggingService()
        mockConfigService = new MockConfigurationService({
            SEARCH_API_KEY: "test-api-key",
            SEARCH_API_URL: "https://api.search.test"
        })
        mockContext = {
            loggingService: mockLoggingService,
            configurationService: mockConfigService
        }
    })

    describe("Calculator Tool", () => {
        it("should correctly add two numbers", async () => {
            const input = { expression: "5 + 3" }
            const result = await Effect.runPromise(calculatorTool.execute(input, mockContext))
            expect(result).toEqual({ result: 8 })
        })

        it("should handle decimal numbers", async () => {
            const input = { expression: "5.5 + 3.3" }
            const result = await Effect.runPromise(calculatorTool.execute(input, mockContext))
            expect(result).toEqual({ result: 8.8 })
        })

        it("should fail with invalid expression format", async () => {
            const input = { expression: "5 * 3" }
            await expect(
                Effect.runPromise(calculatorTool.execute(input, mockContext))
            ).rejects.toThrow("Invalid expression format")
        })

        it("should fail with non-numeric values", async () => {
            const input = { expression: "abc + def" }
            await expect(
                Effect.runPromise(calculatorTool.execute(input, mockContext))
            ).rejects.toThrow("Invalid numbers in expression")
        })

        it("should validate input schema", () => {
            const result = calculatorTool.inputSchema.safeParse({})
            expect(result.success).toBe(false)
        })

        it("should validate output schema", () => {
            const result = calculatorTool.outputSchema.safeParse({})
            expect(result.success).toBe(false)
        })
    })

    describe("Web Search Tool", () => {
        // Mock fetch for testing
        const mockFetchResponse = {
            items: [
                {
                    title: "Test Result 1",
                    link: "https://test1.example.com",
                    snippet: "This is test result 1"
                },
                {
                    title: "Test Result 2",
                    link: "https://test2.example.com",
                    snippet: "This is test result 2"
                }
            ]
        }

        let originalFetch: typeof global.fetch

        beforeEach(() => {
            originalFetch = global.fetch
            global.fetch = vi.fn().mockImplementation(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockFetchResponse),
                    status: 200,
                    statusText: "OK"
                } as Response)
            )
        })

        afterEach(() => {
            global.fetch = originalFetch
            vi.clearAllMocks()
        })

        it("should perform a web search successfully", async () => {
            const input = { query: "test search" }
            const result = await Effect.runPromise(webSearchTool.execute(input, mockContext))

            expect(result.results).toHaveLength(2)
            expect(result.results[0]).toEqual({
                title: "Test Result 1",
                link: "https://test1.example.com",
                snippet: "This is test result 1"
            })
        })

        it("should fail when API key is not configured", async () => {
            mockConfigService = new MockConfigurationService() // Empty config
            const input = { query: "test search" }

            await expect(
                Effect.runPromise(webSearchTool.execute(input, {
                    ...mockContext,
                    configurationService: mockConfigService
                }))
            ).rejects.toThrow("Configuration error: SEARCH_API_KEY is not set")
        })

        it("should handle API errors", async () => {
            global.fetch = vi.fn().mockImplementation(() =>
                Promise.resolve({
                    ok: false,
                    status: 403,
                    statusText: "Forbidden",
                    text: () => Promise.resolve("API Key Invalid")
                } as Response)
            )

            const input = { query: "test search" }
            await expect(
                Effect.runPromise(webSearchTool.execute(input, mockContext))
            ).rejects.toThrow("Search API request failed")
        })

        it("should handle network errors", async () => {
            global.fetch = vi.fn().mockImplementation(() =>
                Promise.reject(new Error("Network error"))
            )

            const input = { query: "test search" }
            await expect(
                Effect.runPromise(webSearchTool.execute(input, mockContext))
            ).rejects.toThrow("Network request to search API failed")
        })

        it("should validate input schema", () => {
            const result = webSearchTool.inputSchema.safeParse({})
            expect(result.success).toBe(false)
        })

        it("should validate output schema", () => {
            const result = webSearchTool.outputSchema.safeParse({})
            expect(result.success).toBe(false)
        })

        it("should handle empty search results", async () => {
            global.fetch = vi.fn().mockImplementation(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ items: [] }),
                    status: 200,
                    statusText: "OK"
                } as Response)
            )

            const input = { query: "no results search" }
            const result = await Effect.runPromise(webSearchTool.execute(input, mockContext))

            expect(result.results).toHaveLength(0)
        })
    })
}) 