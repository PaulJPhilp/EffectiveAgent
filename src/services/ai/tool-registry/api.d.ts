/**
 * @file Service contract for the ToolRegistryService.
 * @module services/ai/tool-registry/api
 */
import { EffectiveTool, EffectiveToolkit } from "@/types.js";
import { Effect } from "effect";
import type { FullToolName, ToolRegistryData, ToolkitName } from "../tools/types.js";
import type { ToolNotFoundErrorInRegistry, ToolRegistryError, ToolkitNotFoundErrorInRegistry } from "./errors.js";
/**
 * Service contract for managing and accessing the tool registry.
 * This includes both internal tools (standard library) and project-specific tools.
 */
export interface ToolRegistry {
    /**
     * Retrieves the fully merged tool registry data.
     * This data includes all tools and toolkits from various sources
     * (internal, project, organization).
     */
    readonly getRegistryData: () => Effect.Effect<ToolRegistryData, ToolRegistryError>;
    /**
     * Retrieves a specific tool by its fully qualified name from the registry.
     */
    readonly getTool: (toolName: FullToolName) => Effect.Effect<EffectiveTool, ToolNotFoundErrorInRegistry | ToolRegistryError>;
    /**
     * Retrieves a specific toolkit by its name from the registry.
     */
    readonly getToolkit: (toolkitName: ToolkitName) => Effect.Effect<EffectiveToolkit, ToolkitNotFoundErrorInRegistry | ToolRegistryError>;
    /**
     * Lists all available tools in the registry.
     * Returns an array of fully qualified tool names.
     */
    readonly listTools: () => Effect.Effect<FullToolName[], ToolRegistryError>;
}
//# sourceMappingURL=api.d.ts.map