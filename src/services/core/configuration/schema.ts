/**
 * @file Core configuration schemas used across services
 */

import { Schema } from 'effect';

/**
 * Schema for environment configuration
 */
export class EnvironmentConfigSchema extends Schema.Class<EnvironmentConfigSchema>("EnvironmentConfigSchema")({
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
export class RuntimeSettingsSchema extends Schema.Class<RuntimeSettingsSchema>("RuntimeSettingsSchema")({
    fileSystemImplementation: Schema.optionalWith(Schema.Literal('node', 'bun'), { default: () => 'node' as const })
}) { }

/**
 * Logging configuration
 */
export class LoggingConfigSchema extends Schema.Class<LoggingConfigSchema>("LoggingConfigSchema")({
    level: Schema.optionalWith(Schema.Literal('error', 'warn', 'info', 'debug', 'trace'), { default: () => 'info' as const }),
    filePath: Schema.optionalWith(Schema.String, { default: () => './logs/app.log' }),
    enableConsole: Schema.optionalWith(Schema.Boolean, { default: () => true })
}) { }

/**
 * Agent configuration paths
 */
export class AgentConfigSchema extends Schema.Class<AgentConfigSchema>("AgentConfigSchema")({
    agentsDirectory: Schema.optionalWith(Schema.String, { default: () => './agents' }),
    modelsConfigPath: Schema.optionalWith(Schema.String, { default: () => './config/models.json' }),
    providersConfigPath: Schema.optionalWith(Schema.String, { default: () => './config/providers.json' }),
    policiesConfigPath: Schema.optionalWith(Schema.String, { default: () => './config/policies.json' })
}) { }

export class ConfigPathsSchema extends Schema.Class<ConfigPathsSchema>("ConfigPathsSchema")({
    providers: Schema.String,
    models: Schema.String,
    policy: Schema.String,
    "e2e-tools": Schema.String
}) { }

/**
 * Master configuration schema
 */
export class MasterConfigSchema extends Schema.Class<MasterConfigSchema>("MasterConfigSchema")({
    name: Schema.String,
    version: Schema.String,
    runtimeSettings: Schema.optionalWith(RuntimeSettingsSchema, { default: () => new RuntimeSettingsSchema() }),
    logging: Schema.optionalWith(LoggingConfigSchema, { default: () => new LoggingConfigSchema() }),
    configPaths: ConfigPathsSchema
}) { }

export type MasterConfig = InstanceType<typeof MasterConfigSchema>;