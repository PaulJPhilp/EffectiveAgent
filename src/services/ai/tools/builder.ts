/**
 * @file Provides builders for creating EffectiveToolboxes and EffectiveWorkspaces.
 * @module services/tools/builder
 */

import { HashMap } from "effect";
import { SimpleToolName } from "./schema.js";
// Import necessary types from the main types file
import {
    type EffectiveTool,
    type EffectiveToolbox,
    type EffectiveWorkspace,
    type NamespaceName,
} from "./types.js"; // Adjust path if builder is in a different location relative to types.ts

/**
 * Builder for a single namespaced EffectiveToolbox.
 * Collects tools for a specific namespace and outputs an EffectiveToolbox map.
 */
export class EffectiveToolboxBuilder {
    // Internal state: HashMap to store tools for this namespace
    private tools = HashMap.empty<SimpleToolName, EffectiveTool>();

    /**
     * @param namespace The name of the toolbox namespace being built.
     */
    constructor(readonly namespace: NamespaceName) {
        if (!namespace || typeof namespace !== 'string' || namespace.trim().length === 0) {
            throw new Error("Toolbox namespace cannot be empty.");
        }
        // Consider adding validation for namespace format if needed (e.g., no slashes)
    }

    /**
     * Adds an EffectiveTool to this specific toolbox namespace.
     * Assumes the 'name' in the tool's definition is the simple name.
     * If a tool with the same simple name already exists, it will be overwritten,
     * and a warning will be logged.
     *
     * @param tool The complete EffectiveTool object to add.
     * @returns The builder instance for chaining.
     */
    addTool(tool: EffectiveTool): this {
        // Ensure the provided tool object is valid (basic check)
        if (!tool || !tool.definition || !tool.implementation) {
            console.error("Invalid tool object passed to addTool:", tool);
            throw new Error("Attempted to add invalid tool object.");
        }
        const simpleName = tool.definition.name;
        if (!simpleName || typeof simpleName !== 'string' || simpleName.includes('/')) {
            console.error("Invalid simple tool name in definition:", tool.definition);
            throw new Error(`Tool definition must have a valid simple name (no slashes): "${simpleName}"`);
        }

        // Check for overrides
        if (HashMap.has(this.tools, simpleName)) {
            // Use console.warn for non-critical warnings during build time
            console.warn(`Tool "${simpleName}" in namespace "${this.namespace}" is overriding a previously added tool with the same name.`);
        }

        // Add the tool to the internal map
        this.tools = HashMap.set(this.tools, simpleName, tool);
        return this; // Return this for chaining .addTool calls
    }

    /**
     * Builds and returns the HashMap representing this toolbox.
     * @returns EffectiveToolbox (HashMap<SimpleToolName, EffectiveTool>)
     */
    build(): EffectiveToolbox {
        // Simply return the collected HashMap
        return this.tools;
    }
}

/**
 * Builder for the Project EffectiveWorkspace (collection of Toolboxes).
 * Outputs an EffectiveWorkspace map (Map<NamespaceName, EffectiveToolbox>).
 */
export class EffectiveWorkspaceBuilder {
    // Internal state: Map to store namespace builders
    private namespaceBuilders = new Map<NamespaceName, EffectiveToolboxBuilder>();

    /**
     * Accesses or creates a builder for a specific namespace toolbox.
     *
     * @param name The name of the namespace toolbox.
     * @returns An EffectiveToolboxBuilder for the specified namespace.
     */
    toolbox(name: NamespaceName): EffectiveToolboxBuilder {
        if (!this.namespaceBuilders.has(name)) {
            // Create a new toolbox builder if it doesn't exist
            this.namespaceBuilders.set(name, new EffectiveToolboxBuilder(name));
        }
        // Return the existing or new builder
        return this.namespaceBuilders.get(name)!;
    }

    /**
     * Builds and returns the Map representing the Project EffectiveWorkspace.
     * This iterates through all configured namespace builders and collects their built toolboxes.
     * @returns EffectiveWorkspace (Map<NamespaceName, EffectiveToolbox>)
     */
    build(): EffectiveWorkspace {
        const finalWorkspace: EffectiveWorkspace = new Map();
        // Iterate through the namespace builders
        this.namespaceBuilders.forEach((toolboxBuilder, namespaceName) => {
            // Build each toolbox and add it to the final workspace map
            finalWorkspace.set(namespaceName, toolboxBuilder.build());
        });
        return finalWorkspace; // Return the assembled Map
    }
}

/**
 * Factory function to create a new EffectiveWorkspace builder instance.
 * This is the intended entry point for users defining their project workspace.
 *
 * @returns A new EffectiveWorkspaceBuilder.
 * @example
 * import { createEffectiveWorkspace } from "@/services/ai/tools/builder";
 * import { myTool1, myTool2 } from "./myTools";
 *
 * const projectWorkspace = createEffectiveWorkspace()
 *   .toolbox("myNamespace")
 *     .addTool(myTool1)
 *     .addTool(myTool2)
 *   .build(); // Builds the Map<string, HashMap<string, EffectiveTool>>
 */
export function createEffectiveWorkspace() {
    return new EffectiveWorkspaceBuilder();
}
