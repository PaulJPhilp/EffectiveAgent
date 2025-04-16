/**
 * @file Tests for the ToolboxService and WorkbenchService implementations.
 */

import assert from "node:assert";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Cause, ConfigProvider, Effect, Exit, Layer, Option } from "effect";
import { describe, expect, it } from "vitest";
import { WorkbenchConfigError } from "../errors.js";
import { Tool, Toolbox, WorkbenchFile } from "../schema.js";
import { ToolboxService, WorkbenchService } from "../service.js";

describe("Toolbox Services", () => {
    // Create test layer that provides mock config
    const testConfigLayer = Layer.succeed(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromMap(new Map([
            ["workbench", JSON.stringify({
                name: "test-workbench",
                description: "Test workbench for toolbox service tests",
                toolboxes: [
                    {
                        name: "math-tools",
                        description: "Mathematical tools",
                        tools: [
                            {
                                name: "calculator",
                                description: "Basic calculator tool",
                                input_schema: {
                                    type: "object",
                                    properties: { expression: { type: "string" } }
                                },
                                output_schema: {
                                    type: "object",
                                    properties: { result: { type: "number" } }
                                }
                            }
                        ]
                    }
                ]
            })]
        ]))
    );

    it("should build a toolbox successfully", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* ToolboxService;
            const toolbox = new Toolbox({
                name: "test-toolbox",
                description: "Test toolbox",
                tools: [
                    new Tool({
                        name: "test-tool",
                        description: "A test tool",
                        input_schema: { type: "object", properties: {} },
                        output_schema: { type: "object", properties: {} }
                    })
                ]
            });

            // Build the toolbox
            const built = yield* service.build(toolbox);
            expect(built.name).toBe("test-toolbox");
            expect(built.tools).toHaveLength(1);
            expect(built.tools[0].name).toBe("test-tool");

            // Test getTools
            const tools = yield* service.getTools();
            expect(tools).toBeDefined();
            expect(tools.tools).toHaveLength(1);
            expect(tools.tools[0].name).toBe("test-tool");
            // Test getTool
            const name = "test-tool";
            const tool = yield* service.getTool(name);
            expect(name).toBe("test-tool");
            expect(tool).toBeDefined();
            expect(tool?.name).toBe("test-tool");

            // Test addTool
            const newTool = new Tool({
                name: "another-tool",
                description: "Another test tool",
                input_schema: { type: "object", properties: {} },
                output_schema: { type: "object", properties: {} }
            });
            const added = yield* service.addTool(newTool);
            expect(added.name).toBe("another-tool");

            // Verify tool was added
            const toolsAfterAdd = yield* service.getTools();
            expect(toolsAfterAdd.tools).toHaveLength(2);

            return built;
        });

        const runnable = Effect.provide(effect, testConfigLayer)
        const layer = ToolboxService.Default
        const provided = Effect.provide(runnable, layer)
        await Effect.runPromise(provided);
    });


    it("should successfully add multiple tools in batch", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* ToolboxService;
            const toolbox = new Toolbox({
                name: "test-toolbox",
                description: "Test toolbox",
                tools: []
            });

            yield* service.build(toolbox);

            const newTools = [
                new Tool({
                    name: "tool1",
                    description: "Tool 1",
                    input_schema: { type: "object", properties: {} },
                    output_schema: { type: "object", properties: {} }
                }),
                new Tool({
                    name: "tool2",
                    description: "Tool 2",
                    input_schema: { type: "object", properties: {} },
                    output_schema: { type: "object", properties: {} }
                })
            ];

            const added = yield* service.addTools(newTools);
            expect(added).toHaveLength(2);

            const toolsAfterAdd = yield* service.getTools();
            expect(toolsAfterAdd.tools).toHaveLength(2);

            const tool1 = yield* service.getTool("tool1");
            expect(tool1).toBeDefined();
            assert(tool1 !== undefined);
            expect(tool1?.name).toBe("tool1");

            const tool2 = yield* service.getTool("tool2")
            expect(tool2).toBeDefined();
            expect(tool2?.name).toBe("tool2");
        });

        const runnable = Effect.provide(effect, testConfigLayer)
        const layer = ToolboxService.Default
        const provided = Effect.provide(runnable, layer)
        await Effect.runPromise(provided);
    });

    it("should return undefined for non-existent tool", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* ToolboxService;
            const toolbox = new Toolbox({
                name: "test-toolbox",
                description: "Test toolbox",
                tools: []
            });

            yield* service.build(toolbox);
            const tool = yield* service.getTool("non-existent");
            expect(tool).toBeUndefined();
        });

        const runnable = Effect.provide(effect, testConfigLayer)
        const layer = ToolboxService.Default
        const provided = Effect.provide(runnable, layer)
        await Effect.runPromise(provided);
    });
});

describe("WorkbenchService", () => {
    it("should load workbench configuration successfully", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* WorkbenchService;
            const workbench = yield* service.load();

            expect(workbench.name).toBe("test-workbench");
            expect(workbench.toolboxes).toHaveLength(1);
            expect(workbench.toolboxes[0].name).toBe("math-tools");

            // Test getWorkbench
            const loaded = yield* service.getWorkbench();
            expect(loaded.name).toBe("test-workbench");

            // Test getToolbox
            const toolbox = yield* service.getToolbox("math-tools");
            expect(toolbox).toBeDefined();
            expect(toolbox?.name).toBe("math-tools");
            expect(toolbox?.tools[0].name).toBe("calculator");

            return workbench;
        });

        const validConfigLayer = Layer.succeed(
            ConfigProvider.ConfigProvider,
            ConfigProvider.fromMap(new Map([
                ["workbench", JSON.stringify({
                    name: "test-workbench",
                    description: "Test workbench for toolbox service tests",
                    toolboxes: [
                        {
                            name: "math-tools",
                            description: "Mathematical tools",
                            tools: [
                                {
                                    name: "calculator",
                                    description: "Basic calculator tool",
                                    input_schema: {
                                        type: "object",
                                        properties: { expression: { type: "string" } }
                                    },
                                    output_schema: {
                                        type: "object",
                                        properties: { result: { type: "number" } }
                                    }
                                },
                                {
                                    name: "advanced-calculator",
                                    description: "Advanced calculator tool",
                                    input_schema: {
                                        type: "object",
                                        properties: { expression: { type: "string" } }
                                    },
                                    output_schema: {
                                        type: "object",
                                        properties: { result: { type: "number" } }
                                    }
                                }
                            ]
                        }
                    ]
                })]
            ]))
        );


        const runnable = Effect.provide(effect, validConfigLayer)
        const layer = WorkbenchService.Default
        const provided = Effect.provide(runnable, layer)
        await Effect.runPromise(provided);
    });

    it("should fail with WorkbenchConfigError if config is invalid", async () => {
        // Create layer with invalid config
        const invalidConfigLayer = Layer.succeed(
            ConfigProvider.ConfigProvider,
            ConfigProvider.fromMap(new Map([
                // Intentionally invalid JSON for testing error handling
                ["workbench", "invalid json"]
            ]))
        );

        const effect = Effect.gen(function* () {
            const service = yield* WorkbenchService;
            return yield* service.load();
        });

        const runnable = Effect.provide(effect, invalidConfigLayer)
        const layer = WorkbenchService.Default
        const provided = Effect.provide(runnable, layer)
        const exit = await Effect.runPromiseExit(provided);

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isSuccess(exit)) {
            throw new Error("Expected failure but got success");
        }
        const error = Cause.failureOption(exit.cause);
        console.log("Error:", JSON.stringify(error, null, 2));
        expect(Option.isSome(error)).toBe(false);
    });

    it("should validate schema of loaded workbench", async () => {
        const invalidToolboxLayer = Layer.succeed(
            ConfigProvider.ConfigProvider,
            ConfigProvider.fromMap(new Map([
                ["workbench", JSON.stringify({
                    name: "test-workbench",
                    toolboxes: [
                        {
                            description: "Invalid toolbox",
                            tools: []
                        }
                    ]
                })]]
            ))
        );

        const effect = Effect.gen(function* () {
            const service = yield* WorkbenchService;
            return yield* service.load();
        });

        const runnable = Effect.provide(effect, invalidToolboxLayer)
        const layer = WorkbenchService.Default
        const provided = Effect.provide(runnable, layer)
        const exit = await Effect.runPromiseExit(provided);

        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isFailure(exit)) {
            const error = Cause.failureOption(exit.cause);
            expect(Option.isSome(error)).toBe(true);
            const value = Option.getOrThrow(error);
            expect(value).toBeInstanceOf(WorkbenchConfigError);
        }
    });
});