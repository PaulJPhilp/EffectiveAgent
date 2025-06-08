/**
 * @file Defines Effect Schemas for Tool Definition Metadata.
 * @module services/tools/schema
 */
import { Effect, Schema as S } from "effect";
/**
 * Represents a simple tool name (e.g., "calculator", "weather")
 * Must be lowercase alphanumeric with optional hyphens
 */
export declare const SimpleToolName: S.refine<string, typeof S.String>;
export type SimpleToolName = S.Schema.Type<typeof SimpleToolName>;
/**
 * Represents a namespaced tool name (e.g., "math/calculator", "weather/forecast")
 * Must be lowercase alphanumeric with optional hyphens, separated by forward slashes
 */
export declare const FullToolName: S.refine<string, typeof S.String>;
export type FullToolName = S.Schema.Type<typeof FullToolName>;
declare const ToolMetadata_base: S.Class<ToolMetadata, {
    name: typeof S.String;
    description: typeof S.String;
    version: S.optional<typeof S.String>;
}, S.Struct.Encoded<{
    name: typeof S.String;
    description: typeof S.String;
    version: S.optional<typeof S.String>;
}>, never, {
    readonly name: string;
} & {
    readonly version?: string | undefined;
} & {
    readonly description: string;
}, {}, {}>;
/**
 * Common metadata for all tools
 */
export declare class ToolMetadata extends ToolMetadata_base {
}
declare const EffectiveTool_base: S.Class<EffectiveTool, {
    definition: typeof S.String;
    implementation: S.Literal<["Effect", "Http", "Mcp"]>;
    inputSchema: typeof S.Unknown;
    outputSchema: typeof S.Unknown;
    toolMetadata: typeof ToolMetadata;
}, S.Struct.Encoded<{
    definition: typeof S.String;
    implementation: S.Literal<["Effect", "Http", "Mcp"]>;
    inputSchema: typeof S.Unknown;
    outputSchema: typeof S.Unknown;
    toolMetadata: typeof ToolMetadata;
}>, never, {
    readonly definition: string;
} & {
    readonly inputSchema: unknown;
} & {
    readonly outputSchema: unknown;
} & {
    readonly toolMetadata: ToolMetadata;
} & {
    readonly implementation: "Effect" | "Http" | "Mcp";
}, {}, {}>;
export declare class EffectiveTool extends EffectiveTool_base {
}
/**
 * Base schema for all tool implementations
 */
export interface IEffectImplementation<I, O, R, E> {
    _tag: "EffectImplementation";
    inputSchema: S.Schema<I>;
    outputSchema: S.Schema<O>;
    execute: (input: I) => Effect.Effect<O, E, R>;
}
declare const BaseImplementation_base: S.Class<BaseImplementation, {
    inputSchema: typeof S.Any;
    outputSchema: typeof S.Any;
}, S.Struct.Encoded<{
    inputSchema: typeof S.Any;
    outputSchema: typeof S.Any;
}>, never, {
    readonly inputSchema: any;
} & {
    readonly outputSchema: any;
}, {}, {}>;
export declare class BaseImplementation extends BaseImplementation_base {
}
declare const EffectImplementation_base: S.Class<EffectImplementation, {
    inputSchema: typeof S.Any;
    outputSchema: typeof S.Any;
} & {
    _tag: S.Literal<["EffectImplementation"]>;
    execute: typeof S.Any;
}, {
    readonly inputSchema: any;
    readonly outputSchema: any;
} & {} & {
    readonly _tag: "EffectImplementation";
    readonly execute: any;
} & {}, never, {
    readonly inputSchema: any;
} & {
    readonly outputSchema: any;
} & {
    readonly _tag: "EffectImplementation";
} & {
    readonly execute: any;
}, BaseImplementation, {}>;
/**
 * Effect-based tool implementation
 */
export declare class EffectImplementation extends EffectImplementation_base {
}
declare const HttpImplementation_base: S.Class<HttpImplementation, {
    inputSchema: typeof S.Any;
    outputSchema: typeof S.Any;
} & {
    _tag: S.Literal<["HttpImplementation"]>;
    url: typeof S.String;
    method: S.Literal<["GET", "POST", "PUT", "DELETE", "PATCH"]>;
    headers: S.optional<S.Record$<typeof S.String, typeof S.String>>;
    body: S.optional<typeof S.Any>;
}, {
    readonly inputSchema: any;
    readonly outputSchema: any;
} & {} & {
    readonly _tag: "HttpImplementation";
    readonly url: string;
    readonly method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
} & {
    readonly headers?: {
        readonly [x: string]: string;
    } | undefined;
    readonly body?: any;
}, never, {
    readonly inputSchema: any;
} & {
    readonly outputSchema: any;
} & {
    readonly _tag: "HttpImplementation";
} & {
    readonly url: string;
} & {
    readonly method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
} & {
    readonly headers?: {
        readonly [x: string]: string;
    } | undefined;
} & {
    readonly body?: any;
}, BaseImplementation, {}>;
/**
 * HTTP-based tool implementation
 */
export declare class HttpImplementation extends HttpImplementation_base {
}
declare const McpImplementation_base: S.Class<McpImplementation, {
    inputSchema: typeof S.Any;
    outputSchema: typeof S.Any;
} & {
    _tag: S.Literal<["McpImplementation"]>;
    slug: typeof S.String;
    version: S.optional<typeof S.String>;
}, {
    readonly inputSchema: any;
    readonly outputSchema: any;
} & {} & {
    readonly _tag: "McpImplementation";
    readonly slug: string;
} & {
    readonly version?: string | undefined;
}, never, {
    readonly inputSchema: any;
} & {
    readonly outputSchema: any;
} & {
    readonly _tag: "McpImplementation";
} & {
    readonly version?: string | undefined;
} & {
    readonly slug: string;
}, BaseImplementation, {}>;
/**
 * MCP-based tool implementation
 */
export declare class McpImplementation extends McpImplementation_base {
}
/**
 * Union of all possible tool implementations
 */
export declare const ToolImplementation: S.Union<[typeof EffectImplementation, typeof HttpImplementation, typeof McpImplementation]>;
export type ToolImplementation = S.Schema.Type<typeof ToolImplementation>;
/**
 * Complete tool definition including metadata and implementation
 */
/**
 * Tool definition type that includes both metadata and implementation
 */
export type ToolDefinition = {
    metadata: S.Schema.Type<typeof ToolMetadata>;
    implementation: ToolImplementation;
};
declare const Tool_base: S.Class<Tool, {
    metadata: typeof ToolMetadata;
    implementation: S.Union<[typeof EffectImplementation, typeof HttpImplementation, typeof McpImplementation]>;
}, S.Struct.Encoded<{
    metadata: typeof ToolMetadata;
    implementation: S.Union<[typeof EffectImplementation, typeof HttpImplementation, typeof McpImplementation]>;
}>, never, {
    readonly metadata: ToolMetadata;
} & {
    readonly implementation: EffectImplementation | HttpImplementation | McpImplementation;
}, {}, {}>;
export declare class Tool extends Tool_base {
}
declare const ToolRegistryData_base: S.Class<ToolRegistryData, {
    tools: S.Record$<typeof S.String, typeof Tool>;
}, S.Struct.Encoded<{
    tools: S.Record$<typeof S.String, typeof Tool>;
}>, never, {
    readonly tools: {
        readonly [x: string]: Tool;
    };
}, {}, {}>;
/**
 * Registry data containing all available tools
 */
export declare class ToolRegistryData extends ToolRegistryData_base {
}
export {};
//# sourceMappingURL=schema.d.ts.map