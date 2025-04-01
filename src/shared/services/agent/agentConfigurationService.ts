// File: src/shared/services-effect/agent/agentConfigurationService.ts

import { FileSystem } from "@effect/platform/FileSystem";
import { Path } from "@effect/platform/Path";
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
    ) as Effect.Effect<
      AgentConfig,
      AgentConfigurationError,
      Path | FileSystem
    >,

  validateConfig: (config: AgentConfig) =>
    Effect.try({
      try: () => {
        // Validate graph structure
        const { nodes, edges } = config.graph;

        // Ensure all edge references exist
        for (const edge of edges) {
          const fromNode = nodes.find((n: { id: string }) => n.id === edge.from);
          const toNode = nodes.find((n: { id: string }) => n.id === edge.to);

          if (!fromNode) {
            throw new AgentConfigurationError({
              message: `Invalid edge: source node '${edge.from}' not found`
            });
          }

          if (!toNode) {
            throw new AgentConfigurationError({
              message: `Invalid edge: target node '${edge.to}' not found`
            });
          }
        }
      },
      catch: (error) => new AgentConfigurationError({
        message: `Failed to validate agent configuration: ${error instanceof Error ? error.message : String(error)}`
      })
    })
}); // End of makeAgentConfigurationService

// --- Service Layer Definition ---
export const AgentConfigurationServiceLive = Layer.effect(
  AgentConfigServiceTag,
  Effect.gen(function* () {
    const configLoader = yield* ConfigLoader;
    return makeAgentConfigurationService(configLoader);
  })
);