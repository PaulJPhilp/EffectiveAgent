/**
 * @file Configuration service for loading and validating configuration files
 * @module services/core/configuration/service
 */

import { ModelFileSchema } from "@/services/ai/model/schema.js";
import { PolicyConfigFile } from "@/services/ai/policy/schema.js";
import { ProviderFile } from "@/services/ai/provider/schema.js";
import { FileSystem } from "@effect/platform";
import { Effect, Schema } from "effect";
import { ParseError } from "effect/ParseResult";
import { ConfigurationServiceApi } from "./api.js";
import { ConfigParseError, ConfigReadError, ConfigValidationError } from "./errors.js";
import { MasterConfigSchema } from "./schema.js";

const readFile = (filePath: string): Effect.Effect<string, ConfigReadError, FileSystem.FileSystem> =>
    Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        return yield* fs.readFileString(filePath, "utf8").pipe(
            Effect.mapError(error => new ConfigReadError({
                filePath,
                cause: error
            }))
        );
    });

const parseJson = (content: string, filePath: string): Effect.Effect<unknown, ConfigParseError> =>
    Effect.try({
        try: () => JSON.parse(content),
        catch: error => new ConfigParseError({
            filePath,
            cause: error
        })
    });

const validateWithSchema = <T>(data: unknown, schema: Schema.Schema<T, any>, filePath: string): Effect.Effect<T, ConfigValidationError> =>
    Schema.decode(schema)(data).pipe(
        Effect.mapError((error: ParseError) => new ConfigValidationError({
            filePath,
            validationError: error
        }))
    );

export interface ConfigurationSchemas {
    readonly providerSchema: Schema.Schema<any, any>;
    readonly policySchema: Schema.Schema<any, any>;
    readonly modelSchema: Schema.Schema<any, any>;
    readonly masterConfigSchema: Schema.Schema<any, any>;
}

const makeConfigurationService = Effect.gen(function* () {
    const masterConfigPath = process.env.MASTER_CONFIG_PATH ||
        process.env.EFFECTIVE_AGENT_MASTER_CONFIG ||
        "./config/master-config.json";

    const masterConfigContent = yield* readFile(masterConfigPath);
    const masterConfigParsed = yield* parseJson(masterConfigContent, masterConfigPath);
    const masterConfig: Schema.Schema.Type<typeof MasterConfigSchema> =
        yield* validateWithSchema(masterConfigParsed, MasterConfigSchema, masterConfigPath);

    return {
        loadConfig: <T>(filePath: string, schema: Schema.Schema<T, any>) =>
            Effect.gen(function* () {
                const content = yield* readFile(filePath);
                const parsed = yield* parseJson(content, filePath);
                return yield* validateWithSchema(parsed, schema, filePath);
            }),

        loadRawConfig: (filePath: string) =>
            Effect.gen(function* () {
                const content = yield* readFile(filePath);
                return yield* parseJson(content, filePath);
            }),

        loadProviderConfig: (filePath: string) =>
            Effect.gen(function* () {
                const effectiveFilePath = masterConfig.configPaths?.providers || filePath;
                const content = yield* readFile(effectiveFilePath);
                const parsed = yield* parseJson(content, effectiveFilePath);
                return yield* validateWithSchema(parsed, ProviderFile, effectiveFilePath);
            }),

        loadModelConfig: (filePath: string) =>
            Effect.gen(function* () {
                const effectiveFilePath = masterConfig.configPaths?.models || filePath;
                const content = yield* readFile(effectiveFilePath);
                const parsed = yield* parseJson(content, effectiveFilePath);
                return yield* validateWithSchema(parsed, ModelFileSchema, effectiveFilePath);
            }),

        loadPolicyConfig: (filePath: string) =>
            Effect.gen(function* () {
                const effectiveFilePath = masterConfig.configPaths?.policy || filePath;
                const content = yield* readFile(effectiveFilePath);
                const parsed = yield* parseJson(content, effectiveFilePath);
                return yield* validateWithSchema(parsed, PolicyConfigFile, effectiveFilePath);
            }),

        getApiKey: (provider: string) =>
            Effect.sync(() =>
                process.env[`${provider.toUpperCase()}_API_KEY`] ?? ""
            ),

        getEnvVariable: (name: string) =>
            Effect.sync(() =>
                process.env[name] ?? ""
            ),

        getMasterConfig: () => Effect.succeed(masterConfig)
    };
});

export class ConfigurationService extends Effect.Service<ConfigurationServiceApi>()(
    "ConfigurationService",
    {
        effect: makeConfigurationService
    }
) { }

// Legacy alias – keep until downstream files migrate to explicit Layer composition
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – dynamically attach property for backward compatibility
if (!("Default" in ConfigurationService)) {
    ; (ConfigurationService as any).Default = ConfigurationService;
}

