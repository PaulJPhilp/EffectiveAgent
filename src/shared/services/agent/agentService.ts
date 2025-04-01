// File: src/shared/services-effect/agent/agentService.ts

import { Effect, Layer } from "effect";
import type { JSONObject } from "../../../types.js";
import type { ModelService } from '../model/types.js';
import { ModelService as ModelServiceTag } from '../model/types.js';
import type { PromptService } from '../prompt/types.js';
import { PromptService as PromptServiceTag } from '../prompt/types.js';
import type { SkillService } from '../skill/types.js';
import { SkillService as SkillServiceTag } from '../skill/types.js';
import type { AgentConfig, AgentRun } from './schema.js';
import type {
  AgentErrors,
  AgentLogs,
  AgentState
} from './types.js';
import { AgentExecutionError, AgentService } from './types.js';

// --- Service Implementation Object Factory ---
const makeAgentService = (
  _modelService: ModelService,
  _promptService: PromptService,
  _skillService: SkillService,
  config: AgentConfig
): AgentService<JSONObject, JSONObject, JSONObject> => {
  const initializeErrors = (): AgentErrors => ({
    errors: [],
    errorCount: 0
  });

  const initializeLogs = (): AgentLogs => ({
    logs: [],
    logCount: 0
  });

  const initializeAgentRun = (_config: AgentConfig): AgentRun => ({
    id: crypto.randomUUID(),
    startTime: new Date().toISOString(),
    status: 'running'
  });

  const initializeState = (config: AgentConfig, input: JSONObject): AgentState<JSONObject, JSONObject, JSONObject> => ({
    config,
    agentRun: initializeAgentRun(config),
    status: {
      overallStatus: 'running',
      nodeHistory: [],
      currentNode: config.graph.start_node_id
    },
    logs: initializeLogs(),
    errors: initializeErrors(),
    input,
    output: {} as JSONObject,
    agentState: {} as JSONObject
  });

  return {
    run: (input: JSONObject) => {
      return Effect.gen(function* (_$) {
        const state = initializeState(config, input);

        try {
          // TODO: Implement graph execution logic here
          // This will involve:
          // 1. Node execution
          // 2. Edge traversal
          // 3. State updates
          // 4. Error handling

          return state;
        } catch (error) {
          // Re-throw using the tagged error format
          throw new AgentExecutionError({
            message: `Agent execution failed: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      });
    },

    buildGraph: () => {
      return Effect.try({
        try: () => {
          // TODO: Implement graph building logic
          // This will create the execution graph based on the config
        },
        // Use the tagged error format
        catch: (error) => new AgentExecutionError({
          message: `Failed to build agent graph: ${error instanceof Error ? error.message : String(error)}`
        })
      });
    },

    saveLangGraphConfig: (_outputPath?: string) => {
      return Effect.try({
        try: () => {
          // TODO: Implement config saving logic
          // This will save the graph configuration to a file
        },
        // Use the tagged error format
        catch: (error) => new AgentExecutionError({
          message: `Failed to save graph config: ${error instanceof Error ? error.message : String(error)}`
        })
      });
    }
  };
};

// --- Service Layer Definition ---
export const AgentServiceLive = (
  config: AgentConfig
) => Layer.effect(
  AgentService,
  Effect.map(
    Effect.all([
      ModelServiceTag,
      PromptServiceTag,
      SkillServiceTag
    ]),
    ([modelService, promptService, skillService]) =>
      makeAgentService(modelService, promptService, skillService, config)
  )
);
