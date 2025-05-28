import { FileSystem } from '@effect/platform/FileSystem';
import { NodeFileSystem } from '@effect/platform-node';
import { Config, ConfigProvider, Effect, Layer, Schema } from 'effect';
import { MasterConfigSchema, type MasterConfigData } from './master-config-schema.js'; // Updated import
import { MasterConfigurationError } from './errors.js';

const DEFAULT_MASTER_CONFIG_PATH = './config/master-config.json';
const MASTER_CONFIG_ENV_VAR = 'EFFECTIVE_AGENT_MASTER_CONFIG';

/**
 * An Effect that loads, parses, and validates the master configuration file.
 * It requires FileSystem and ConfigProvider in its context.
 */
const loadMasterConfigLogic = Effect.gen(function* () {
  const configProvider = yield* ConfigProvider.ConfigProvider;
  const fs = yield* FileSystem; // This will be the NodeFileSystem provided below

  // 1. Get the master config file path from environment or use default
  const masterConfigPath = yield* configProvider
    .load(Config.string(MASTER_CONFIG_ENV_VAR))
    .pipe(
      Effect.orElseSucceed(() => DEFAULT_MASTER_CONFIG_PATH),
      Effect.tap((path) => Effect.logDebug(`Using master config path: ${path}`))
    );

  // 2. Read the file content using FileSystem
  const rawConfig = yield* fs.readFileString(masterConfigPath).pipe(
    Effect.mapError(
      (cause) =>
        new MasterConfigurationError({
          message: `Failed to read master configuration file at: ${masterConfigPath}`,
          filePath: masterConfigPath,
          cause,
        })
    )
  );

  // 3. Parse and validate using Schema.decode
  let parsedConfig: unknown;
  try {
    parsedConfig = JSON.parse(rawConfig);
  } catch (error) {
    return yield* Effect.fail(
      new MasterConfigurationError({
        message: 'Failed to parse master configuration JSON.',
        filePath: masterConfigPath,
        cause: error,
      })
    );
  }

  const masterConfig = yield* Schema.decode(MasterConfigSchema)(parsedConfig as any).pipe(
    Effect.mapError((cause) => {
      // Log the detailed parse error for better debugging
      Effect.logError('Master configuration validation failed', cause);
      return new MasterConfigurationError({
        message: 'Master configuration validation failed.',
        filePath: masterConfigPath,
        cause,
      });
    })
  );

  return masterConfig as MasterConfigData;
});

/**
 * An Effect that loads, parses, and validates the master configuration file.
 * It requires ConfigProvider in its context and provides NodeFileSystem internally for bootstrap.
 */
export const loadMasterConfigEffect = loadMasterConfigLogic.pipe(
  Effect.provide(NodeFileSystem.layer) // Provide NodeFileSystem for bootstrap reading
);

