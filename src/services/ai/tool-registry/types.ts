import { Effect, HashMap } from "effect";
import {
    SimpleToolName as SchemaSimpleToolName
} from "../tools/schema.js";
import {
    ToolRegistryData as ActualToolRegistryData,
    EffectiveTool,
    EffectiveToolkit,
    FullToolName,
    ToolDefinition,
    ToolkitName,
} from "../tools/types.js";
import type {
    ToolNotFoundErrorInRegistry,
    ToolRegistryError,
    ToolkitNotFoundErrorInRegistry,
} from "./errors.js";


export type ToolRegistryData = ActualToolRegistryData;

// Type for project workspace data, aliasing from the shared tools/types
export interface ProjectWorkspaceData {
    readonly workspace: ActualToolRegistryData;
    readonly tools: HashMap.HashMap<FullToolName, EffectiveTool>;
    readonly toolkits: HashMap.HashMap<ToolkitName, EffectiveToolkit>;
}

// Helper type for the internal toolbox, aliasing from shared tools/types
export type InternalToolboxData = HashMap.HashMap<string, EffectiveTool>;

// Re-export SimpleToolName if needed by the service API or consumers
export type SimpleToolName = SchemaSimpleToolName;
export type { ToolDefinition }; // Re-export ToolDefinition if needed

/**
 * Defines the API for the ToolRegistryService.
 */
export interface ToolRegistry {
    /**
     * Retrieves the fully merged tool registry data.
     * This data includes all tools and toolkits from various sources
     * (internal, project, organization).
     */
    readonly getRegistryData: () => Effect.Effect<
        ToolRegistryData,
        ToolRegistryError
    >;

    /**
     * Retrieves a specific tool by its fully qualified name from the registry.
     */
    readonly getTool: (
        toolName: FullToolName,
    ) => Effect.Effect<
        EffectiveTool,
        ToolNotFoundErrorInRegistry | ToolRegistryError
    >;

    /**
     * Retrieves a specific toolkit by its name from the registry.
     */
    readonly getToolkit: (
        toolkitName: ToolkitName,
    ) => Effect.Effect<
        EffectiveToolkit,
        ToolkitNotFoundErrorInRegistry | ToolRegistryError
    >;
}
