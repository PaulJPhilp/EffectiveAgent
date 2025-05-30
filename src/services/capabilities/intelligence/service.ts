/**
 * @file Implements the Intelligence service for managing AI intelligence configurations.
 * @module services/capabilities/intelligence/service
 */

import { AgentRuntimeService, makeAgentRuntimeId } from "@/agent-runtime/index.js";
import { Effect, Option, Ref } from "effect";
import type { IntelligenceServiceApi } from "./api.js";
import { IntelligenceConfigError } from "./errors.js";
import { IntelligenceFile, type IntelligenceType } from "./schema.js";

/**
 * Intelligence service agent state
 */
export interface IntelligenceAgentState {
  readonly loadCount: number
  readonly lastLoad: Option.Option<number>
  readonly intelligences: ReadonlyArray<IntelligenceType>
}

/**
 * Service implementation for managing intelligence configurations with AgentRuntime integration.
 */
export class IntelligenceService extends Effect.Service<IntelligenceServiceApi>()(
  "IntelligenceService",
  {
    effect: Effect.gen(function* () {
      const agentRuntimeService = yield* AgentRuntimeService;
      const agentId = makeAgentRuntimeId("intelligence-service-agent");

      const initialState: IntelligenceAgentState = {
        loadCount: 0,
        lastLoad: Option.none(),
        intelligences: []
      };

      // Create internal state and agent runtime
      const internalStateRef = yield* Ref.make<IntelligenceAgentState>(initialState);
      const runtime = yield* agentRuntimeService.create(agentId, initialState);

      yield* Effect.log("IntelligenceService agent initialized");

      const service: IntelligenceServiceApi = {
        load: () => Effect.gen(function* () {
          // Get intelligences from AgentRuntime state
          const runtimeState = yield* runtime.getState();

          // Load intelligences from the agent runtime configuration
          const intelligences = runtimeState.state.intelligences || [];

          // Update internal state to track load
          const currentState = yield* Ref.get(internalStateRef);
          const newState: IntelligenceAgentState = {
            ...currentState,
            loadCount: currentState.loadCount + 1,
            lastLoad: Option.some(Date.now()),
            intelligences
          };
          yield* Ref.set(internalStateRef, newState);

          const intelligenceFile: IntelligenceFile = {
            name: "agent-intelligences",
            version: "1.0.0",
            intelligences
          };

          yield* Effect.log("IntelligenceService: loaded intelligences from agent runtime", {
            intelligenceCount: intelligences.length
          });

          return intelligenceFile;
        }),

        // GetProfile method implementation
        getProfile: (name: string) =>
          Effect.gen(function* () {
            // First load the configuration
            const config = yield* service.load();

            // Find the profile by name
            const profile = config.intelligences.find((p: IntelligenceType) => p.name === name);

            // Return error if profile not found
            if (!profile) {
              return yield* Effect.fail(new IntelligenceConfigError({
                description: `Intelligence profile '${name}' not found`,
                module: "IntelligenceService",
                method: "getProfile"
              }));
            }

            // Return the found profile
            return profile;
          })
      };

      return service;
    }),
    dependencies: [AgentRuntimeService.Default]
  }
) { }