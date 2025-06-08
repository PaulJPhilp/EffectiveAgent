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
export const SimpleToolName = S.String.pipe(S.pattern(/^[a-z0-9-]+$/), S.annotations({ description: "A simple tool name (lowercase alphanumeric with optional hyphens)" }));
/**
 * Represents a namespaced tool name (e.g., "math/calculator", "weather/forecast")
 * Must be lowercase alphanumeric with optional hyphens, separated by forward slashes
 */
export const FullToolName = S.String.pipe(S.pattern(/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/), S.annotations({ description: "A fully qualified tool name (namespaced with forward slashes)" }));
// --- Tool Metadata ---
/**
 * Common metadata for all tools
 */
export class ToolMetadata extends S.Class("ToolMetadata")({
    name: S.String,
    description: S.String,
    version: S.optional(S.String)
}) {
}
export class EffectiveTool extends S.Class("EffectiveTool")({
    definition: S.String,
    implementation: S.Literal("Effect", "Http", "Mcp"),
    inputSchema: S.Unknown,
    outputSchema: S.Unknown,
    toolMetadata: ToolMetadata
}) {
}
export class BaseImplementation extends S.Class("BaseImplementation")({
    inputSchema: S.Any,
    outputSchema: S.Any
}) {
}
/**
 * Effect-based tool implementation
 */
export class EffectImplementation extends BaseImplementation.extend("EffectImplementation")({
    _tag: S.Literal("EffectImplementation"),
    execute: S.Any // Will be typed properly in runtime via IEffectImplementation interface
}) {
}
/**
 * HTTP-based tool implementation
 */
export class HttpImplementation extends BaseImplementation.extend("HttpImplementation")({
    _tag: S.Literal("HttpImplementation"),
    url: S.String,
    method: S.Literal("GET", "POST", "PUT", "DELETE", "PATCH"),
    headers: S.optional(S.Record({ key: S.String, value: S.String })),
    body: S.optional(S.Any)
}) {
}
/**
 * MCP-based tool implementation
 */
export class McpImplementation extends BaseImplementation.extend("McpImplementation")({
    _tag: S.Literal("McpImplementation"),
    slug: S.String,
    version: S.optional(S.String)
}) {
}
/**
 * Union of all possible tool implementations
 */
export const ToolImplementation = S.Union(EffectImplementation, HttpImplementation, McpImplementation);
export class Tool extends S.Class("Tool")({
    metadata: ToolMetadata,
    implementation: ToolImplementation
}) {
}
/**
 * Registry data containing all available tools
 */
export class ToolRegistryData extends S.Class("ToolRegistryData")({
    tools: S.Record({ key: S.String, value: Tool })
}) {
}
//# sourceMappingURL=schema.js.map