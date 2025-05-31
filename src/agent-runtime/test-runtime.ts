import { BunFileSystem } from '@effect/platform-bun';
import { NodeFileSystem } from '@effect/platform-node';
import { Effect, Layer, Runtime } from "effect";

import { ConfigurationError } from '@/services/core/configuration/errors.js';
import { MasterConfig } from './schema.js';

import { ModelService } from '@/services/ai/model/service.js';
import { PolicyService } from '@/services/ai/policy/service.js';
import { ProviderService } from '@/services/ai/provider/service.js';
import { ConfigurationService } from '@/services/core/configuration/service.js';

import { AgentRuntimeInitializationError } from './errors.js';
import type { RuntimeServices } from './types.js';

/**
 * Service responsible for initializing the AgentRuntime with all required services
 * and performing health checks.
 */
export class InitializationService extends Effect.Service<{
  initialize: (config: MasterConfig) => Effect.Effect<Runtime.Runtime<RuntimeServices>, AgentRuntimeInitializationError | ConfigurationError>
}>()("InitializationService", {
  effect: Effect.gen(function* () {
    // Get all required services
    const provider = yield* ProviderService;
    const model = yield* ModelService;
    const policy = yield* PolicyService;
    const config = yield* ConfigurationService;

    return {
      initialize: (masterConfig: MasterConfig) =>
        Effect.gen(function* () {
          // Load all configurations using the ConfigurationService
          const configService = yield* ConfigurationService;

          // Load all service configurations from master config paths
          const [providerConfig, modelConfig, policyConfig] = yield* Effect.all([
            configService.loadProviderConfig(masterConfig.agents.providersConfigPath),
            configService.loadModelConfig(masterConfig.agents.modelsConfigPath),
            configService.loadPolicyConfig(masterConfig.agents.policiesConfigPath)
          ]).pipe(
            Effect.mapError(error => new AgentRuntimeInitializationError({
              description: 'Failed to load service configurations from master config',
              module: 'AgentRuntime',
              method: 'initialize',
              cause: error
            }))
          );

          // Create the runtime with the appropriate file system
          const fileSystemLayer = masterConfig.runtimeSettings.fileSystemImplementation === 'bun'
            ? BunFileSystem.layer
            : NodeFileSystem.layer;

          // Set environment variables for services to find their configurations
          yield* Effect.sync(() => {
            process.env.PROVIDERS_CONFIG_PATH = masterConfig.agents.providersConfigPath;
            process.env.MODELS_CONFIG_PATH = masterConfig.agents.modelsConfigPath;
            process.env.POLICY_CONFIG_PATH = masterConfig.agents.policiesConfigPath;
          });

          // Compose the complete application layer with all services
          const appLayer = Layer.mergeAll(
            fileSystemLayer,
            ProviderService.Default,
            ModelService.Default,
            PolicyService.Default,
            ConfigurationService.Default
          );

          return yield* Effect.runtime<any>().pipe(
            Effect.provide(appLayer)
          );
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
        )
    };
  }),
  dependencies: [
    ProviderService.Default,
    ModelService.Default,
    PolicyService.Default,
    ConfigurationService.Default,
    NodeFileSystem.layer
  ]
}) { }

export default InitializationService;
