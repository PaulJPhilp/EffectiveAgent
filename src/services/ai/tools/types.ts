/**
 * @file Types for EffectiveTool, Registry and Execution services.
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
import type { SimpleToolName } from "./schema.js";

// --- Naming and Implementation Types ---
export type NamespaceName = string;
export type OrgName = string;
export type FullToolName = string; // e.g., "calculator", "science/calculator", "3M/science/calculator"
export type ToolkitName = string;

/**
 * Definition of a tool's metadata.
 */
export interface ToolDefinition {
    readonly name: string;
    readonly description: string;
    readonly version?: string;
    readonly tags?: string[];
    readonly author?: string;
}

// --- Toolkit Types ---

/** 
 * Represents a collection of related tools that can be registered and used together.
 * Toolkits provide a way to group tools that are commonly used together or share
 * common dependencies or configuration.
 */
export interface EffectiveToolkit {
    readonly name: ToolkitName;
    readonly description: string;
    readonly version: string;
    readonly tools: HashMap.HashMap<SimpleToolName, EffectiveTool>;
    readonly dependencies?: Record<string, string>; // Optional package.json style dependencies
    readonly config?: Record<string, unknown>; // Optional shared configuration
}

const Metadata = Schema.Record({ key: Schema.String, value: Schema.Any });
type Metadata = typeof Metadata.Type;



export interface EffectiveToolApi {
    readonly execute: (input: unknown, toolMetadata: Metadata) => Effect.Effect<
        EffectiveTool,
        ParseResult.ParseError
    >;
    readonly succeed: (input: unknown, toolMetadata: Metadata) => Effect.Effect<
        EffectiveTool,
        ParseResult.ParseError
    >;
    readonly fail: (input: unknown, toolMetadata: Metadata) => Effect.Effect<
        EffectiveTool,
        ParseResult.ParseError
    >;
}

export class EffectiveToolService extends Effect.Service<EffectiveToolApi>()("app/EffectiveToolService", {
    effect: Effect.succeed({
        execute: (input: unknown, toolMetadata: Metadata) =>
            Effect.succeed({ definition: "", implementation: "Effect", inputSchema: {}, outputSchema: {} } as unknown as EffectiveTool),
        succeed: (input: unknown, toolMetadata: Metadata) =>
            Effect.succeed({ definition: "", implementation: "Effect", inputSchema: {}, outputSchema: {} } as unknown as EffectiveTool),
        fail: (input: unknown, toolMetadata: Metadata) =>
            Effect.succeed({ definition: "", implementation: "Effect", inputSchema: {}, outputSchema: {} } as unknown as EffectiveTool),
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
    readonly slug: string;
    readonly version?: string;
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


/** Represents the collection of toolboxes within a project scope. */
export type EffectiveWorkspace = Map<NamespaceName, HashMap.HashMap<SimpleToolName, EffectiveTool>>;

/** Represents the collection of toolboxes within an organization scope (optional). */
export type OrgWorkspaceMap = Map<OrgName, Map<NamespaceName, HashMap.HashMap<SimpleToolName, EffectiveTool>>>;

// --- Tags for Source Collections ---



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
    readonly toolkits: HashMap.HashMap<ToolkitName, EffectiveToolkit>;
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
// Define ToolkitName, ToolkitDefinition, EffectiveToolkit types here if implementing toolkits

/**
 * Service for tool registry
 */
export interface ToolRegistryApi {
    readonly _tag: "ToolRegistry"
    readonly getData: () => Effect.Effect<ToolRegistryData, never>
    readonly updateData: (data: ToolRegistryData) => Effect.Effect<void, never>
}

/**
 * Implementation of the ToolRegistry service using Effect.Service pattern
 */
export class ToolRegistry extends Effect.Service<ToolRegistryApi>()(
    "ToolRegistry",
    {
        effect: Effect.succeed({
            _tag: "ToolRegistry" as const,
            getData: (): Effect.Effect<ToolRegistryData, never> => {
                // Implementation will be provided in the service file
                throw new Error("Not implemented");
            },
            updateData: (data: ToolRegistryData): Effect.Effect<void, never> => {
                // Implementation will be provided in the service file
                throw new Error("Not implemented");
            }
        })
    }
) { }

/**
 * Service for tool execution
 */
export interface ToolExecutorApi {
    readonly run: <Output = unknown>(
        toolName: FullToolName,
        rawInput: unknown
    ) => Effect.Effect<
        Output,
        ToolNotFoundError | ToolInputValidationError | ToolOutputValidationError | ToolExecutionError
    >;
}

/**
 * Implementation of the Tool Executor service using Effect.Service pattern
 */
export class ToolExecutor extends Effect.Service<ToolExecutorApi>()(
    "ToolExecutor",
    {
        effect: Effect.succeed({
            run: <Output = unknown>(
                toolName: FullToolName,
                rawInput: unknown
            ): Effect.Effect<
                Output,
                ToolNotFoundError | ToolInputValidationError | ToolOutputValidationError | ToolExecutionError
            > => {
                // Implementation will be provided in the service file
                throw new Error("Not implemented");
            }
        })
    }
) { }
