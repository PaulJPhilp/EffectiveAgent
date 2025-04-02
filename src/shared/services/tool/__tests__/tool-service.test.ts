import { Effect } from "effect";
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { ConfigurationService } from "../../configuration/configuration-service.js";
import { type ILoggingService } from "../../logging/types/index.js";
import { type Logger } from "../../logging/types/logger.js";
import {
    ToolExecutionError
} from "../errors/index.js";
import { ToolServiceLive } from "../tool-service.js";
import { type AnyTool } from "../types/index.js";

// Mock tool for testing
interface TestToolInput {
    message: string;
    count: number;
}

interface TestToolOutput {
    result: string;
    timestamp: number;
}

const createTestTool = (id: string, shouldFail = false): AnyTool => ({
    id,
    name: `Test Tool ${id}`,
    description: "A test tool for testing purposes",
    tags: ["test"],
    inputSchema: z.object({
        message: z.string(),
        count: z.number().int().positive()
    }),
    outputSchema: z.object({
        result: z.string(),
        timestamp: z.number()
    }),
    execute: (input: TestToolInput) => {
        if (shouldFail) {
            return Effect.fail(new ToolExecutionError("Tool execution failed", { toolId: id }));
        }
        return Effect.succeed({
            result: input.message.repeat(input.count),
            timestamp: Date.now()
        });
    }
});

// Mock logging service
const createMockLogger = (): Logger => ({
    log: (message: string, options?: any) => Effect.succeed(undefined),
    debug: (message: string, options?: any) => Effect.succeed(undefined),
    info: (message: string, options?: any) => Effect.succeed(undefined),
    warn: (message: string, options?: any) => Effect.succeed(undefined),
    error: (message: string, options?: any) => Effect.succeed(undefined)
});

const createMockLoggingService = (): ILoggingService => ({
    getLogger: () => Effect.succeed(createMockLogger())
});

// Mock configuration service
const createMockConfigurationService = (): ConfigurationService => ({} as ConfigurationService);

describe("ToolServiceLive", () => {
    let toolService: ToolServiceLive;
    let mockLoggingService: ILoggingService;
    let mockConfigurationService: ConfigurationService;

    beforeEach(() => {
        mockLoggingService = createMockLoggingService();
        mockConfigurationService = createMockConfigurationService();
        toolService = new ToolServiceLive(mockLoggingService, mockConfigurationService);
    });

    describe("registerTool", () => {
        it("should successfully register a new tool", async () => {
            const tool = createTestTool("test-tool-1");

            await Effect.runPromise(toolService.registerTool(tool));

            const registeredTool = await Effect.runPromise(toolService.getTool("test-tool-1"));
            expect(registeredTool).toBe(tool);
        });

        it("should fail when registering a tool with duplicate ID", async () => {
            const tool = createTestTool("test-tool-1");

            await Effect.runPromise(toolService.registerTool(tool));

            await expect(
                Effect.runPromise(toolService.registerTool(tool))
            ).rejects.toThrowError("Tool with ID 'test-tool-1' is already registered.");
        });
    });

    describe("getTool", () => {
        it("should return a registered tool", async () => {
            const tool = createTestTool("test-tool-1");
            await Effect.runPromise(toolService.registerTool(tool));

            const result = await Effect.runPromise(toolService.getTool("test-tool-1"));
            expect(result).toBe(tool);
        });

        it("should fail when getting a non-existent tool", async () => {
            await expect(
                Effect.runPromise(toolService.getTool("non-existent"))
            ).rejects.toThrowError("Tool with ID 'non-existent' not found.");
        });
    });

    describe("listTools", () => {
        it("should list all registered tools when no tags provided", async () => {
            const tool1 = createTestTool("test-tool-1");
            const tool2 = createTestTool("test-tool-2");
            await Effect.runPromise(toolService.registerTool(tool1));
            await Effect.runPromise(toolService.registerTool(tool2));

            const tools = await Effect.runPromise(toolService.listTools());
            expect(tools).toHaveLength(2);
            expect(tools).toContain(tool1);
            expect(tools).toContain(tool2);
        });

        it("should filter tools by tags", async () => {
            const tool1 = { ...createTestTool("test-tool-1"), tags: ["tag1", "tag2"] };
            const tool2 = { ...createTestTool("test-tool-2"), tags: ["tag2", "tag3"] };
            await Effect.runPromise(toolService.registerTool(tool1));
            await Effect.runPromise(toolService.registerTool(tool2));

            const tools = await Effect.runPromise(toolService.listTools({ tags: ["tag1"] }));
            expect(tools).toHaveLength(1);
            expect(tools[0]).toBe(tool1);
        });

        it("should return empty array when no tools match tags", async () => {
            const tool = { ...createTestTool("test-tool-1"), tags: ["tag1"] };
            await Effect.runPromise(toolService.registerTool(tool));

            const tools = await Effect.runPromise(toolService.listTools({ tags: ["non-existent"] }));
            expect(tools).toHaveLength(0);
        });
    });

    describe("invokeTool", () => {
        const validInput: TestToolInput = {
            message: "test",
            count: 3
        };

        it("should successfully invoke a tool with valid input", async () => {
            const tool = createTestTool("test-tool-1");
            await Effect.runPromise(toolService.registerTool(tool));

            const result = await Effect.runPromise(
                toolService.invokeTool<TestToolInput, TestToolOutput>("test-tool-1", validInput)
            );

            expect(result).toEqual({
                result: "testtesttest",
                timestamp: expect.any(Number)
            });
        });

        it("should fail when invoking non-existent tool", async () => {
            await expect(
                Effect.runPromise(toolService.invokeTool("non-existent", validInput))
            ).rejects.toThrowError("Failed to find tool 'non-existent'");
        });

        it("should fail with validation error for invalid input", async () => {
            const tool = createTestTool("test-tool-1");
            await Effect.runPromise(toolService.registerTool(tool));

            const invalidInput = {
                message: "test",
                count: -1 // Should be positive
            };

            await expect(
                Effect.runPromise(toolService.invokeTool("test-tool-1", invalidInput))
            ).rejects.toThrowError("Tool invocation failed due to input validation.");
        });

        it("should propagate tool execution errors", async () => {
            const failingTool = createTestTool("failing-tool", true);
            await Effect.runPromise(toolService.registerTool(failingTool));

            await expect(
                Effect.runPromise(toolService.invokeTool("failing-tool", validInput))
            ).rejects.toThrowError("Tool execution failed for 'failing-tool'.");
        });

        it("should validate tool output", async () => {
            const invalidOutputTool: AnyTool = {
                ...createTestTool("invalid-output-tool"),
                execute: () => Effect.succeed({
                    result: 123, // Should be string
                    timestamp: Date.now()
                } as any)
            };
            await Effect.runPromise(toolService.registerTool(invalidOutputTool));

            await expect(
                Effect.runPromise(toolService.invokeTool("invalid-output-tool", validInput))
            ).rejects.toThrowError("Tool invocation failed due to output validation.");
        });
    });
}); 