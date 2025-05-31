import { Schema } from 'effect';

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

/**
 * Master configuration schema for AgentRuntime
 */
export const MasterConfigSchema = Schema.Struct({
    runtimeSettings: RuntimeSettingsSchema,
    logging: LoggingConfigSchema,
    agents: AgentConfigSchema
});

export type MasterConfig = Schema.Schema.Type<typeof MasterConfigSchema>;
export type RuntimeSettings = Schema.Schema.Type<typeof RuntimeSettingsSchema>;
export type LoggingConfig = Schema.Schema.Type<typeof LoggingConfigSchema>;
export type AgentConfig = Schema.Schema.Type<typeof AgentConfigSchema>; 