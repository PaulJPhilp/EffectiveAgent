import { Effect, Either, HashMap, Option } from "effect";
import { describe, expect, it } from "vitest";
import { ToolkitName } from "../../tools/types.js";
import { ToolkitNotFoundErrorInRegistry } from "../errors.js";
import { ToolRegistryService } from "../service.js";

describe("ToolRegistryService", () => {
    describe("getToolkit", () => {
        it("should load a toolkit and convert tools to EffectiveTool format", () =>
            Effect.gen(function* () {
                // Get service instance
                const service = yield* ToolRegistryService;

                // Act
                const toolkitName = "calculator" as ToolkitName;
                const toolkit = yield* service.getToolkit(toolkitName);

                // Assert
                expect(toolkit.name).toBe(toolkitName);
                expect(toolkit.description).toBeDefined();
                expect(toolkit.version).toBeDefined();
                expect(toolkit.tools).toBeInstanceOf(HashMap);

                // Verify calculator/add tool
                const addTool = HashMap.get(toolkit.tools, "add");
                expect(Option.isSome(addTool)).toBe(true);
                if (Option.isSome(addTool)) {
                    expect(addTool.value.definition.name).toBe("calculator/add");
                    expect(addTool.value.definition.description).toBe("Adds two numbers together");
                    expect(addTool.value.definition.version).toBe("1.0.0");
                    expect(addTool.value.definition.tags).toEqual(["math", "calculator"]);
                    expect(addTool.value.definition.author).toBe("EffectiveAgent Team");
                    expect(addTool.value.implementation._tag).toBe("EffectImplementation");
                }
            }).pipe(Effect.provide(ToolRegistryService.Default))
        );

        it("should fail with ToolkitNotFoundErrorInRegistry for non-existent toolkit", () =>
            Effect.gen(function* () {
                // Get service instance
                const service = yield* ToolRegistryService;

                // Act & Assert
                const nonExistentToolkit = "nonexistent" as ToolkitName;
                const result = yield* Effect.either(service.getToolkit(nonExistentToolkit));
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ToolkitNotFoundErrorInRegistry);
                    if (result.left instanceof ToolkitNotFoundErrorInRegistry) {
                        const params = result.left as unknown as { toolkitName: string };
                        expect(params.toolkitName).toBe(nonExistentToolkit);
                    }
                }
            }).pipe(Effect.provide(ToolRegistryService.Default))
        );

        it("should properly convert different implementation types", () =>
            Effect.gen(function* () {
                // Get service instance
                const service = yield* ToolRegistryService;

                // Act
                const toolkitName = "mixed" as ToolkitName;
                const toolkit = yield* service.getToolkit(toolkitName);

                // Assert
                const tools = toolkit.tools;

                // Check Effect implementation
                const addTool = HashMap.get(tools, "add");
                expect(Option.isSome(addTool) && addTool.value.implementation._tag).toBe("EffectImplementation");

                // Check HTTP implementation
                const httpTool = HashMap.get(tools, "get");
                expect(Option.isSome(httpTool) && httpTool.value.implementation._tag).toBe("HttpImplementation");
                if (Option.isSome(httpTool) && httpTool.value.implementation._tag === "HttpImplementation") {
                    expect(httpTool.value.implementation.method).toBe("GET");
                }

                // Check MCP implementation
                const mcpTool = HashMap.get(tools, "chat");
                expect(Option.isSome(mcpTool) && mcpTool.value.implementation._tag).toBe("McpImplementation");
                if (Option.isSome(mcpTool) && mcpTool.value.implementation._tag === "McpImplementation") {
                    expect(mcpTool.value.implementation.slug).toBe("chat");
                }
            }).pipe(Effect.provide(ToolRegistryService.Default))
        );

        it("should maintain schema information in converted tools", () =>
            Effect.gen(function* () {
                // Get service instance
                const service = yield* ToolRegistryService;

                // Act
                const toolkitName = "calculator" as ToolkitName;
                const toolkit = yield* service.getToolkit(toolkitName);

                // Assert
                const addTool = HashMap.get(toolkit.tools, "add");
                expect(Option.isSome(addTool)).toBe(true);
                if (Option.isSome(addTool)) {
                    // Verify tool structure
                    expect(addTool.value.definition.name).toBe("calculator/add");
                    expect(addTool.value.definition.description).toBe("Adds two numbers together");
                    expect(addTool.value.definition.version).toBe("1.0.0");
                    expect(addTool.value.definition.tags).toEqual(["math", "calculator"]);
                    expect(addTool.value.definition.author).toBe("EffectiveAgent Team");
                }
            }).pipe(Effect.provide(ToolRegistryService.Default))
        );
    });
});
