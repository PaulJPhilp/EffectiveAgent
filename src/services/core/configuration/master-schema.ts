/**
 * @file Master configuration schema for the agent runtime
 * @module services/core/configuration/master-schema
 */

import { Schema } from "effect";

/**
 * Runtime settings configuration schema
 */
export const RuntimeSettingsSchema = Schema.Struct({
    fileSystemImplementation: Schema.Union(
        Schema.Literal("node"),
        Schema.Literal("bun")
    ),
    logging: Schema.Struct({
        level: Schema.Union(
            Schema.Literal("fatal"),
            Schema.Literal("error"),
            Schema.Literal("warn"),
            Schema.Literal("info"),
            Schema.Literal("debug"),
            Schema.Literal("trace"),
            Schema.Literal("all")
        ),
        filePath: Schema.String.pipe(
            Schema.minLength(1),
            Schema.pattern(/\.(log|txt)$/)
        )
    })
});

/**
 * Configuration paths schema
 */
export const ConfigPathsSchema = Schema.Struct({
    providers: Schema.String.pipe(
        Schema.minLength(1),
        Schema.pattern(/\.json$/)
    ),
    models: Schema.String.pipe(
        Schema.minLength(1),
        Schema.pattern(/\.json$/)
    ),
    policy: Schema.String.pipe(
        Schema.minLength(1),
        Schema.pattern(/\.json$/)
    )
});

/**
 * Base configuration schema that all configurations must extend
 */
export const BaseConfigSchema = Schema.Struct({
    name: Schema.String.pipe(
        Schema.minLength(1)
    ),
    version: Schema.String.pipe(
        Schema.pattern(/^\d+\.\d+\.\d+$/)
    )
});

/**
 * Master configuration schema for the agent runtime
 */
export const MasterConfigSchema = Schema.Struct({
    ...BaseConfigSchema.fields,
    runtimeSettings: RuntimeSettingsSchema,
    configPaths: ConfigPathsSchema
});

/**
 * Master configuration type
 */
export type MasterConfig = Schema.Schema.Type<typeof MasterConfigSchema>;

