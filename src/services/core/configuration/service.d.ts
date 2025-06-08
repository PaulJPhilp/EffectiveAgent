/**
 * @file Configuration service for loading and validating configuration files
 * @module services/core/configuration/service
 */
import { ModelFileSchema } from "@/services/ai/model/schema.js";
import { PolicyConfigFile } from "@/services/ai/policy/schema.js";
import { ProviderFile } from "@/services/ai/provider/schema.js";
import { FileSystem } from "@effect/platform";
import { Effect, Schema } from "effect";
import { ConfigurationServiceApi } from "./api.js";
import { ConfigParseError, ConfigReadError, ConfigValidationError } from "./errors.js";
import { MasterConfigSchema } from "./schema.js";
export interface ConfigurationSchemas {
    readonly providerSchema: Schema.Schema<any, any>;
    readonly policySchema: Schema.Schema<any, any>;
    readonly modelSchema: Schema.Schema<any, any>;
    readonly masterConfigSchema: Schema.Schema<any, any>;
}
declare const ConfigurationService_base: Effect.Service.Class<ConfigurationServiceApi, "ConfigurationService", {
    readonly effect: Effect.Effect<{
        loadConfig: <T>(filePath: string, schema: Schema.Schema<T, any, never>) => Effect.Effect<T, ConfigReadError | ConfigParseError | ConfigValidationError, FileSystem.FileSystem>;
        loadRawConfig: (filePath: string) => Effect.Effect<unknown, ConfigReadError | ConfigParseError, FileSystem.FileSystem>;
        loadProviderConfig: (filePath: string) => Effect.Effect<ProviderFile, ConfigReadError | ConfigParseError | ConfigValidationError, FileSystem.FileSystem>;
        loadModelConfig: (filePath: string) => Effect.Effect<ModelFileSchema, ConfigReadError | ConfigParseError | ConfigValidationError, FileSystem.FileSystem>;
        loadPolicyConfig: (filePath: string) => Effect.Effect<PolicyConfigFile, ConfigReadError | ConfigParseError | ConfigValidationError, FileSystem.FileSystem>;
        getApiKey: (provider: string) => Effect.Effect<string, never, never>;
        getEnvVariable: (name: string) => Effect.Effect<string, never, never>;
        getMasterConfig: () => Effect.Effect<MasterConfigSchema, never, never>;
    }, ConfigReadError | ConfigParseError | ConfigValidationError, FileSystem.FileSystem>;
}>;
export declare class ConfigurationService extends ConfigurationService_base {
}
export {};
//# sourceMappingURL=service.d.ts.map