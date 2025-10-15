import { FileSystem, Path, PlatformLogger } from "@effect/platform";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { Effect, Logger, LogLevel, type Runtime } from "effect";
import { ModelService } from '@/services/ai/model/service.js';
import { PolicyService } from '@/services/ai/policy/service.js';
import { ProviderService } from '@/services/ai/provider/service.js';
import { ToolRegistryService } from '@/services/ai/tool-registry/service.js';
import type { ConfigurationError } from '@/services/core/configuration/errors.js';
import { ConfigurationService } from '@/services/core/configuration/index.js';
import { AgentRuntimeInitializationError } from './errors.js';
import type { MasterConfigSchema } from './schema.js';
import { AgentRuntimeService } from './service.js';
import type { RuntimeServices } from './types.js';

export interface InitializationServiceApi {
  readonly initialize: (config: MasterConfigSchema) => Effect.Effect<Runtime.Runtime<RuntimeServices>, AgentRuntimeInitializationError | ConfigurationError, never>
}

/**
 * Service responsible for initializing the AgentRuntime with all required services
 * and performing health checks.
 */
export interface InitializationServiceDeps {
  configurationService: ConfigurationService;
  modelService: ModelService;
  policyService: PolicyService;
  providerService: ProviderService;
  toolRegistryService: ToolRegistryService;
  agentRuntimeService: AgentRuntimeService;
}

export class InitializationService extends Effect.Service<InitializationServiceApi>()(
  "InitializationService",
  {
    effect: Effect.gen(function* () {
      const configurationService = yield* ConfigurationService;
      const modelService = yield* ModelService;
      const policyService = yield* PolicyService;
      const providerService = yield* ProviderService;
      const toolRegistryService = yield* ToolRegistryService;
      const agentRuntimeService = yield* AgentRuntimeService;

      return {
        initialize: (masterConfig: MasterConfigSchema): Effect.Effect<Runtime.Runtime<RuntimeServices>, AgentRuntimeInitializationError | ConfigurationError, never> =>
          Effect.gen(function* () {
            yield* Effect.logInfo("🚀 InitializationService.initialize() called");
            yield* Effect.logInfo("📋 Master config", {
              fileSystem: masterConfig.runtimeSettings.fileSystemImplementation,
              loggingLevel: masterConfig.logging?.level,
              loggingFilePath: masterConfig.logging?.filePath
            });

            // Get file system and path services
            const fs = yield* FileSystem.FileSystem;
            const path = yield* Path.Path;

            yield* Effect.logInfo("📂 FileSystem and Path services initialized");

            // Set up logging
            if (masterConfig.logging?.filePath) {
              const fileLogger = yield* Logger.logfmtLogger.pipe(
                PlatformLogger.toFile(masterConfig.logging.filePath),
                Effect.map(logger => Logger.zip(Logger.prettyLoggerDefault, logger))
              );
              yield* Effect.succeed(void 0).pipe(
                Effect.provide(Logger.replace(Logger.defaultLogger, fileLogger))
              );
            }

            yield* Effect.logInfo("📝 Logger configured", {
              hasFileLogging: !!masterConfig.logging?.filePath,
              filePath: masterConfig.logging?.filePath
            });

            // Set log level
            const level = masterConfig.logging?.level || 'info';
            const logLevel = (() => {
              switch (level) {
                case 'error': return LogLevel.Error;
                case 'warn': return LogLevel.Warning;
                case 'info': return LogLevel.Info;
                case 'debug': return LogLevel.Debug;
                case 'trace': return LogLevel.Trace;
                default: return LogLevel.Info;
              }
            })();
            yield* Effect.logDebug(`Setting log level to ${logLevel}`);
            yield* Effect.succeed(void 0).pipe(
              Effect.provide(Logger.minimumLogLevel(logLevel))
            );

            yield* Effect.logInfo("🎚️ Log level set", { level });

            // Create runtime with all services
            const runtime = yield* Effect.runtime<RuntimeServices>();

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
      ModelService.Default,
      PolicyService.Default,
      ProviderService.Default,
      ToolRegistryService.Default,
      NodeFileSystem.layer,
      NodePath.layer
    ]
  }
) { }

export default InitializationService;
