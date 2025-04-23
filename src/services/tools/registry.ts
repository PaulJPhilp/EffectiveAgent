/**
 * @file Provides Layers for tool sources (StdLib) and the final merged registry.
 * @module services/tools/registry
 */

import { Context, Effect, HashMap, Layer, Option, Schema } from "effect";
import {
    InternalToolboxTag,
    ProjectWorkspaceTag,
    // OrgWorkspaceTag,
    ToolRegistryData,
    ToolRegistryDataTag,
} from "./types.js";
import type {
    EffectiveTool, 
    EffectiveToolbox, EffectiveWorkspace, FullToolName,NamespaceName, OrgWorkspaceMap
} from "./types.js";

import {
    SimpleToolName,  
    ToolDefinition
} from "./schema.js";   

// --- Import Standard Library Tool Implementations ---

// ONLY import the calculator implementation
import {
    calculatorImpl,
    calculatorInputSchema,
    calculatorOutputSchema,
} from "./implementations/calculator.js";

// --- Helper Function to Build Internal Toolbox ---
// This function encapsulates the creation of the standard library tools map.
const buildInternalToolbox = (): Effect.Effect<EffectiveToolbox> => Effect.sync(() => { // Using Effect.sync as no effects needed inside
    // Define metadata ONLY for the calculator
    const staticToolMetadata: HashMap.HashMap<SimpleToolName, ToolDefinition> = HashMap.make(
        ["calculator", { name: "calculator", description: "Calculates the result of a simple arithmetic expression. Input: { expression: string }. Output: { result: number }." }]
    );

    let toolMap = HashMap.empty<SimpleToolName, EffectiveTool>();

    // --- Register Calculator ---
    const calcMetaOpt = HashMap.get(staticToolMetadata, "calculator");
    // Use Option.map and HashMap.set for a more functional style (optional)
    Option.map(calcMetaOpt, (meta) => {
        const calculatorTool: EffectiveTool = {
            definition: meta,
            implementation: {
                _tag: "EffectImplementation",
                inputSchema: calculatorInputSchema,
                outputSchema: calculatorOutputSchema,
                execute: calculatorImpl,
            },
        };
        toolMap = HashMap.set(toolMap, "calculator", calculatorTool);
    });
    // Add logging here if Option.isNone(calcMetaOpt) if desired, e.g., using console.warn sync version
    if (Option.isNone(calcMetaOpt)) {
        console.warn("Metadata not found for stdlib tool: calculator");
    }

    // Return the map containing only the calculator
    return toolMap;
});

// --- Standard Library Toolbox Layer ---
/**
 * Provides the EffectiveToolbox containing standard library tools
 * (currently only calculator) via the InternalToolboxTag.
 */
export const InternalToolboxLayer = Layer.effect( // Use Layer.effect because buildInternalToolbox returns Effect
    InternalToolboxTag,
    buildInternalToolbox() // Execute the build effect
);


// --- Final Merging Layer ---
/**
 * Layer that merges tool sources (Internal StdLib, Project Workspace, Org Workspace)
 * and provides the final flattened ToolRegistryData via ToolRegistryDataTag.
 * Requires ProjectWorkspaceTag and InternalToolboxTag (and optionally OrgWorkspaceTag).
 */
export const FinalToolRegistryLayer = Layer.effect(
    ToolRegistryDataTag,
    Effect.gen(function* () {
        // Get the source data structures from the Context
        const internalTools = yield* InternalToolboxTag;
        const projectWorkspace = yield* ProjectWorkspaceTag;
        // const orgWorkspaceOpt = yield* Effect.option(OrgWorkspaceTag); // Optional Org layer

        let finalMergedTools = HashMap.empty<FullToolName, EffectiveTool>();

        // 1. Add Internal tools (lowest precedence)
        HashMap.forEach(internalTools, (tool, name) => {
            finalMergedTools = HashMap.set(finalMergedTools, name, tool); // Simple name is full name
        });

        // 2. Add Org tools (medium precedence) - Placeholder
        // ... merge org tools using org/ns/name format ...

        // 3. Add Project tools (highest precedence)
        projectWorkspace.forEach((toolbox, nsName) => {
            HashMap.forEach(toolbox, (tool, simpleName) => {
                const fullName: FullToolName = `${nsName}/${simpleName}`; // Project Full Name
                if (HashMap.has(finalMergedTools, fullName)) {
                    // Use sync logging if inside Layer.sync or adjust if buildInternalToolbox remains Effect
                    console.warn(`Project tool "${fullName}" overrides an existing tool.`);
                    // yield* Effect.logWarning(`Project tool "${fullName}" overrides an existing tool.`); // If using Effect.gen
                }
                finalMergedTools = HashMap.set(finalMergedTools, fullName, tool);
            });
        });

        // TODO: Merge Toolkits similarly if using them

        // Create and return the final registry data
        return new ToolRegistryData({ tools: finalMergedTools });
    }),
);
