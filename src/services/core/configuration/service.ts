/**
 * @file Configuration service for loading and validating configuration files
 * @module services/core/configuration/service
 */

import { PolicyConfigFile } from "@/services/ai/policy/schema.js";
import { ProviderFile } from "@/services/ai/provider/schema.js";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Schema } from "effect";
import { ConfigurationServiceApi, LoadConfigOptions } from "./api.js";
import { ConfigParseError, ConfigReadError, ConfigValidationError } from "./errors.js";

const readFile: (filePath: string) => Effect.Effect<string, ConfigReadError> = (filePath: string) => Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    return yield* fs.readFileString(filePath, "utf8").pipe(
        Effect.mapError(error => new ConfigReadError({
            filePath,
            cause: error
        }))
    );
}).pipe(Effect.provide(NodeFileSystem.layer))

const parseJson = (content: string, filePath: string) =>
    Effect.try({
        try: () => JSON.parse(content),
        catch: error => new ConfigParseError({
            filePath,
            cause: error
        })
    })


const validateWithSchema = <T>(
    data: unknown,
    schema: Schema.Schema<T, T>,
    filePath: string
) =>
    Schema.decode(schema)(data as T).pipe(
        Effect.mapError(error => new ConfigValidationError({
            filePath,
            validationError: error
        }))
    )

export class ConfigurationService extends Effect.Service<ConfigurationServiceApi>()(
    "ConfigurationService",
    {

        scoped: Effect.gen(function* (): Generator<any, ConfigurationServiceApi> {

            return {

                loadConfig: <T>({
                    filePath,
                    schema
                }: LoadConfigOptions<T>) =>
                    Effect.gen(function* () {
                        const content = yield* readFile(filePath);
                        const parsed = yield* parseJson(content, filePath);
                        return yield* validateWithSchema(parsed, schema, filePath);
                    }),

                loadProviderConfig: (filePath: string) =>
                    Effect.gen(function* () {
                        const content = yield* readFile(filePath);
                        const parsed = yield* parseJson(content, filePath);
                        return yield* validateWithSchema(parsed, ProviderFile, filePath);
                    }),

                loadModelConfig: (filePath: string) =>
                    Effect.gen(function* () {
                        const content = yield* readFile(filePath);
                        return yield* parseJson(content, filePath);
                    }),

                loadPolicyConfig: (filePath: string) =>
                    Effect.gen(function* () {
                        const content = yield* readFile(filePath);
                        const parsed = yield* parseJson(content, filePath);
                        return yield* validateWithSchema(parsed, PolicyConfigFile, filePath);
                    }),

                getApiKey: (provider: string) =>
                    Effect.sync(() =>
                        process.env[`${provider.toUpperCase()}_API_KEY`] ?? ""
                    ),

                getEnvVariable: (name: string) =>
                    Effect.sync(() =>
                        process.env[name] ?? ""
                    )
            };
        }),
        dependencies: [NodeFileSystem.layer]
    }
) { }

/**
 * Default export for the ConfigurationService.
 */
export default ConfigurationService;
