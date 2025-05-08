import { Schema as S } from "effect";
import { SToolImplementation } from "../tools/schema.js";

/**
 * Schema for a tool's metadata in the registry
 */
export class ToolMetadataSchema extends S.Class<ToolMetadataSchema>("ToolMetadataSchema")({
    name: S.String,
    description: S.String,
    version: S.String.pipe(S.pattern(/^\d+\.\d+\.\d+$/)),
    tags: S.optional(S.Array(S.String)),
    author: S.String,
    repository: S.optional(S.String)
}) { }

/**
 * Schema for a tool in the registry
 */
export class RegistryToolSchema extends S.Class<RegistryToolSchema>("RegistryToolSchema")({
    metadata: ToolMetadataSchema,
    implementation: SToolImplementation
}) { }

/**
 * Schema for a toolkit in the registry
 */
export class ToolkitSchema extends S.Class<ToolkitSchema>("ToolkitSchema")({
    name: S.String,
    description: S.String,
    version: S.String.pipe(S.pattern(/^\d+\.\d+\.\d+$/)),
    tools: S.Record({key: S.String, value: RegistryToolSchema})
}) { }

/**
 * Schema for the entire tool registry
 */
export class ToolRegistrySchema extends S.Class<ToolRegistrySchema>("ToolRegistrySchema")({
    toolkits: S.Record({key: S.String, value: ToolkitSchema})
}) { }
