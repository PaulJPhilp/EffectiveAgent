// File: src/shared/services-effect/agent/agentConfigurationService.ts

import { FileSystem } from "@effect/platform/FileSystem";
import { Effect, Layer } from "effect";
import { ConfigLoader } from '../configuration/types.js';
import type { AgentConfig } from './schema.js';
import { AgentConfigSchema } from './schema.js';
import type { AgentConfigurationService } from './types.js';
import { AgentConfigurationService as AgentConfigServiceTag, AgentConfigurationError } from './types.js';

// --- Service Implementation Object Factory ---
const makeAgentConfigurationService = (configLoader: ConfigLoader): AgentConfigurationService => ({
  loadConfig: (configPath: string) =>
    Effect.gen(function* () {
      yield* Effect.logDebug(`Loading agent config from: ${configPath}`);
      const result = yield* configLoader.loadConfig<AgentConfig>(configPath, {
        schema: AgentConfigSchema,
        validate: true
      });
      return {
        ...result,
        graph: {
          nodes: [{
            type: 'default',
            id: 'start',
            next: ['end'],
            data: undefined,
            conditions: undefined
          }],
          edges: [{
            from: 'start',
            to: 'end'
          }],
          start_node_id: 'start'
        }
      }
    }).pipe(
      Effect.mapError((error: unknown) => new AgentConfigurationError({
        message: `Failed to load agent config: ${error instanceof Error ? error.message : String(error)}`
      }))
    ),

  validateConfig: (config: AgentConfig) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem;

      // Helper to check path existence
      const checkPath = (path: string, context: string) =>
        Effect.gen(function* () {
          const exists = yield* fs.exists(path);
          if (!exists) {
            return yield* Effect.fail(
              new AgentConfigurationError({
                message: `${context} path does not exist: ${path}`
              })
            );
          }
        });

      // Check paths
      yield* Effect.all([
        checkPath(config.standardLibrary.path, 'Standard library'),
        config.agentLibrary
          ? checkPath(config.agentLibrary.path, 'Agent library')
          : Effect.succeed(undefined)
      ], { concurrency: 'unbounded' });

      return yield* Effect.succeed(undefined);
    }).pipe(
      Effect.mapError((error): AgentConfigurationError =>
        error instanceof AgentConfigurationError ? error :
          new AgentConfigurationError({
            message: `Failed to validate config: ${error}`
          })
      )
    )
});

// --- Service Layer Definition ---
/**
 * Live Layer for the AgentConfigurationService.
 * Requires ConfigLoader from context.
 */
export const AgentConfigurationServiceLive = Layer.effect(
  AgentConfigServiceTag,
  Effect.map(
    Effect.all([ConfigLoader]),
    ([configLoader]) => makeAgentConfigurationService(configLoader)
  )
);