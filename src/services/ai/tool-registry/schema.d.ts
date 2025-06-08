import { Schema as S } from "effect";
declare const ToolMetadataSchema_base: S.Class<ToolMetadataSchema, {
    name: typeof S.String;
    description: typeof S.String;
    version: S.filter<typeof S.String>;
    tags: S.optional<S.Array$<typeof S.String>>;
    author: typeof S.String;
    repository: S.optional<typeof S.String>;
}, S.Struct.Encoded<{
    name: typeof S.String;
    description: typeof S.String;
    version: S.filter<typeof S.String>;
    tags: S.optional<S.Array$<typeof S.String>>;
    author: typeof S.String;
    repository: S.optional<typeof S.String>;
}>, never, {
    readonly name: string;
} & {
    readonly version: string;
} & {
    readonly description: string;
} & {
    readonly author: string;
} & {
    readonly tags?: readonly string[] | undefined;
} & {
    readonly repository?: string | undefined;
}, {}, {}>;
/**
 * Schema for a tool's metadata in the registry
 */
export declare class ToolMetadataSchema extends ToolMetadataSchema_base {
}
declare const RegistryToolSchema_base: S.Class<RegistryToolSchema, {
    metadata: typeof ToolMetadataSchema;
    implementation: S.Union<[typeof import("../tools/schema.js").EffectImplementation, typeof import("../tools/schema.js").HttpImplementation, typeof import("../tools/schema.js").McpImplementation]>;
}, S.Struct.Encoded<{
    metadata: typeof ToolMetadataSchema;
    implementation: S.Union<[typeof import("../tools/schema.js").EffectImplementation, typeof import("../tools/schema.js").HttpImplementation, typeof import("../tools/schema.js").McpImplementation]>;
}>, never, {
    readonly metadata: ToolMetadataSchema;
} & {
    readonly implementation: import("../tools/schema.js").EffectImplementation | import("../tools/schema.js").HttpImplementation | import("../tools/schema.js").McpImplementation;
}, {}, {}>;
/**
 * Schema for a tool in the registry
 */
export declare class RegistryToolSchema extends RegistryToolSchema_base {
}
declare const ToolkitSchema_base: S.Class<ToolkitSchema, {
    name: typeof S.String;
    description: typeof S.String;
    version: S.filter<typeof S.String>;
    tools: S.Record$<typeof S.String, typeof RegistryToolSchema>;
}, S.Struct.Encoded<{
    name: typeof S.String;
    description: typeof S.String;
    version: S.filter<typeof S.String>;
    tools: S.Record$<typeof S.String, typeof RegistryToolSchema>;
}>, never, {
    readonly name: string;
} & {
    readonly version: string;
} & {
    readonly description: string;
} & {
    readonly tools: {
        readonly [x: string]: RegistryToolSchema;
    };
}, {}, {}>;
/**
 * Schema for a toolkit in the registry
 */
export declare class ToolkitSchema extends ToolkitSchema_base {
}
declare const ToolRegistrySchema_base: S.Class<ToolRegistrySchema, {
    toolkits: S.Record$<typeof S.String, typeof ToolkitSchema>;
}, S.Struct.Encoded<{
    toolkits: S.Record$<typeof S.String, typeof ToolkitSchema>;
}>, never, {
    readonly toolkits: {
        readonly [x: string]: ToolkitSchema;
    };
}, {}, {}>;
/**
 * Schema for the entire tool registry
 */
export declare class ToolRegistrySchema extends ToolRegistrySchema_base {
}
export {};
//# sourceMappingURL=schema.d.ts.map