/**
 * @file Defines Effect Schemas for Tool Definition Metadata.
 * @module services/tools/schema
 */

import { Effect, Schema as S } from "effect";

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

export const SEffectiveTool = S.Struct({
    definition: S.String,
    implementation: S.Literal("Effect", "Http", "Mcp"),
    inputSchema: S.Unknown,
    outputSchema: S.Unknown,
    toolMetadata: ToolMetadata,
});

// --- Tool Implementations ---

/**
 * Base schema for all tool implementations
 */
export interface EffectImplementation<I, O, R, E> {
    _tag: "EffectImplementation";
    inputSchema: S.Schema<I>;
    outputSchema: S.Schema<O>;
    execute: (input: I) => Effect.Effect<O, E, R>;
}

export const SBaseImplementation = S.Struct({
    inputSchema: S.Any,
    outputSchema: S.Any
});
export type SBaseImplementation = S.Schema.Type<typeof SBaseImplementation>;

type SBaseImplementationType = S.Schema.Type<typeof SBaseImplementation>;

/**
 * Effect-based tool implementation
 */
export const SEffectImplementation = S.Struct({
    ...SBaseImplementation.fields,
    _tag: S.Literal("EffectImplementation"),
    execute: S.Any // Will be typed properly in runtime via EffectImplementation interface
});
export type SEffectImplementation = S.Schema.Type<typeof SEffectImplementation>;

type SEffectImplementationType = S.Schema.Type<typeof SEffectImplementation>;

/**
 * HTTP-based tool implementation
 */
export const SHttpImplementation = S.Struct({
    ...SBaseImplementation.fields,
    _tag: S.Literal("HttpImplementation"),
    url: S.transform(
        S.String,
        S.String,
        {
            decode: (s: string) => new URL(s).toString(),
            encode: (s: string) => s
        }
    ),
    method: S.Literal("GET", "POST", "PUT", "DELETE", "PATCH"),
    headers: S.optional(S.Record({ key: S.String, value: S.String })),
    timeout: S.Number.pipe(S.between(0, Number.MAX_SAFE_INTEGER), S.optional)
});
export type SHttpImplementation = S.Schema.Type<typeof SHttpImplementation>;

type SHttpImplementationType = S.Schema.Type<typeof SHttpImplementation>;

/**
 * MCP-based tool implementation
 */
export const SMcpImplementation = S.Struct({
    ...SBaseImplementation.fields,
    _tag: S.Literal("McpImplementation"),
    slug: S.String,
    version: S.String.pipe(S.optional)
});
export type McpImplementation = S.Schema.Type<typeof SMcpImplementation>;

/**
 * Union of all possible tool implementations
 */
export const SToolImplementation = S.Union(
    SEffectImplementation,
    SHttpImplementation,
    SMcpImplementation
);
export type ToolImplementation = S.Schema.Type<typeof SToolImplementation>;

/**
 * Complete tool definition including metadata and implementation
 */
export const Tool = S.Struct({
    metadata: ToolMetadata,
    implementation: SToolImplementation
});

/**
 * Registry data containing all available tools
 */
export const ToolRegistryData = S.Struct({
    tools: S.Record({ key: S.String, value: Tool })
});