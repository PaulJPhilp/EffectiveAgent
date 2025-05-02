import { Config, ConfigProvider, Effect, Schema as S } from "effect";
import { EntityParseError } from "@core/errors.js";
import { WorkbenchConfigError } from "./errors.js";
import { Tool, Toolbox, WorkbenchFile } from "./schema.js";
import { ToolboxService } from "./service.js";

export interface WorkbenchServiceApi {
    load: () => Effect.Effect<WorkbenchFile, WorkbenchConfigError>;
    getToolbox: (name: string) => Effect.Effect<Toolbox | undefined, WorkbenchConfigError>;
}

export class WorkbenchService extends Effect.Service<WorkbenchServiceApi>()(
    "WorkbenchService",
    {
        effect: Effect.gen(function* () {
            const config = yield* ConfigProvider.ConfigProvider;
            
            return {
                load: () => Effect.gen(function* () {
                    const workbenchConfig = yield* config.load(Config.string("workbench"));
                    if (!workbenchConfig) {
                        return yield* Effect.fail(
                            new WorkbenchConfigError({
                                description: "No workbench configuration found",
                                module: "WorkbenchService",
                                method: "load"
                            })
                        );
                    }

                    try {
                        const workbench = JSON.parse(workbenchConfig);
                        const workbenchFile = new WorkbenchFile(workbench);
                        return workbenchFile;
                    } catch (error) {
                        return yield* Effect.fail(
                            new WorkbenchConfigError({
                                description: `Failed to parse workbench configuration: ${error}`,
                                module: "WorkbenchService",
                                method: "load"
                            })
                        );
                    }
                }),

            
                getToolbox: (name: string) => Effect.gen(function* () {
                    const service = yield* WorkbenchService;
                    const workbenchFile = yield* service.load();
                    return workbenchFile.toolboxes.find((t: Toolbox) => t.name === name);
                })
            };
        })
    }
) { }
