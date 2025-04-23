
import { Config, ConfigProvider, Effect, Ref, Schema as S } from "effect";
import { ProviderConfigError } from "../ai/provider/errors.js";
import { EntityParseError } from "../core/errors.js";
import { WorkbenchConfigError } from "./errors.js";
import { Tool, Toolbox, WorkbenchFile } from "./schema.js";

export class ToolboxService extends Effect.Service<ToolboxService>()("ToolboxService", {
    effect: Effect.gen(function* () {
        let toolboxRef: Ref.Ref<Toolbox>;
        return {
            build: (toolbox: Toolbox) => {
                return Effect.gen(function* () {
                    toolboxRef = yield* Ref.make<Toolbox>(toolbox);
                    return toolbox;
                });
            },
            addTool: (tool: Tool): Effect.Effect<Tool> =>
                toolboxRef.modify((currentToolbox: Toolbox) => {
                    const updatedToolbox: Toolbox = { ...currentToolbox, tools: [...currentToolbox.tools, tool] };
                    return [tool, updatedToolbox] as const;
                }),
            addTools: (tools: Tool[]): Effect.Effect<Tool[]> =>
                toolboxRef.modify((currentToolbox: Toolbox) => {
                    const updatedToolbox: Toolbox = { ...currentToolbox, tools: [...currentToolbox.tools, ...tools] };
                    return [tools, updatedToolbox] as const;
                }),
            getTools: () => toolboxRef.get,
            getTool: (tool: string): Effect.Effect<Tool | undefined> => {
                return toolboxRef.get.pipe(
                    Effect.map((toolbox) => toolbox.tools.find((t) => t.name === tool))
                );
            }
        }
    })
}) { }

export class WorkbenchService extends Effect.Service<WorkbenchService>()("WorkbenchService", {

    effect: Effect.gen(function* () {
        let workbenchRef: Ref.Ref<WorkbenchFile>;
        return {
            load: () => {
                return Effect.gen(function* () {
                    const configProvider = yield* ConfigProvider.ConfigProvider;
                    const rawConfig = yield* configProvider.load(Config.string("workbench")).pipe(
                        Effect.mapError(cause => new WorkbenchConfigError({
                            message: "Failed to load model config",
                            cause: new EntityParseError({
                                filePath: "models.json",
                                cause
                            })
                        }))
                    );

                    const parsedConfig = Effect.try({
                        try: () => JSON.parse(rawConfig),
                        catch: (error) => {
                            throw new ProviderConfigError({
                                message: "Failed to parse model config",
                                cause: new EntityParseError({
                                    filePath: "models.json",
                                    cause: error
                                })
                            });
                        }
                    });

                    // 2. Load and validate config using the schema directly
                    const data = yield* parsedConfig
                    const validConfig = yield* S.decode(WorkbenchFile)(data).pipe(
                        Effect.mapError(cause => new WorkbenchConfigError({
                            message: "Failed to validate model config",
                            cause: new EntityParseError({
                                filePath: "models.json",
                                cause
                            })
                        }))
                    );

                    workbenchRef = yield* Ref.make<WorkbenchFile>(validConfig);
                    return validConfig;
                });
            },
            getWorkbench: () => workbenchRef.get,
            getToolbox: (toolboxName: string) => {
                return workbenchRef.get.pipe(Effect.map((WorkbenchFile: WorkbenchFile) => WorkbenchFile.toolboxes.find((t) => t.name === toolboxName)))
            }
        }
    })
}) { }