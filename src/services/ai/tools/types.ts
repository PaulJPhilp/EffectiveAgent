/**
 * @file Types for EffectiveTool, Registry and Execution services.
 * @module services/tools/types
 */

import type {
    EffectiveTool,
    ToolExecutionError,
    ToolInputValidationError,
    ToolOutputValidationError
} from "@/types.js";
import { Effect, HashMap, Schema } from "effect";
// Import error types that might be used in service signatures or implementation types
import { ToolNotFoundError } from "./errors.js"; // Changed from type import to value import
// Import the schema definition type
import type { EffectImplementation } from "./schema.js";

// --- Naming and Implementation Types ---
export type NamespaceName = string;
export type OrgName = string;
export type ToolName = string;
export type FullToolName = `${NamespaceName}:${ToolName}`;
export type SimpleToolName = string; // Simple tool name without namespace
export type ToolkitName = string;

/**
 * Definition of a tool's metadata.
 */
export interface Metadata {
    readonly name: string;
    readonly description: string;
    readonly version: string;
    readonly author: string;
    readonly tags: readonly string[];
    readonly category: string;
    readonly examples: readonly {
        readonly input: unknown;
        readonly output: unknown;
        readonly description: string;
    }[];
}

// Use Schema.Record for metadata values
export const MetadataRecord = Schema.Record({ key: Schema.String, value: Schema.Any })
export type MetadataRecordType = typeof MetadataRecord.Type

/**
 * Service for tool execution operations
 */
export class ToolExecutorService extends Effect.Service<{
    readonly run: <Output = unknown>(
        toolName: FullToolName,
        rawInput: unknown
    ) => Effect.Effect<
        Output,
        | ToolNotFoundError
        | ToolInputValidationError
        | ToolOutputValidationError
        | ToolExecutionError
    >;
}>()(
    "ToolExecutorService",
    {
        effect: Effect.succeed({
            run: <Output = unknown>(
                toolName: FullToolName,
                rawInput: unknown
            ): Effect.Effect<
                Output,
                | ToolNotFoundError
                | ToolInputValidationError
                | ToolOutputValidationError
                | ToolExecutionError
            > => Effect.fail(new ToolNotFoundError({ toolName, module: "ToolExecutorService", method: "run" }))
        })
    }
) { }


// Export the EffectImplementation type from schema
export type { EffectImplementation, IEffectImplementation } from "./schema.js";

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

/**
 * Represents a collection of tools for a specific namespace.
 * Uses Effect's HashMap for consistent immutable map operations.
 */
export interface EffectiveWorkspace {
    readonly tools: HashMap.HashMap<NamespaceName, HashMap.HashMap<SimpleToolName, EffectiveTool>>;
    readonly metadata: HashMap.HashMap<NamespaceName, Metadata>;
}

/**
 * Represents a collection of workspaces within an organization scope.
 * Uses Effect's HashMap for consistent immutable map operations.
 */
export interface OrgWorkspaceMap {
    readonly workspaces: HashMap.HashMap<OrgName, EffectiveWorkspace>;
    readonly metadata: HashMap.HashMap<OrgName, Metadata>;
}

// --- Tags for Source Collections ---

/** Tag identifying the EffectiveWorkspace containing the user's project-specific tools. */
export interface ProjectWorkspaceShape {
    readonly tools: HashMap.HashMap<NamespaceName, HashMap.HashMap<SimpleToolName, EffectiveTool>>;
    readonly metadata: HashMap.HashMap<NamespaceName, Metadata>;
}

export class ProjectWorkspace extends Effect.Service<ProjectWorkspaceShape>()("ProjectWorkspace", {
    effect: Effect.succeed({
        tools: HashMap.empty(),
        metadata: HashMap.empty()
    })
}) { }

// --- Final Merged Tool Registry Data ---

/**
 * Represents the final, flattened registry containing all available tools,
 * keyed by their fully qualified name (e.g., "calculator", "science/calculator").
 * This is the data structure used directly by the ToolExecutorService.
 */
export interface ToolRegistryDataShape {
    readonly tools: HashMap.HashMap<FullToolName, ToolImplementation>;
    readonly metadata: HashMap.HashMap<FullToolName, Metadata>;
}

export class ToolRegistryData extends Effect.Service<ToolRegistryDataShape>()(
    "ToolRegistryData",
    {
        effect: Effect.succeed({
            tools: HashMap.empty(),
            metadata: HashMap.empty()
        })
    }
) { }

/**
 * Service for tool registry operations
 */
export interface ToolRegistryApi {
    readonly getTool: (toolName: FullToolName) => Effect.Effect<ToolImplementation, ToolNotFoundError>;
    readonly getMetadata: (toolName: FullToolName) => Effect.Effect<Metadata, ToolNotFoundError>;
    readonly listTools: () => Effect.Effect<FullToolName[]>;
    readonly registerTool: (toolName: FullToolName, implementation: ToolImplementation, metadata: Metadata) => Effect.Effect<void>;
}

export class ToolRegistry extends Effect.Service<ToolRegistryApi>()(
    "ToolRegistry",
    {
        effect: Effect.succeed({
            getTool: (toolName: FullToolName) =>
                Effect.fail(new ToolNotFoundError({ toolName, module: "ToolRegistry", method: "getTool" })),
            getMetadata: (toolName: FullToolName) =>
                Effect.fail(new ToolNotFoundError({ toolName, module: "ToolRegistry", method: "getMetadata" })),
            listTools: () => Effect.succeed([]),
            registerTool: (toolName: FullToolName, implementation: ToolImplementation, metadata: Metadata) =>
                Effect.succeed(void 0)
        })
    }
) { }
