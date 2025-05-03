import { EntityParseError } from "@core/errors.js";
import { Config, ConfigProvider, Effect, Ref, Schema as S } from "effect";
import { ProviderConfigError } from "../../errors.js";
import { WorkbenchConfigError } from "./errors.js";
import { Tool, Toolbox, WorkbenchFile } from "./schema.js";

export * from './workbench-service.js';

export class ToolboxService extends Effect.Service<ToolboxService>()(
    "ToolboxService",
    {
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
            };
        })
    }
) { }