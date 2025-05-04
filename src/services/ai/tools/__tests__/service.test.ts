/**
 * @file Tests for the Tool Service implementation
 * @module services/ai/tools/__tests__/service
 */

import { createServiceTestHarness } from "@/services/core/test-harness/utils/service-test.js";
import { Effect, Schema as S } from "effect";
import { describe, expect, it } from "vitest";
import { ToolService } from "../api.js";
import {
    ToolExecutionError,
    ToolInputValidationError,
    ToolNotFoundError,
    ToolOutputValidationError
} from "../errors.js";
import { type ToolRegistryData } from "../types.js";

// Test schemas
const TestInputSchema = S.Struct({
    value: S.Number
});

const TestOutputSchema = S.Struct({
    result: S.Number
});

// Complex schemas for edge cases
const ComplexInputSchema = S.Struct({
    value: S.Number,
    options: S.Struct({
        multiplier: S.Number,
        mode: S.Literal("add", "multiply")
    })
});

const ComplexOutputSchema = S.Struct({
    result: S.Number,
    metadata: S.Struct({
        operation: S.String,
        timestamp: S.Number
    })
});

// Create test implementation
const createTestImpl = () => Effect.gen(function* () {
    // Mock registry data
    const mockRegistry: ToolRegistryData = {
        tools: new Map([
            ["test:effect:tool", {
                name: "test:effect:tool",
                type: "effect",
                definition: Effect.succeed({ result: 1 }),
                inputSchema: TestInputSchema,
                outputSchema: TestOutputSchema
            }],
            ["test:http:tool", {
                name: "test:http:tool",
                type: "http",
                url: "http://example.com",
                method: "POST",
                inputSchema: TestInputSchema,
                outputSchema: TestOutputSchema
            }],
            ["test:mcp:tool", {
                name: "test:mcp:tool",
                type: "mcp",
                slug: "test-tool",
                inputSchema: TestInputSchema,
                outputSchema: TestOutputSchema
            }],
            ["complex:tool", {
                name: "complex:tool",
                type: "effect",
                definition: Effect.succeed({
                    result: 15,
                    metadata: {
                        operation: "multiply",
                        timestamp: Date.now()
                    }
                }),
                inputSchema: ComplexInputSchema,
                outputSchema: ComplexOutputSchema
            }]
        ])
    };

    return {
        execute: (toolName: string, input: unknown) => Effect.gen(function* () {
            const tool = mockRegistry.tools.get(toolName);
            if (!tool) {
                return yield* Effect.fail(new ToolNotFoundError({
                    toolName,
                    module: "ToolService",
                    method: "execute"
                }));
            }

            // Validate input
            const validInput = yield* Effect.try({
                try: () => S.decodeSync(tool.inputSchema)(input),
                catch: (cause) => new ToolInputValidationError({
                    toolName,
                    module: "ToolService",
                    method: "execute",
                    cause
                })
            });

            // Execute based on type
            let result;
            switch (tool.type) {
                case "effect":
                    result = yield* tool.definition;
                    break;
                case "http":
                    result = { result: validInput.value * 2 };
                    break;
                case "mcp":
                    result = { result: validInput.value * 3 };
                    break;
                default:
                    return yield* Effect.fail(new ToolExecutionError({
                        toolName,
                        input,
                        module: "ToolService",
                        method: "execute",
                        cause: new Error("Unsupported tool type")
                    }));
            }

            // Validate output
            return yield* Effect.try({
                try: () => S.decodeSync(tool.outputSchema)(result),
                catch: (cause) => new ToolOutputValidationError({
                    toolName,
                    module: "ToolService",
                    method: "execute",
                    cause
                })
            });
        })
    };
});

// Create test harness
const testHarness = createServiceTestHarness(ToolService, createTestImpl);

describe("ToolService", () => {
    describe("execute", () => {
        it("should execute an Effect-based tool", () => {
            const program = Effect.gen(function* () {
                const service = yield* ToolService;
                const result = yield* service.execute("test:effect:tool", { value: 42 });
                expect(result).toEqual({ result: 1 });
            });

            return testHarness.runTest(program);
        });

        it("should execute an HTTP-based tool", () => {
            const program = Effect.gen(function* () {
                const service = yield* ToolService;
                const result = yield* service.execute("test:http:tool", { value: 42 });
                expect(result).toEqual({ result: 84 });
            });

            return testHarness.runTest(program);
        });

        it("should execute an MCP-based tool", () => {
            const program = Effect.gen(function* () {
                const service = yield* ToolService;
                const result = yield* service.execute("test:mcp:tool", { value: 42 });
                expect(result).toEqual({ result: 126 });
            });

            return testHarness.runTest(program);
        });

        it("should validate input against schema", () => {
            const program = Effect.gen(function* () {
                const service = yield* ToolService;
                return yield* service.execute("test:effect:tool", { value: "not a number" });
            });

            return testHarness.expectError(program, "ToolInputValidationError");
        });

        it("should validate output against schema", () => {
            const program = Effect.gen(function* () {
                const service = yield* ToolService;
                return yield* service.execute("test:effect:tool", { value: 42 });
            });

            return testHarness.expectError(program, "ToolOutputValidationError");
        });

        it("should handle tool not found", () => {
            const program = Effect.gen(function* () {
                const service = yield* ToolService;
                return yield* service.execute("non:existent:tool", { value: 42 });
            });

            return testHarness.expectError(program, "ToolNotFoundError");
        });

        it("should handle complex input and output schemas", () => {
            const program = Effect.gen(function* () {
                const service = yield* ToolService;
                const result = yield* service.execute("complex:tool", {
                    value: 5,
                    options: {
                        multiplier: 3,
                        mode: "multiply"
                    }
                });
                expect(result).toEqual({
                    result: 15,
                    metadata: {
                        operation: "multiply",
                        timestamp: expect.any(Number)
                    }
                });
            });

            return testHarness.runTest(program);
        });
    });
}); 