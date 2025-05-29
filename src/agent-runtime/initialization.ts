import { BunFileSystem } from '@effect/platform-bun';
import { NodeFileSystem } from '@effect/platform-node';
import { Effect, Runtime } from "effect";

import { ConfigurationError } from '@/services/core/configuration/errors.js';
import { MasterConfig } from '@/services/core/configuration/master-schema.js';

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
          // Perform health checks
          yield* Effect.all([
            provider.healthCheck(),
            model.healthCheck(),
            policy.healthCheck()
          ]).pipe(
            Effect.mapError(error => new AgentRuntimeInitializationError({
              description: 'Service health check failed',
              module: 'AgentRuntime',
              method: 'initialize',
              cause: error
            }))
          );

          // Create the runtime with the appropriate file system
          const fileSystemLayer = masterConfig.runtimeSettings.fileSystemImplementation === 'bun'
            ? BunFileSystem.layer
            : NodeFileSystem.layer;

          return yield* Effect.runtime<RuntimeServices>().pipe(
            Effect.provide(fileSystemLayer)
          );
        }).pipe(
          Effect.mapError(error => {
            if (error instanceof ConfigurationError) {
              return error;
            }
            return new AgentRuntimeInitializationError({
              description: 'AgentRuntime initialization failed',
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
    ConfigurationService.Default
  ]
}) {}

export default InitializationService;
