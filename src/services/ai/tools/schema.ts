/**
 * @file Defines Effect Schemas for Tool Definition Metadata.
 * @module services/tools/schema
 */

import { Schema as S } from "effect";

// --- Tool Names ---

/**
 * Represents a simple tool name (e.g., "calculator", "weather")
 * Must be lowercase alphanumeric with optional hyphens
 */
export const SimpleToolName = S.String.pipe(
    S.pattern(/^[a-z0-9-]+$/),
    S.annotations({ description: "A simple tool name (lowercase alphanumeric with optional hyphens)" })
);
export type SimpleToolName = S.Schema.Type<typeof SimpleToolName>;

/**
 * Represents a namespaced tool name (e.g., "math/calculator", "weather/forecast")
 * Must be lowercase alphanumeric with optional hyphens, separated by forward slashes
 */
export const FullToolName = S.String.pipe(
    S.pattern(/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/),
    S.annotations({ description: "A fully qualified tool name (namespaced with forward slashes)" })
);
export type FullToolName = S.Schema.Type<typeof FullToolName>;

// --- Tool Metadata ---

/**
 * Common metadata for all tools
 */
export const ToolMetadata = S.Struct({
    name: FullToolName,
    description: S.String,
    version: S.String.pipe(S.pattern(/^\d+\.\d+\.\d+$/)),
    tags: S.Array(S.String),
    author: S.String,
    license: S.String.pipe(S.optional),
    homepage: S.transform(
        S.String,
        S.String,
        {
            decode: (s: string) => s ? new URL(s).toString() : s,
            encode: (s: string) => s
        }
    ).pipe(S.optional),
    repository: S.transform(
        S.String,
        S.String,
        {
            decode: (s: string) => s ? new URL(s).toString() : s,
            encode: (s: string) => s
        }
    ).pipe(S.optional)
});
export type ToolMetadata = S.Schema.Type<typeof ToolMetadata>;

// --- Tool Implementations ---

/**
 * Base schema for all tool implementations
 */
export const BaseImplementation = S.Struct({
    inputSchema: S.Any,
    outputSchema: S.Any
});

/**
 * Effect-based tool implementation
 */
export const EffectImplementation = S.Struct({
    _tag: S.Literal("EffectImplementation"),
    inputSchema: S.Any,
    outputSchema: S.Any,
    execute: S.Any // Will be typed properly in runtime
}).pipe(S.extend(BaseImplementation));
export type EffectImplementation = S.Schema.Type<typeof EffectImplementation>;

/**
 * HTTP-based tool implementation
 */
export const HttpImplementation = S.Struct({
    _tag: S.Literal("HttpImplementation"),
    inputSchema: S.Any,
    outputSchema: S.Any,
    url: S.transform(
        S.String,
        S.String,
        {
            decode: (s: string) => new URL(s).toString(),
            encode: (s: string) => s
        }
    ),
    method: S.Literal("GET", "POST", "PUT", "DELETE", "PATCH"),
    headers: S.Record({ key: S.String, value: S.String }).pipe(S.optional),
    timeout: S.Number.pipe(S.between(0, Number.MAX_SAFE_INTEGER), S.optional)
}).pipe(S.extend(BaseImplementation));
export type HttpImplementation = S.Schema.Type<typeof HttpImplementation>;

/**
 * MCP-based tool implementation
 */
export const McpImplementation = S.Struct({
    _tag: S.Literal("McpImplementation"),
    inputSchema: S.Any,
    outputSchema: S.Any,
    slug: S.String,
    version: S.String.pipe(S.optional)
}).pipe(S.extend(BaseImplementation));
export type McpImplementation = S.Schema.Type<typeof McpImplementation>;

/**
 * Union of all possible tool implementations
 */
export const ToolImplementation = S.Union(
    EffectImplementation,
    HttpImplementation,
    McpImplementation
);
export type ToolImplementation = S.Schema.Type<typeof ToolImplementation>;

/**
 * Complete tool definition including metadata and implementation
 */
export const Tool = S.Struct({
    metadata: ToolMetadata,
    implementation: ToolImplementation
});
export type Tool = S.Schema.Type<typeof Tool>;

/**
 * Registry data containing all available tools
 */
export const ToolRegistryData = S.Struct({
    tools: S.instanceOf(Map<FullToolName, Tool>)
});
export type ToolRegistryData = S.Schema.Type<typeof ToolRegistryData>;
