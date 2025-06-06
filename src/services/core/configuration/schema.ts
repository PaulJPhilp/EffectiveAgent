/**
 * @file Core configuration schemas used across services
 */

import { Schema } from 'effect';

/**
 * Schema for environment configuration
 */
export class EnvironmentConfig extends Schema.Class<EnvironmentConfig>("EnvironmentConfig")({
    nodeEnv: Schema.Union(
        Schema.Literal("development"),
        Schema.Literal("test"),
        Schema.Literal("production")
    ).pipe(Schema.optional),
    logLevel: Schema.Union(
        Schema.Literal("debug"),
        Schema.Literal("info"),
        Schema.Literal("warn"),
        Schema.Literal("error")
    ).pipe(Schema.optional),
    isDebug: Schema.Boolean.pipe(Schema.optional)
}) { }

/**
 * Base interface that all configuration types must extend.
 * Ensures consistent properties across all configurations.
 */
export interface BaseConfig {
    readonly name: string;
    readonly version: string;
}

/**
 * Base schema that all configuration schemas must extend.
 * Provides validation for the base configuration properties.
 */
export class BaseConfigSchema extends Schema.Class<BaseConfigSchema>("BaseConfigSchema")({
    name: Schema.String,
    version: Schema.String
}) { }

/**
 * Runtime settings configuration
 */
export const RuntimeSettingsSchema = Schema.Struct({
    fileSystemImplementation: Schema.optionalWith(Schema.Literal('node', 'bun'), { default: () => 'node' as const })
});

/**
 * Logging configuration
 */
export const LoggingConfigSchema = Schema.Struct({
    level: Schema.optionalWith(Schema.Literal('error', 'warn', 'info', 'debug', 'trace'), { default: () => 'info' as const }),
    filePath: Schema.optionalWith(Schema.String, { default: () => './logs/app.log' }),
    enableConsole: Schema.optionalWith(Schema.Boolean, { default: () => true })
});

/**
 * Agent configuration paths
 */
export const AgentConfigSchema = Schema.Struct({
    agentsDirectory: Schema.optionalWith(Schema.String, { default: () => './agents' }),
    modelsConfigPath: Schema.optionalWith(Schema.String, { default: () => './config/models.json' }),
    providersConfigPath: Schema.optionalWith(Schema.String, { default: () => './config/providers.json' }),
    policiesConfigPath: Schema.optionalWith(Schema.String, { default: () => './config/policies.json' })
});

export const ConfigPathsSchema = Schema.Struct({
    providers: Schema.String,
    models: Schema.String,
    policy: Schema.String
});

/**
 * Master configuration schema
 */
export class MasterConfigSchema extends Schema.Class<MasterConfigSchema>("MasterConfigSchema")({
    name: Schema.String,
    version: Schema.String,
    runtimeSettings: RuntimeSettingsSchema,
    logging: LoggingConfigSchema,
    configPaths: ConfigPathsSchema
}) { }

export type MasterConfig = Schema.Schema.Type<typeof MasterConfigSchema>;
export type RuntimeSettings = Schema.Schema.Type<typeof RuntimeSettingsSchema>;
export type LoggingConfig = Schema.Schema.Type<typeof LoggingConfigSchema>;
export type AgentConfig = Schema.Schema.Type<typeof AgentConfigSchema>;