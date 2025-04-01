import { Effect, Option } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigurationService } from "../../../configuration/types.js"; // Adjust path if needed
import { LoggingService, type Logger } from "../../../logging/types.js"; // Adjust path if needed
import {
    ToolExecutionError,
    ToolInvocationError,
    ToolNotFoundError,
    ToolRegistrationError
} from "../../errors/index.js";
import { calculatorTool, webSearchTool } from "../../standard-library/index.js";
import { ToolServiceLive } from "../../tool-service.js"; // Import the class directly
import { ToolService, type Tool } from "../../types/index.js"; // Import base Tool type

// --- Mocks --- 

const mockLogger: Logger = {
    // Ensure log returns Effect<void>
    log: vi.fn(() => Effect.void),
    debug: vi.fn(() => Effect.void),
    info: vi.fn(() => Effect.void),
    warn: vi.fn(() => Effect.void),
    error: vi.fn(() => Effect.void)
}

const mockLoggingService: LoggingService = {
    getLogger: vi.fn(() => Effect.succeed(mockLogger))
}

// Refined Mock ConfigurationService
const mockConfigurationServiceImplementation = {
    get: (key: string): Effect.Effect<Option.Option<string>> => {
        if (key === "SEARCH_API_KEY") {
            return Effect.succeed(Option.some("test-api-key"));
        }
        if (key === "SEARCH_API_URL") {
            return Effect.succeed(Option.some("https://example.com/search"));
        }
        // Default mock value or None
        return Effect.succeed(Option.none());
    }
    // Add other methods if needed
};
const mockConfigurationService: ConfigurationService = {
    // Wrap implementation in vi.fn for spying/mocking capabilities if desired
    get: vi.fn(mockConfigurationServiceImplementation.get)
}

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// --- Test Setup --- 

// Function to create a fresh service instance for each test
function createTestService(): ToolService {
    return new ToolServiceLive(
        mockLoggingService,
        mockConfigurationService
    ) as ToolService // Cast needed as class might technically mismatch Tag type
}

describe("ToolServiceLive", () => {
    let toolService: ToolService

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks()
        // Create a fresh instance
        toolService = createTestService()
        // Pre-register tools
        Effect.runSync(toolService.registerTool(calculatorTool))
        Effect.runSync(toolService.registerTool(webSearchTool))
        // Clear mocks again after registration
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.unstubAllGlobals() // Clean up global mocks
    })

    // --- Test Cases --- 

    describe("registerTool", () => {
        it("should register a new tool successfully", () => {
            const newTool = { ...calculatorTool, id: "new-tool" };
            Effect.runSync(toolService.registerTool(newTool));
            const foundTool = Effect.runSync(toolService.getTool("new-tool"));
            expect(foundTool.id).toBe("new-tool");
            expect(mockLogger.info).toHaveBeenCalledWith(
                "Tool registered successfully",
                expect.objectContaining({ annotations: { toolId: "new-tool" } })
            );
        });

        it("should fail to register a tool with a duplicate ID", async () => {
            const registerEffect = toolService.registerTool(calculatorTool);
            await expect(Effect.runPromise(registerEffect)).rejects.toThrow(ToolRegistrationError);
            await expect(Effect.runPromise(registerEffect)).rejects.toMatchObject({
                name: "ToolRegistrationError",
                message: "Tool with ID 'calculator' is already registered.",
                toolId: "calculator"
            });
            expect(mockLogger.error).toHaveBeenCalledWith(
                "Tool registration failed",
                expect.objectContaining({ annotations: { toolId: "calculator" } })
            );
        });
    });

    describe("getTool", () => {
        it("should retrieve a registered tool by ID", () => {
            const foundTool = Effect.runSync(toolService.getTool("calculator"));
            expect(foundTool).toBeDefined();
            expect(foundTool.id).toBe("calculator");
        });

        it("should fail if the tool ID is not found", async () => {
            const getEffect = toolService.getTool("non-existent-tool");
            await expect(Effect.runPromise(getEffect)).rejects.toThrow(ToolNotFoundError);
        });
    });

    describe("listTools", () => {
        it("should list all registered tools", () => {
            const tools = Effect.runSync(toolService.listTools());
            expect(tools).toHaveLength(2); // calculator + web-search
            expect(tools.map(t => t.id)).toContain("calculator");
            expect(tools.map(t => t.id)).toContain("web-search");
        });
        // Add tag filtering tests if needed
    });

    describe("invokeTool", () => {
        it("CALCULATOR: should successfully invoke with valid input", async () => {
            const input = { expression: "5 + 7" };
            const invokeEffect = toolService.invokeTool<typeof input, { result: number }>("calculator", input);
            const result = await Effect.runPromise(invokeEffect);
            expect(result).toEqual({ result: 12 });
            expect(mockLogger.info).toHaveBeenCalledWith(
                "Tool invoked successfully",
                expect.objectContaining({ annotations: expect.objectContaining({ toolId: "calculator" }) })
            );
        });

        it("CALCULATOR: should fail with ToolValidationError if input validation fails", async () => {
            const invalidInput = { express: "2 + 2" };
            const invokeEffect = toolService.invokeTool("calculator", invalidInput);
            await expect(Effect.runPromise(invokeEffect)).rejects.toMatchObject({
                name: "ToolInvocationError",
                cause: { name: "ToolValidationError", validationType: "input" }
            });
        });

        // --- Web Search Tool Tests --- 
        it("WEBSEARCH: should successfully invoke with valid input and mock response", async () => {
            // Setup mock fetch response
            const mockApiResponse = {
                items: [
                    { title: "Result 1", link: "https://example.com/1", snippet: "Snippet 1" },
                    { title: "Result 2", link: "https://example.com/2", snippet: "Snippet 2" }
                ]
            };
            mockFetch.mockResolvedValue(new Response(JSON.stringify(mockApiResponse), { status: 200 }));

            const input = { query: "test query" };
            const invokeEffect = toolService.invokeTool<typeof input, { results: any[] }>("web-search", input);
            const result = await Effect.runPromise(invokeEffect);

            expect(result).toEqual({
                results: [
                    { title: "Result 1", link: "https://example.com/1", snippet: "Snippet 1" },
                    { title: "Result 2", link: "https://example.com/2", snippet: "Snippet 2" }
                ]
            });
            expect(mockFetch).toHaveBeenCalledWith("https://example.com/search?query=test+query&key=test-api-key", expect.any(Object));
            expect(mockLogger.info).toHaveBeenCalledWith(
                "Web search successful",
                expect.objectContaining({ query: "test query", resultCount: 2 })
            );
            expect(mockLogger.info).toHaveBeenCalledWith(
                "Tool invoked successfully",
                expect.objectContaining({ annotations: expect.objectContaining({ toolId: "web-search" }) })
            );
        });

        it("WEBSEARCH: should fail if SEARCH_API_KEY configuration is missing", async () => {
            // Override mock config for this test
            mockConfigurationService.get = vi.fn((key: string) => {
                if (key === "SEARCH_API_URL") return Effect.succeed(Option.some("https://example.com/search"));
                return Effect.succeed(Option.none()); // Key is missing
            });
            toolService = createTestService(); // Recreate service with updated mock
            Effect.runSync(toolService.registerTool(webSearchTool)) // Re-register

            const input = { query: "test query" };
            const invokeEffect = toolService.invokeTool("web-search", input);

            await expect(Effect.runPromise(invokeEffect)).rejects.toMatchObject({
                name: "ToolInvocationError",
                cause: {
                    name: "ToolExecutionError",
                    message: "Configuration error: SEARCH_API_KEY is not set."
                }
            });
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it("WEBSEARCH: should fail if SEARCH_API_URL configuration is missing", async () => {
            // Override mock config for this test
            mockConfigurationService.get = vi.fn((key: string) => {
                if (key === "SEARCH_API_KEY") return Effect.succeed(Option.some("test-api-key"));
                return Effect.succeed(Option.none()); // URL is missing
            });
            toolService = createTestService(); // Recreate service with updated mock
            Effect.runSync(toolService.registerTool(webSearchTool)) // Re-register

            const input = { query: "test query" };
            const invokeEffect = toolService.invokeTool("web-search", input);

            await expect(Effect.runPromise(invokeEffect)).rejects.toMatchObject({
                name: "ToolInvocationError",
                cause: {
                    name: "ToolExecutionError",
                    message: "Configuration error: SEARCH_API_URL is not set."
                }
            });
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it("WEBSEARCH: should fail if fetch throws a network error", async () => {
            // Setup mock fetch to reject
            const networkError = new Error("Network connection failed");
            mockFetch.mockRejectedValue(networkError);

            const input = { query: "test query" };
            const invokeEffect = toolService.invokeTool("web-search", input);

            await expect(Effect.runPromise(invokeEffect)).rejects.toMatchObject({
                name: "ToolInvocationError",
                cause: {
                    name: "ToolExecutionError",
                    message: "Network request to search API failed.",
                    cause: networkError // Check original error is nested
                }
            });
        });

        it("WEBSEARCH: should fail if API returns non-OK status", async () => {
            // Setup mock fetch response with error status
            mockFetch.mockResolvedValue(new Response("Unauthorized", { status: 401, statusText: "Unauthorized" }));

            const input = { query: "test query" };
            const invokeEffect = toolService.invokeTool("web-search", input);

            await expect(Effect.runPromise(invokeEffect)).rejects.toMatchObject({
                name: "ToolInvocationError",
                cause: {
                    name: "ToolExecutionError",
                    message: expect.stringContaining("Search API request failed with status 401")
                }
            });
        });

        it("WEBSEARCH: should fail if API response is not valid JSON", async () => {
            // Setup mock fetch response with invalid JSON
            mockFetch.mockResolvedValue(new Response("this is not json", { status: 200 }));

            const input = { query: "test query" };
            const invokeEffect = toolService.invokeTool("web-search", input);

            await expect(Effect.runPromise(invokeEffect)).rejects.toMatchObject({
                name: "ToolInvocationError",
                cause: {
                    name: "ToolExecutionError",
                    message: "Failed to parse JSON response from search API."
                }
            });
        });

        // --- Shared / Other Tests --- 

        it("should fail with ToolValidationError if output validation fails", async () => {
            // Mock the calculator tool to return invalid output
            const invalidOutputTool: Tool<any, any> = {
                ...calculatorTool,
                id: "invalid-output-tool",
                execute: () => Effect.succeed({ result: "not a number" }) // Output doesn't match schema
            };
            Effect.runSync(toolService.registerTool(invalidOutputTool));
            vi.clearAllMocks(); // Clear mocks after registration

            const input = { expression: "1 + 1" };
            const invokeEffect = toolService.invokeTool("invalid-output-tool", input);

            await expect(Effect.runPromise(invokeEffect)).rejects.toThrow(ToolInvocationError);
            await expect(Effect.runPromise(invokeEffect)).rejects.toMatchObject({
                name: "ToolInvocationError",
                cause: {
                    name: "ToolValidationError",
                    validationType: "output",
                    toolId: "invalid-output-tool"
                }
            });
            expect(mockLogger.warn).toHaveBeenCalledWith(
                "Tool output validation failed",
                expect.objectContaining({ annotations: expect.objectContaining({ toolId: "invalid-output-tool" }) })
            );
        });

        it("should fail with ToolExecutionError if tool execution fails", async () => {
            // Mock the calculator tool to throw an error during execution
            const errorThrowingTool: Tool<any, any> = {
                ...calculatorTool,
                id: "error-tool",
                execute: () => Effect.fail(new ToolExecutionError("Calculation failed!", { toolId: "error-tool", cause: new Error("Simulated error") }))
            };
            Effect.runSync(toolService.registerTool(errorThrowingTool));
            vi.clearAllMocks(); // Clear mocks after registration

            const input = { expression: "1 + 1" };
            const invokeEffect = toolService.invokeTool("error-tool", input);

            await expect(Effect.runPromise(invokeEffect)).rejects.toThrow(ToolInvocationError);
            await expect(Effect.runPromise(invokeEffect)).rejects.toMatchObject({
                name: "ToolInvocationError",
                cause: { name: "ToolExecutionError", toolId: "error-tool" }
            });
            // Should not log a validation warning
            expect(mockLogger.warn).not.toHaveBeenCalled();
        });

        it("should wrap unexpected errors during tool execution", async () => {
            // Mock the calculator tool to throw a generic error
            const genericErrorTool: Tool<any, any> = {
                ...calculatorTool,
                id: "generic-error-tool",
                execute: () => Effect.fail(new Error("Something unexpected happened!")) // Not a ToolExecutionError
            };
            Effect.runSync(toolService.registerTool(genericErrorTool));
            vi.clearAllMocks();

            const input = { expression: "1 + 1" };
            const invokeEffect = toolService.invokeTool("generic-error-tool", input);

            await expect(Effect.runPromise(invokeEffect)).rejects.toThrow(ToolInvocationError);
            await expect(Effect.runPromise(invokeEffect)).rejects.toMatchObject({
                name: "ToolInvocationError",
                cause: {
                    name: "ToolExecutionError", // It should be wrapped
                    message: "Execution failed unexpectedly for 'generic-error-tool'.",
                    toolId: "generic-error-tool",
                    cause: { message: "Something unexpected happened!" } // Original error nested
                }
            });
            expect(mockLogger.warn).not.toHaveBeenCalled();
        });

    });

}); 