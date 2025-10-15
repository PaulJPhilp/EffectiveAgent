// Re-export from ConfigurationService for backward compatibility
export {type AgentConfig, 
    AgentConfigSchema,
    ConfigPathsSchema, type LoggingConfig, LoggingConfigSchema, type MasterConfig,MasterConfigSchema,
    type RuntimeSettings, 
    RuntimeSettingsSchema 
} from "@/services/core/configuration/schema.js";
