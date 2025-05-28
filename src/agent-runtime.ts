import { ConfigProvider, Context, Effect, Layer, Runtime, Logger, LogLevel, FiberRef, HashSet, Data } from 'effect';
import { FileSystem, PlatformLogger } from '@effect/platform';
import { NodeFileSystem } from '@effect/platform-node';
import path from 'path';

import { loadMasterConfigEffect } from './core/config/loader.js';
import { MasterConfigurationError } from './core/config/errors.js';
import type { MasterConfigData } from './core/config/master-config-schema.js';
import { MasterConfig } from './core/config/types.js';

/**
 * Custom error for issues specific to the AgentRuntime.
 */
export class AgentRuntimeError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AgentRuntimeError';
    // Ensure the prototype chain is correctly set for extending built-in Error
    Object.setPrototypeOf(this, AgentRuntimeError.prototype);
  }
}

// Forward declarations or imports for services - will be filled in later
// import { LoggingService } from './services/core/logging/service';
// import { ConfigurationService } from './services/core/configuration/service';
// import { ProviderService } from './services/ai/provider/service';
// import { ModelService } from './services/ai/model/service';
// import { PolicyService } from './services/ai/policy/service';

// Placeholder for the combined application dependency layer
// As services are added, they will be included in this context.
// This type represents the services available in the AgentRuntime's main runtime.
// CoreServicesContext now only contains universally available services after bootstrap
// Specific services required by the main application logic will be composed later.
// CoreServicesContext is a union of the essential services available in the runtime.
// MasterConfig is the Tag for MasterConfigData.
// FileSystem is the Tag for the FileSystem service.
type CoreServicesContext = MasterConfigData & FileSystem;

export class AgentRuntime {
  private readonly masterConfigData: MasterConfigData;
  // FileSystem will be accessed via effectRuntime
  private readonly effectRuntime: Runtime.Runtime<CoreServicesContext>;

  private constructor(args: {
    masterConfigData: MasterConfigData;
    effectRuntime: Runtime.Runtime<CoreServicesContext>;
  }) {
    this.masterConfigData = args.masterConfigData;
    this.effectRuntime = args.effectRuntime;
    Effect.logInfo('AgentRuntime initialized.');
  }

  /**
   * Initializes the AgentRuntime, loading configurations, setting up services,
   * and creating the main Effect runtime.
   */
  public static initialize(masterConfigData: MasterConfigData): Effect.Effect<AgentRuntime, AgentRuntimeError | MasterConfigurationError, never> {
    // Define a bootstrap layer for initial config loading
    // This layer provides a basic ConfigProvider and NodeFileSystem for reading the config file.
    const bootstrapLayer = Layer.succeed(
      ConfigProvider.ConfigProvider,
      ConfigProvider.fromMap(new Map())
    ).pipe(Layer.provideMerge(NodeFileSystem.layer));

    // Effect to perform all setup steps
    const setupEffect = Effect.gen(function* () {
      Effect.logInfo('Initializing AgentRuntime...');

      // 1. Load Master Configuration
      // This effect requires ConfigProvider and FileSystem (from bootstrapLayer)
      const masterConfigData = yield* loadMasterConfigEffect;
      yield* Effect.logDebug('Master configuration loaded successfully.');

      // 2. Determine and acquire FileSystem Implementation for the application
      // FileSystem will be provided by NodeFileSystem.layer in appLayer
      // No need to create an instance here manually for appLayer's direct use.

      // 3. Configure and Set Global Logger
      const { filePath, level: levelString } = masterConfigData.logging;
      const logLevel = 
        LogLevel.allLevels.find((l: LogLevel.LogLevel) => 
          l.label.toUpperCase() === levelString.toUpperCase()
        ) || LogLevel.Info;

      // Create the logger layer with file system
      const loggerLayer = Logger.replace(
        Logger.defaultLogger,
        Logger.logfmtLogger
      ).pipe(Layer.provide(NodeFileSystem.layer));

      // Log initialization message using the new logger
      yield* Effect.logInfo(
        `Global logger initialized. Level: ${logLevel.label}, Path: ${filePath}`
      ).pipe(Effect.provide(loggerLayer));

      // 4. Build the CoreServices Layer (AppLayer)
      // This layer provides MasterConfig (Tag for MasterConfigData) and FileSystem (Tag for FileSystem service)
      const appLayer = Layer.merge(
        Layer.succeed(MasterConfig, masterConfigData),
        NodeFileSystem.layer // This provides the FileSystem service
      );
      
      // 5. Build the Runtime from the AppLayer
      // The appLayer itself defines the CoreServicesContext. 
      // We don't need to yield context separately here before creating appRuntime from appLayer.
      const appRuntime = yield* Layer.toRuntime(appLayer).pipe(Effect.scoped);

      // 6. Construct AgentRuntime instance
      // The constructor expects an object with masterConfigData, fileSystem, and effectRuntime.
      return new AgentRuntime({
        masterConfigData, 
        effectRuntime: appRuntime
      });
    }).pipe(Effect.provide(bootstrapLayer)); // Provide the bootstrapLayer to the entire setupEffect

    // Map PlatformError to AgentRuntimeError
    return setupEffect.pipe(
      Effect.mapError(error => {
        if (error instanceof MasterConfigurationError) {
          return error;
        }
        return new AgentRuntimeError('AgentRuntime initialization failed', { cause: error });
      })
    );
  }

  /**
   * Runs an Effect with the runtime's services.
   */
  public runEffect<R, E, A>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, never> {
    return Effect.provide(effect, this.effectRuntime) as Effect.Effect<A, E, never>;
  }

  /**
   * Runs an Effect and returns a Promise of its result.
   */
  public runPromise<R, E, A>(effect: Effect.Effect<A, E, R>): Promise<A> {
    return Effect.runPromise(this.runEffect(effect));
  }

  /**
   * Shuts down the runtime and cleans up resources.
   */
  public async shutdown(): Promise<void> {
    await Effect.runPromise(
      Effect.gen(function* (_) {
        yield* Effect.logInfo('Shutting down AgentRuntime...');
        // Additional cleanup can be added here
      })
    );
  }
}
