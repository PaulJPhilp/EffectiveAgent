// Re-export from ConfigurationService for backward compatibility
export {
    AgentConfigSchema,
    ConfigPathsSchema, LoggingConfigSchema, MasterConfigSchema,
    RuntimeSettingsSchema, type AgentConfig, type LoggingConfig, type MasterConfig,
    type RuntimeSettings
} from "@/services/core/configuration/schema.js";
