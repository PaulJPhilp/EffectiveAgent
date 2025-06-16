import { EffectiveTool, ToolExecutionError } from "@/types.js";
import { Effect, HashMap } from "effect";
import { ConfigurationService } from "../../core/configuration/service.js";
import { FullToolName, SimpleToolName } from "../tools/schema.js";
import { ToolImplementation, ToolkitName, ToolRegistryApi } from "../tools/types.js";
import { ToolRegistry } from "./api.js";
import { ToolNotFoundErrorInRegistry, ToolkitNotFoundErrorInRegistry } from "./errors.js";
import { ToolkitSchema } from "./schema.js";

/**
 * Service implementation for managing and providing access to the tool registry.
 * This includes both internal tools (standard library) and project-specific tools.
 */

export class ToolRegistryService extends Effect.Service<ToolRegistry>()(
    "ToolRegistryService",
    {
        effect: Effect.gen(function* () {
            // Get dependencies
            const configuration = yield* ConfigurationService;

            // Helper to read tool registry
            const readToolRegistry = (path: string) => Effect.gen(function* () {
                // First load and validate the toolkit schema
                const toolkit = yield* configuration.loadConfig(path, ToolkitSchema);

                // Then construct and validate the registry schema
                const registry = {
                    toolkits: {
                        [path]: toolkit
                    }
                };
                return yield* Effect.succeed(registry);
            });

            // Return implementation object with all API methods
            return {
                getRegistryData: () => Effect.gen(function* () {
                    return yield* readToolRegistry("standard");
                }),

                getTool: (toolName: FullToolName) => Effect.gen(function* () {
                    // FullToolName should be in the form "toolkitName.toolName"
                    const splitIdx = toolName.indexOf(".");
                    if (splitIdx === -1) {
                        return yield* Effect.fail(new ToolNotFoundErrorInRegistry({
                            toolName,
                            method: "getTool"
                        }));
                    }
                    const toolkitName = toolName.slice(0, splitIdx);
                    const specificToolName = toolName.slice(splitIdx + 1);
                    if (!toolkitName || !specificToolName) {
                        return yield* Effect.fail(new ToolNotFoundErrorInRegistry({
                            toolName,
                            method: "getTool"
                        }));
                    }
                    // Read the toolkit (registry) data
                    const registryData = yield* readToolRegistry(toolkitName);
                    // Get the toolkit from registry data
                    const toolkit = registryData.toolkits[toolkitName];
                    if (!toolkit) {
                        return yield* Effect.fail(new ToolNotFoundErrorInRegistry({
                            toolName,
                            method: "getTool"
                        }));
                    }
                    const found = toolkit.tools[specificToolName];
                    if (!found) {
                        return yield* Effect.fail(new ToolNotFoundErrorInRegistry({
                            toolName,
                            method: "getTool"
                        }));
                    }
                    return found;
                }),

                getToolkit: (toolkitName: ToolkitName) => Effect.gen(function* () {
                    // Read the toolkit data
                    const registryData = yield* readToolRegistry(toolkitName);

                    // Get the toolkit from registry data
                    const toolkit = registryData.toolkits[toolkitName];
                    if (!toolkit) {
                        return yield* Effect.fail(new ToolkitNotFoundErrorInRegistry({
                            toolkitName,
                            method: "getToolkit"
                        }));
                    }

                    // Convert the tools Map to a HashMap, transforming Tool to EffectiveTool
                    let toolsHashMap = HashMap.empty<SimpleToolName, EffectiveTool>();
                    Object.entries(toolkit.tools).forEach(([name, tool]) => {
                        // Convert Tool to EffectiveTool format
                        const effectiveTool: EffectiveTool = {
                            name: tool.metadata.name,
                            description: tool.metadata.description,
                            parameters: {
                                input: {
                                    type: "object",
                                    description: "Input parameters for the tool",
                                    required: true
                                }
                            },
                            execute: <Output>(input: Record<string, unknown>) => Effect.gen(function* () {
                                const impl = tool.implementation as ToolImplementation;
                                if (impl._tag !== "EffectImplementation") {
                                    return yield* Effect.fail(new ToolExecutionError(
                                        `Unsupported implementation type: ${impl._tag}`,
                                        "ToolRegistryService",
                                        "execute"
                                    ));
                                }
                                return yield* Effect.mapError(
                                    impl.execute(input) as Effect.Effect<Output>,
                                    (error) => new ToolExecutionError(
                                        `Tool execution failed: ${tool.metadata.name}`,
                                        "ToolRegistryService",
                                        "execute",
                                        error
                                    )
                                );
                            })
                        };
                        toolsHashMap = HashMap.set(toolsHashMap, name, effectiveTool);
                    });

                    // Get toolkit metadata from the first tool if available
                    const firstTool = Object.values(toolkit.tools)[0];
                    const metadata = firstTool?.metadata || {
                        name: toolkitName,
                        description: "",
                        version: "0.0.1",
                        tags: [],
                        author: "system"
                    };

                    // Return the toolkit
                    return {
                        name: toolkitName,
                        description: metadata.description,
                        version: metadata.version,
                        tools: toolsHashMap,
                        dependencies: {}, // Optional package.json style dependencies
                        config: {}      // Optional shared configuration
                    };
                }),

                listTools: () => Effect.gen(function* () {
                    // Read all registered toolkits
                    const registryData = yield* readToolRegistry("standard");
                    const tools: FullToolName[] = [];

                    // Iterate through each toolkit and its tools
                    Object.entries(registryData.toolkits).forEach(([toolkitName, toolkit]) => {
                        Object.keys(toolkit.tools).forEach(toolName => {
                            tools.push(`${toolkitName}:${toolName}` as FullToolName);
                        });
                    });

                    return tools;
                })
            };
        })
    }
) { }