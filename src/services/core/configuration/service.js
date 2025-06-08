/**
 * @file Configuration service for loading and validating configuration files
 * @module services/core/configuration/service
 */
import { ModelFileSchema } from "@/services/ai/model/schema.js";
import { PolicyConfigFile } from "@/services/ai/policy/schema.js";
import { ProviderFile } from "@/services/ai/provider/schema.js";
import { FileSystem } from "@effect/platform";
import { Effect, Schema } from "effect";
import { ConfigParseError, ConfigReadError, ConfigValidationError } from "./errors.js";
import { MasterConfigSchema } from "./schema.js";
const readFile = (filePath) => Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    return yield* fs.readFileString(filePath, "utf8").pipe(Effect.mapError(error => new ConfigReadError({
        filePath,
        cause: error
    })));
});
const parseJson = (content, filePath) => Effect.try({
    try: () => JSON.parse(content),
    catch: error => new ConfigParseError({
        filePath,
        cause: error
    })
});
const validateWithSchema = (data, schema, filePath) => Schema.decode(schema)(data).pipe(Effect.mapError((error) => new ConfigValidationError({
    filePath,
    validationError: error
})));
const makeConfigurationService = Effect.gen(function* () {
    const masterConfigPath = process.env.MASTER_CONFIG_PATH ||
        process.env.EFFECTIVE_AGENT_MASTER_CONFIG ||
        "./config/master-config.json";
    const masterConfigContent = yield* readFile(masterConfigPath);
    const masterConfigParsed = yield* parseJson(masterConfigContent, masterConfigPath);
    const masterConfig = yield* validateWithSchema(masterConfigParsed, MasterConfigSchema, masterConfigPath);
    return {
        loadConfig: (filePath, schema) => Effect.gen(function* () {
            const content = yield* readFile(filePath);
            const parsed = yield* parseJson(content, filePath);
            return yield* validateWithSchema(parsed, schema, filePath);
        }),
        loadRawConfig: (filePath) => Effect.gen(function* () {
            const content = yield* readFile(filePath);
            return yield* parseJson(content, filePath);
        }),
        loadProviderConfig: (filePath) => Effect.gen(function* () {
            const effectiveFilePath = masterConfig.configPaths?.providers || filePath;
            const content = yield* readFile(effectiveFilePath);
            const parsed = yield* parseJson(content, effectiveFilePath);
            return yield* validateWithSchema(parsed, ProviderFile, effectiveFilePath);
        }),
        loadModelConfig: (filePath) => Effect.gen(function* () {
            const effectiveFilePath = masterConfig.configPaths?.models || filePath;
            const content = yield* readFile(effectiveFilePath);
            const parsed = yield* parseJson(content, effectiveFilePath);
            return yield* validateWithSchema(parsed, ModelFileSchema, effectiveFilePath);
        }),
        loadPolicyConfig: (filePath) => Effect.gen(function* () {
            const effectiveFilePath = masterConfig.configPaths?.policy || filePath;
            const content = yield* readFile(effectiveFilePath);
            const parsed = yield* parseJson(content, effectiveFilePath);
            return yield* validateWithSchema(parsed, PolicyConfigFile, effectiveFilePath);
        }),
        getApiKey: (provider) => Effect.sync(() => process.env[`${provider.toUpperCase()}_API_KEY`] ?? ""),
        getEnvVariable: (name) => Effect.sync(() => process.env[name] ?? ""),
        getMasterConfig: () => Effect.succeed(masterConfig)
    };
});
export class ConfigurationService extends Effect.Service()("ConfigurationService", {
    effect: makeConfigurationService
}) {
}
// Legacy alias – keep until downstream files migrate to explicit Layer composition
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – dynamically attach property for backward compatibility
if (!("Default" in ConfigurationService)) {
    ;
    ConfigurationService.Default = ConfigurationService;
}
//# sourceMappingURL=service.js.map