import { Effect, HashMap, Layer } from "effect";
/**
 * @file Tests for the Tool Service implementation
 * @module services/ai/tools/__tests__/service
 */
import { describe, expect, it } from "vitest";
import { ToolNotFoundErrorInRegistry } from "../../tool-registry/errors.js";
import { ToolRegistryService } from "../../tool-registry/service.js";
import { ToolExecutionError, ToolInputValidationError, ToolOutputValidationError } from "../errors.js";
import { ToolService } from "../service.js";
import type { EffectiveTool } from "../types.js";
import { badOutputTool } from "./test.mocks.js";

describe("ToolService", () => {
    // Helper to run a tool and check success
    const runToolSuccess = (toolName: string, input: unknown, expectedOutput: unknown) =>
        Effect.gen(function* () {
            const service = yield* ToolService;
            const result = yield* service.run(toolName, input);
            expect(result).toEqual(expectedOutput);
        }).pipe(Effect.provide(ToolService.Default));

    // Helper to run a tool and check error
    const runToolError = (toolName: string, input: unknown, errorType: new (...args: any[]) => Error) =>
        Effect.gen(function* () {
            const service = yield* ToolService;
            const result = yield* Effect.either(service.run(toolName, input));
            expect(result._tag).toBe("Left");
            if (result._tag === "Left") {
                expect(result.left).toBeInstanceOf(errorType);
            }
        }).pipe(Effect.provide(ToolService.Default));

    describe("run", () => {
        // Success cases
        it("should execute a tool successfully", () =>
            runToolSuccess("test:basic:tool", { value: 1 }, { result: 2 })
        );

        // Error cases
        it("should fail when tool is not found", () =>
            runToolError("nonexistent:tool", { value: 1 }, ToolNotFoundErrorInRegistry)
        );

        it("should fail when input validation fails", () =>
            runToolError("test:basic:tool", { invalid: "input" }, ToolInputValidationError)
        );

        it("should fail with empty input", () =>
            runToolError("test:basic:tool", {}, ToolInputValidationError)
        );

        it("should fail with invalid tool name format", () =>
            runToolError("invalid-tool-name", { value: 1 }, ToolNotFoundErrorInRegistry)
        );

        it("should fail with null input", () =>
            runToolError("test:basic:tool", null, ToolInputValidationError)
        );

        it("should fail with undefined input", () =>
            runToolError("test:basic:tool", undefined, ToolInputValidationError)
        );

        it("should fail with output validation error", () =>
            runToolError("badOutput", {}, ToolOutputValidationError)
        );

        it("should fail with unsupported implementation type", () => {
            // Register a tool with an unsupported implementation type
            const unsupportedTool = {
                definition: { name: "unsupported", description: "Unsupported impl" },
                implementation: {
                    _tag: "UnknownImplementation",
                    inputSchema: badOutputTool.implementation.inputSchema,
                    outputSchema: badOutputTool.implementation.outputSchema,
                    execute: () => Effect.succeed({})
                }
            }
            const customRegistryMap = new Map<string, EffectiveTool>([
                ["unsupported", unsupportedTool as unknown as EffectiveTool]
            ])
            const customRegistryData = {
                getTool: (name: string) => {
                    const tool = customRegistryMap.get(name)
                    return tool
                        ? Effect.succeed(tool)
                        : Effect.fail(new ToolNotFoundErrorInRegistry({
                            toolName: name,
                            method: "getTool"
                        }))
                },
                getRegistryData: () => Effect.sync(() => ({
                    tools: HashMap.fromIterable(customRegistryMap),
                    toolkits: HashMap.empty(),
                    _tag: "ToolRegistryData" as const
                })),
                getToolkit: () => Effect.fail(new Error("Not implemented"))
            }
            
            return Effect.gen(function* () {
                const service = yield* ToolService
                const result = yield* Effect.either(service.run("unsupported", {}))
                expect(result._tag).toBe("Left")
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(ToolExecutionError)
                }
            }).pipe(Effect.provide(ToolRegistryService.Default))
        });
    });
});