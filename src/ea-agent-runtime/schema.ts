// Re-export from ConfigurationService for backward compatibility
export {
    AgentConfigSchema,
    ConfigPathsSchema,
    LoggingConfigSchema,
    MasterConfigSchema,
    RuntimeSettingsSchema
} from "@/services/core/configuration/schema.js";

export type { MasterConfig } from "@/services/core/configuration/schema.js";
