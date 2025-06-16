import { PlatformLogger } from '@effect/platform';
import { BunFileSystem } from '@effect/platform-bun';
import { NodeFileSystem } from '@effect/platform-node';
import { Effect, Layer, LogLevel, Logger, Runtime } from "effect";

import { ConfigurationError } from '@/services/core/configuration/errors.js';
import { MasterConfig } from './schema.js';

import { ModelService } from '@/services/ai/model/service.js';
import { PolicyService } from '@/services/ai/policy/service.js';
import { ProviderService } from '@/services/ai/provider/service.js';
import { ConfigurationService } from '@/services/core/configuration/service.js';

import { AgentRuntimeInitializationError } from './errors.js';
import type { RuntimeServices } from './types.js';

export interface InitializationServiceApi {
  readonly initialize: (config: MasterConfig) => Effect.Effect<Runtime.Runtime<RuntimeServices>, AgentRuntimeInitializationError | ConfigurationError, never>
}

/**
 * Service responsible for initializing the AgentRuntime with all required services
 * and performing health checks.
 */
export class InitializationService extends Effect.Service<InitializationServiceApi>()("InitializationService", {
  effect: Effect.gen(function* () {
    return {
      initialize: (masterConfig: MasterConfig) =>
        Effect.gen(function* () {
          yield* Effect.logInfo("🚀 InitializationService.initialize() called");
          yield* Effect.logInfo("📋 Master config", {
            fileSystem: masterConfig.runtimeSettings.fileSystemImplementation,
            loggingLevel: masterConfig.logging?.level,
            loggingFilePath: masterConfig.logging?.filePath
          });

          // Create the runtime with the appropriate file system
          const fileSystemLayer = masterConfig.runtimeSettings.fileSystemImplementation === 'bun'
            ? BunFileSystem.layer
            : NodeFileSystem.layer;

          yield* Effect.logInfo("📂 FileSystem layer created", {
            implementation: masterConfig.runtimeSettings.fileSystemImplementation
          });

          // Create file logger based on master config
          const fileLoggerLayer = masterConfig.logging?.filePath
            ? Logger.replaceScoped(
              Logger.defaultLogger,
              Effect.map(
                Logger.logfmtLogger.pipe(PlatformLogger.toFile(masterConfig.logging.filePath)),
                (fileLogger) => Logger.zip(Logger.prettyLoggerDefault, fileLogger)
              )
            )
            : Layer.empty;

          yield* Effect.logInfo("📝 Logger layer created", {
            hasFileLogging: !!masterConfig.logging?.filePath,
            filePath: masterConfig.logging?.filePath
          });

          // Set log level based on master config
          const logLevelLayer = masterConfig.logging?.level
            ? (() => {
              const level = masterConfig.logging.level;
              switch (level) {
                case 'error': return Logger.minimumLogLevel(LogLevel.Error);
                case 'warn': return Logger.minimumLogLevel(LogLevel.Warning);
                case 'info': return Logger.minimumLogLevel(LogLevel.Info);
                case 'debug': return Logger.minimumLogLevel(LogLevel.Debug);
                case 'trace': return Logger.minimumLogLevel(LogLevel.Trace);
                default: return Logger.minimumLogLevel(LogLevel.Info);
              }
            })()
            : Logger.minimumLogLevel(LogLevel.Info);

          yield* Effect.logInfo("🎚️ Log level layer created", {
            level: masterConfig.logging?.level || 'info'
          });

          // Compose the complete application layer with all services
          yield* Effect.logInfo("🔧 Composing application layer with services");
          const appLayer = Layer.mergeAll(
            fileSystemLayer,
            fileLoggerLayer,
            logLevelLayer,
            ConfigurationService.Default,
            ProviderService.Default,
            ModelService.Default,
            PolicyService.Default
          );

          yield* Effect.logInfo("⚡ Creating Effect runtime from application layer");
          const runtime = yield* Effect.runtime<RuntimeServices>().pipe(
            Effect.provide(appLayer)
          );

          yield* Effect.logInfo("✅ InitializationService.initialize() completed successfully");
          return runtime;
        }).pipe(
          Effect.mapError((error: unknown) => {
            if (error && typeof error === 'object' && '_tag' in error && error._tag === 'ConfigurationError') {
              return error as ConfigurationError;
            }
            return new AgentRuntimeInitializationError({
              description: 'Failed to initialize AgentRuntime',
              module: 'AgentRuntime',
              method: 'initialize',
              cause: error
            });
          })
        ) as Effect.Effect<Runtime.Runtime<RuntimeServices>, AgentRuntimeInitializationError | ConfigurationError, never>
    } satisfies InitializationServiceApi;
  }),
  dependencies: [
    ConfigurationService.Default,
    ProviderService.Default,
    ModelService.Default,
    PolicyService.Default,
    NodeFileSystem.layer
  ]
}) { }

export default InitializationService;
