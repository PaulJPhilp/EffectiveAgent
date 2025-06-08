import { EffectiveTool } from "@/types.js";
import { Effect, HashMap } from "effect";
import { FullToolName } from "../tools/schema.js";
import { ToolkitName } from "../tools/types.js";
import { ToolRegistry } from "./api.js";
import { ToolNotFoundErrorInRegistry, ToolkitNotFoundErrorInRegistry } from "./errors.js";
import { ToolkitSchema } from "./schema.js";
declare const ToolRegistryService_base: Effect.Service.Class<ToolRegistry, "ToolRegistryService", {
    readonly effect: Effect.Effect<{
        getRegistryData: (fullPath: string) => Effect.Effect<{
            toolkits: {
                [x: string]: ToolkitSchema;
            };
        }, import("@/services/core/configuration/errors.js").ConfigReadError | import("@/services/core/configuration/errors.js").ConfigParseError | import("@/services/core/configuration/errors.js").ConfigValidationError, never>;
        getTool: (toolName: FullToolName) => Effect.Effect<import("./schema.js").RegistryToolSchema, import("@/services/core/configuration/errors.js").ConfigReadError | import("@/services/core/configuration/errors.js").ConfigParseError | import("@/services/core/configuration/errors.js").ConfigValidationError | ToolNotFoundErrorInRegistry, never>;
        getToolkit: (toolkitName: ToolkitName) => Effect.Effect<{
            name: string;
            description: string;
            version: string;
            tools: HashMap.HashMap<string, EffectiveTool>;
            dependencies: {};
            config: {};
        }, import("@/services/core/configuration/errors.js").ConfigReadError | import("@/services/core/configuration/errors.js").ConfigParseError | import("@/services/core/configuration/errors.js").ConfigValidationError | ToolkitNotFoundErrorInRegistry, never>;
        listTools: () => Effect.Effect<string[], import("@/services/core/configuration/errors.js").ConfigReadError | import("@/services/core/configuration/errors.js").ConfigParseError | import("@/services/core/configuration/errors.js").ConfigValidationError, never>;
    }, never, import("@/services/core/configuration/api.js").ConfigurationServiceApi>;
}>;
/**
 * Service implementation for managing and providing access to the tool registry.
 * This includes both internal tools (standard library) and project-specific tools.
 */
export declare class ToolRegistryService extends ToolRegistryService_base {
}
export {};
//# sourceMappingURL=service.d.ts.map