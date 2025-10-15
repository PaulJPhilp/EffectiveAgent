/**
 * @file Configuration service for loading and validating configuration files
 * @module services/core/configuration/service
 */

import { FileSystem, Path } from "@effect/platform";
import { Duration, Effect, Schema } from "effect";
import type { ParseError } from "effect/ParseResult";
import { EffectiveError } from "@/errors.js";
import { ModelFileSchema } from "@/services/ai/model/schema.js";
import { PolicyConfigFile } from "@/services/ai/policy/schema.js";
import { ProviderFile } from "@/services/ai/provider/schema.js";
import {
  type CircuitBreakerConfig,
  ResilienceService,
  type RetryPolicy,
} from "@/services/execution/resilience/index.js";
import type { ConfigurationServiceApi } from "./api.js";
import {
  ConfigParseError,
  ConfigReadError,
  ConfigValidationError,
} from "./errors.js";
import { MasterConfigSchema } from "./schema.js";

// Resilience configurations for file operations
const FILE_READ_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelay: Duration.millis(100),
  maxDelay: Duration.seconds(2),
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: [],
  nonRetryableErrors: [],
};

const FILE_READ_CIRCUIT_BREAKER: CircuitBreakerConfig = {
  name: "configuration-file-read",
  failureThreshold: 5,
  resetTimeout: Duration.seconds(30),
  halfOpenMaxAttempts: 2,
};

const parseJson = (
  content: string,
  filePath: string
): Effect.Effect<unknown, ConfigParseError> =>
  Effect.try({
    try: () => JSON.parse(content),
    catch: (error) =>
      new ConfigParseError({
        filePath,
        cause: error,
      }),
  });

const validateWithSchema = <T>(
  data: unknown,
  schema: Schema.Schema<T, any>,
  filePath: string
): Effect.Effect<T, ConfigValidationError> =>
  Schema.decode(schema)(data).pipe(
    Effect.mapError(
      (error: ParseError) =>
        new ConfigValidationError({
          filePath,
          validationError: error,
        })
    ),
    Effect.tap(() => Effect.logDebug(`Successfully validated ${filePath}`))
  );

export interface ConfigurationSchemas {
  readonly providerSchema: Schema.Schema<any, any>;
  readonly policySchema: Schema.Schema<any, any>;
  readonly modelSchema: Schema.Schema<any, any>;
  readonly masterConfigSchema: Schema.Schema<any, any>;
}

export const make = Effect.gen(function* () {
  const path = yield* Path.Path;
  const fs = yield* FileSystem.FileSystem;
  const resilience = yield* ResilienceService;

  // Enhanced file reading with resilience patterns
  const readFile = (filePath: string): Effect.Effect<string, ConfigReadError> =>
    Effect.gen(function* () {
      // Create a resilient file read operation
      const resilientFileRead = Effect.gen(function* () {
        // Convert to EffectiveError for resilience compatibility
        const fileReadOperation = fs.readFileString(filePath, "utf8").pipe(
          Effect.mapError(
            (error) =>
              new EffectiveError({
                description: `Failed to read file: ${filePath}`,
                module: "ConfigurationService",
                method: "readFile",
                cause: error,
              })
          )
        );

        // Apply resilience patterns
        return yield* resilience.withCircuitBreaker(
          resilience.withRetry(fileReadOperation, FILE_READ_RETRY_POLICY),
          FILE_READ_CIRCUIT_BREAKER
        );
      });

      // Execute resilient operation and convert errors back to ConfigReadError
      return yield* resilientFileRead.pipe(
        Effect.mapError(
          (error) =>
            new ConfigReadError({
              filePath,
              cause: error,
            })
        )
      );
    });

  const projectRoot = process.env.PROJECT_ROOT || process.cwd();
  const masterConfigPath =
    process.env.MASTER_CONFIG_PATH ||
    process.env.EFFECTIVE_AGENT_MASTER_CONFIG ||
    path.join(projectRoot, "ea-config/master-config.json");

  // Resolve masterConfigPath to an absolute path to make subsequent resolutions robust
  const absoluteMasterConfigPath = path.resolve(masterConfigPath);
  const masterConfigDir = path.dirname(absoluteMasterConfigPath);

  yield* Effect.logDebug(
    `Loading master config from ${absoluteMasterConfigPath}`
  );
  const masterConfigContent = yield* readFile(absoluteMasterConfigPath);
  const masterConfigParsed = yield* parseJson(
    masterConfigContent,
    absoluteMasterConfigPath
  );
  const masterConfig: Schema.Schema.Type<typeof MasterConfigSchema> =
    yield* validateWithSchema(
      masterConfigParsed,
      MasterConfigSchema,
      absoluteMasterConfigPath
    );

  // Enhanced loadConfig with resilience
  const loadConfigWithResilience = <T>(
    filePath: string,
    schema: Schema.Schema<T, any>
  ) =>
    Effect.gen(function* () {
      const path = yield* Path.Path;
      const resolvedPath = path.resolve(masterConfigDir, filePath);

      yield* Effect.logDebug(`Loading config with resilience: ${resolvedPath}`);

      const content = yield* readFile(resolvedPath);
      const parsed = yield* parseJson(content, resolvedPath);
      return yield* validateWithSchema(parsed, schema, resolvedPath);
    });

  return {
    loadConfig: loadConfigWithResilience,

    loadRawConfig: (filePath: string) =>
      Effect.gen(function* () {
        const content = yield* readFile(filePath);
        return yield* parseJson(content, filePath);
      }),

    loadProviderConfig: (filePath: string) =>
      Effect.gen(function* () {
        let effectiveFilePath = filePath;
        if (masterConfig.configPaths?.providers) {
          effectiveFilePath = path.resolve(
            masterConfigDir,
            masterConfig.configPaths.providers
          );
          yield* Effect.logDebug(
            `Resolved provider config path: ${effectiveFilePath}`
          );
        }
        yield* Effect.logDebug(
          `Loading provider config from ${effectiveFilePath}`
        );
        return yield* loadConfigWithResilience(effectiveFilePath, ProviderFile);
      }),

    loadModelConfig: (filePath: string) =>
      Effect.gen(function* () {
        let effectiveFilePath = filePath;
        if (masterConfig.configPaths?.models) {
          effectiveFilePath = path.resolve(
            masterConfigDir,
            masterConfig.configPaths.models
          );
          yield* Effect.logDebug(
            `Resolved model config path: ${effectiveFilePath}`
          );
        }
        yield* Effect.logDebug(
          `Loading model config from ${effectiveFilePath}`
        );
        return yield* loadConfigWithResilience(
          effectiveFilePath,
          ModelFileSchema
        );
      }),

    loadPolicyConfig: (filePath: string) =>
      Effect.gen(function* () {
        let effectiveFilePath = filePath;
        if (masterConfig.configPaths?.policy) {
          effectiveFilePath = path.resolve(
            masterConfigDir,
            masterConfig.configPaths.policy
          );
          yield* Effect.logDebug(
            `Resolved policy config path: ${effectiveFilePath}`
          );
        }
        yield* Effect.logDebug(
          `Loading policy config from ${effectiveFilePath}`
        );
        return yield* loadConfigWithResilience(
          effectiveFilePath,
          PolicyConfigFile
        );
      }),

    getApiKey: (provider: string) =>
      Effect.sync(() => process.env[`${provider.toUpperCase()}_API_KEY`] ?? ""),

    getEnvVariable: (name: string) =>
      Effect.sync(() => process.env[name] ?? ""),

    getMasterConfig: () => Effect.succeed(masterConfig),
  };
});

export class ConfigurationService extends Effect.Service<ConfigurationServiceApi>()(
  "ConfigurationService",
  {
    effect: make,
    dependencies: [ResilienceService.Default],
  }
) { }
