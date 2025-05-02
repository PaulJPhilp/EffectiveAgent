/**
 * @file Types for EffectiveTool, EffectiveToolbox, EffectiveWorkspace, Registry and Execution services.
 * @module services/tools/types
 */

import { Context, Data, Effect, HashMap, ParseResult, Schema } from "effect";
// Import error types that might be used in service signatures or implementation types
import type {
    ToolExecutionError,
    ToolInputValidationError,
    ToolNotFoundError,
    ToolOutputValidationError,
} from "./errors.js"; // Adjust path if errors are defined elsewhere
// Import the schema definition type
import type { SimpleToolName, ToolDefinition } from "./schema.js";

// --- Naming and Implementation Types ---
export type NamespaceName = string;
export type OrgName = string;
export type FullToolName = string; // e.g., "calculator", "science/calculator", "3M/science/calculator"

const Metadata = Schema.Record({ key: Schema.String, value: Schema.Any });
type Metadata = typeof Metadata.Type;

const EffectiveTool = Schema.Struct({
    definition: Schema.String,
    implementation: Schema.Literal("Effect", "Http", "Mcp"),
    inputSchema: Schema.Any,
    outputSchema: Schema.Any,
    toolMetadata: Metadata,
})

export interface EffectiveToolApi {
    readonly execute: (input: unknown, toolMetadata: Metadata) => Effect.Effect<
        typeof EffectiveTool.Type,
        ParseResult.ParseError
    >;
    readonly succeed: (input: unknown, toolMetadata: Metadata) => Effect.Effect<
        typeof EffectiveTool.Type,
        ParseResult.ParseError
    >;
    readonly fail: (input: unknown, toolMetadata: Metadata) => Effect.Effect<
        typeof EffectiveTool.Type,
        ParseResult.ParseError
    >;
}

export class EffectiveToolService extends Effect.Service<EffectiveToolApi>()("app/EffectiveToolService", {
    effect: Effect.succeed({
        execute: (input: unknown, toolMetadata: Metadata) =>
            Effect.succeed({ definition: "", implementation: "Effect", inputSchema: {}, outputSchema: {} } as typeof EffectiveTool.Type),
        succeed: (input: unknown, toolMetadata: Metadata) =>
            Effect.succeed({ definition: "", implementation: "Effect", inputSchema: {}, outputSchema: {} } as typeof EffectiveTool.Type),
        fail: (input: unknown, toolMetadata: Metadata) =>
            Effect.succeed({ definition: "", implementation: "Effect", inputSchema: {}, outputSchema: {} } as typeof EffectiveTool.Type),
    })
}) { }


export type EffectImplementation<InputA = any, InputE = any, OutputA = any, OutputE = any, R = any> = {
    readonly _tag: "EffectImplementation";
    // Schema types now include Encoded type parameter
    readonly inputSchema: Schema.Schema<InputA, InputE, never>; // Use InputE for encoded input if needed
    readonly outputSchema: Schema.Schema<OutputA, OutputE, never>; // Use OutputE for encoded output if needed
    /** The Effect function implementing the tool's logic. Receives validated input (Type A). */
    // Execute function receives the decoded type InputA
    readonly execute: (input: InputA) => Effect.Effect<OutputA, ToolExecutionError, R>;
};

/** Implementation using HTTP requests to external services. */
export type HttpImplementation<InputA = any, InputE = any, OutputA = any, OutputE = any> = {
    readonly _tag: "HttpImplementation";
    readonly inputSchema: Schema.Schema<InputA, InputE, never>;
    readonly outputSchema: Schema.Schema<OutputA, OutputE, never>;
    readonly method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    readonly url: string;
    readonly requestHeaders?: Record<string, string>;
    readonly inputMapping?: (input: InputA) => {
        query?: Record<string, string>;
        body?: unknown;
    };
};

/** Implementation using Model Control Protocol. */
export type McpImplementation<InputA = any, InputE = any, OutputA = any, OutputE = any> = {
    readonly _tag: "McpImplementation";
    readonly inputSchema: Schema.Schema<InputA, InputE, never>;
    readonly outputSchema: Schema.Schema<OutputA, OutputE, never>;
    // Additional MCP-specific properties would go here
};

// ToolImplementation union uses the refined types
export type ToolImplementation =
    | EffectImplementation
    | HttpImplementation
    | McpImplementation;

// EffectiveTool uses the refined ToolImplementation
export interface EffectiveTool {
    readonly definition: ToolDefinition;
    readonly implementation: ToolImplementation;
}

/** Represents a collection of tools for a specific namespace (e.g., "stdlib", "project/science"). */
export type EffectiveToolbox = HashMap.HashMap<SimpleToolName, EffectiveTool>;

/** Represents the collection of toolboxes within a project scope. */
export type EffectiveWorkspace = Map<NamespaceName, EffectiveToolbox>;

/** Represents the collection of toolboxes within an organization scope (optional). */
export type OrgWorkspaceMap = Map<OrgName, Map<NamespaceName, EffectiveToolbox>>;

// --- Tags for Source Collections ---

/** Tag identifying the EffectiveToolbox containing standard library tools. */
export const InternalToolboxTag = Context.GenericTag<EffectiveToolbox>("@services/tools/InternalToolbox");

/** Tag identifying the EffectiveWorkspace containing the user's project-specific tools. */
export const ProjectWorkspaceTag = Context.GenericTag<EffectiveWorkspace>("@services/tools/ProjectWorkspace");

/** Tag identifying the optional organization-level workspace map. */
// export const OrgWorkspaceTag = Context.Tag<OrgWorkspaceMap>();

// --- Final Merged Tool Registry Data ---

/**
 * Represents the final, flattened registry containing all available tools,
 * keyed by their fully qualified name (e.g., "calculator", "science/calculator").
 * This is the data structure used directly by the ToolExecutorService.
 */
export class ToolRegistryData extends Data.TaggedClass("ToolRegistryData")<{
    readonly tools: HashMap.HashMap<FullToolName, EffectiveTool>;
    // readonly toolkits: HashMap.HashMap<ToolkitName, RegisteredToolkit>; // Add if/when toolkits are implemented
}> { }

/** Context Tag for the final, merged ToolRegistryData. */
export const ToolRegistryDataTag = Context.GenericTag<ToolRegistryData>(
    "@services/tools/ToolRegistryData"
);

// --- Tool Executor Service ---

/**
 * Service responsible for looking up, validating, and executing tools
 * from the merged ToolRegistryData.
 */
export interface ToolExecutorService {
    /**
     * Executes a registered tool by its fully qualified name with the given raw input.
     * Handles permission checks (via context), input/output validation against the
     * tool's registered Effect Schemas, dispatches to the correct implementation
     * handler, and manages errors.
     *
     * @param toolName The fully qualified name of the tool (e.g., "calculator", "science/calculator").
     * @param rawInput The raw input data for the tool.
     * @returns An Effect that yields the validated tool output or fails with a specific ToolError.
     */
    readonly run: <Output = unknown>( // Output type can be inferred or specified by caller
        toolName: FullToolName,
        rawInput: unknown,
    ) => Effect.Effect<
        Output,
        // Union of all possible errors during execution
        | ToolNotFoundError
        | ToolInputValidationError
        | ToolOutputValidationError
        | ToolExecutionError // Includes permission errors and implementation errors
    >;
}

/** Context Tag for the ToolExecutorService. */
export const ToolExecutorServiceTag = Context.GenericTag<ToolExecutorService>(
    "@services/tools/ToolExecutorService"
);

// --- Optional: Toolkit Definitions ---
// Define ToolkitName, ToolkitDefinition, RegisteredToolkit types here if implementing toolkits
