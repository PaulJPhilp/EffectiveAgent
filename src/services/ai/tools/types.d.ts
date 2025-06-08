/**
 * @file Types for EffectiveTool, Registry and Execution services.
 * @module services/tools/types
 */
import type { EffectiveTool, ToolExecutionError, ToolInputValidationError, ToolOutputValidationError } from "@/types.js";
import { Effect, HashMap, Schema } from "effect";
import { ToolNotFoundError } from "./errors.js";
import type { EffectImplementation } from "./schema.js";
export type NamespaceName = string;
export type OrgName = string;
export type ToolName = string;
export type FullToolName = `${NamespaceName}:${ToolName}`;
export type SimpleToolName = string;
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
export declare const MetadataRecord: Schema.Record$<typeof Schema.String, typeof Schema.Any>;
export type MetadataRecordType = typeof MetadataRecord.Type;
declare const ToolExecutorService_base: Effect.Service.Class<{
    readonly run: <Output = unknown>(toolName: FullToolName, rawInput: unknown) => Effect.Effect<Output, ToolNotFoundError | ToolInputValidationError | ToolOutputValidationError | ToolExecutionError>;
}, "ToolExecutorService", {
    readonly effect: Effect.Effect<{
        run: <Output_1 = unknown>(toolName: FullToolName, rawInput: unknown) => Effect.Effect<Output_1, ToolExecutionError | ToolInputValidationError | ToolOutputValidationError | ToolNotFoundError, never>;
    }, never, never>;
}>;
/**
 * Service for tool execution operations
 */
export declare class ToolExecutorService extends ToolExecutorService_base {
}
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
export type ToolImplementation = EffectImplementation | HttpImplementation | McpImplementation;
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
/** Tag identifying the EffectiveWorkspace containing the user's project-specific tools. */
export interface ProjectWorkspaceShape {
    readonly tools: HashMap.HashMap<NamespaceName, HashMap.HashMap<SimpleToolName, EffectiveTool>>;
    readonly metadata: HashMap.HashMap<NamespaceName, Metadata>;
}
declare const ProjectWorkspace_base: Effect.Service.Class<ProjectWorkspaceShape, "ProjectWorkspace", {
    readonly effect: Effect.Effect<{
        tools: HashMap.HashMap<never, never>;
        metadata: HashMap.HashMap<never, never>;
    }, never, never>;
}>;
export declare class ProjectWorkspace extends ProjectWorkspace_base {
}
/**
 * Represents the final, flattened registry containing all available tools,
 * keyed by their fully qualified name (e.g., "calculator", "science/calculator").
 * This is the data structure used directly by the ToolExecutorService.
 */
export interface ToolRegistryDataShape {
    readonly tools: HashMap.HashMap<FullToolName, ToolImplementation>;
    readonly metadata: HashMap.HashMap<FullToolName, Metadata>;
}
declare const ToolRegistryData_base: Effect.Service.Class<ToolRegistryDataShape, "ToolRegistryData", {
    readonly effect: Effect.Effect<{
        tools: HashMap.HashMap<never, never>;
        metadata: HashMap.HashMap<never, never>;
    }, never, never>;
}>;
export declare class ToolRegistryData extends ToolRegistryData_base {
}
/**
 * Service for tool registry operations
 */
export interface ToolRegistryApi {
    readonly getTool: (toolName: FullToolName) => Effect.Effect<ToolImplementation, ToolNotFoundError>;
    readonly getMetadata: (toolName: FullToolName) => Effect.Effect<Metadata, ToolNotFoundError>;
    readonly listTools: () => Effect.Effect<FullToolName[]>;
    readonly registerTool: (toolName: FullToolName, implementation: ToolImplementation, metadata: Metadata) => Effect.Effect<void>;
}
declare const ToolRegistry_base: Effect.Service.Class<ToolRegistryApi, "ToolRegistry", {
    readonly effect: Effect.Effect<{
        getTool: (toolName: FullToolName) => Effect.Effect<never, ToolNotFoundError, never>;
        getMetadata: (toolName: FullToolName) => Effect.Effect<never, ToolNotFoundError, never>;
        listTools: () => Effect.Effect<never[], never, never>;
        registerTool: (toolName: FullToolName, implementation: ToolImplementation, metadata: Metadata) => Effect.Effect<undefined, never, never>;
    }, never, never>;
}>;
export declare class ToolRegistry extends ToolRegistry_base {
}
//# sourceMappingURL=types.d.ts.map