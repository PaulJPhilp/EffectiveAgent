/**
 * @file Implements the Intelligence service for managing AI intelligence configurations.
 * @module services/capabilities/intelligence/service
 */

import { Effect, Option, Ref } from "effect";
import type { IntelligenceServiceApi } from "./api.js";
import { IntelligenceConfigError } from "./errors.js";
import type { IntelligenceFile, IntelligenceType } from "./schema.js";

/**
 * Intelligence service internal state
 */
export interface IntelligenceServiceState {
  readonly loadCount: number
  readonly lastLoad: Option.Option<number>
  readonly intelligences: ReadonlyArray<IntelligenceType>
}

/**
 * Service implementation for managing intelligence configurations.
 */
export class IntelligenceService extends Effect.Service<IntelligenceServiceApi>()(
  "IntelligenceService",
  {
    effect: Effect.gen(function* () {
      const initialState: IntelligenceServiceState = {
        loadCount: 0,
        lastLoad: Option.none(),
        intelligences: []
      };

      // Create internal state
      const stateRef = yield* Ref.make<IntelligenceServiceState>(initialState);

      yield* Effect.log("IntelligenceService initialized");

      const service: IntelligenceServiceApi = {
        load: () => Effect.gen(function* () {
          // For now, return empty intelligences array since we don't have external configuration loading
          const intelligences: ReadonlyArray<IntelligenceType> = [];

          // Update internal state to track load
          const currentState = yield* Ref.get(stateRef);
          const newState: IntelligenceServiceState = {
            ...currentState,
            loadCount: currentState.loadCount + 1,
            lastLoad: Option.some(Date.now()),
            intelligences
          };
          yield* Ref.set(stateRef, newState);

          const intelligenceFile: IntelligenceFile = {
            name: "agent-intelligences",
            version: "1.0.0",
            intelligences
          };

          yield* Effect.log("IntelligenceService: loaded intelligences", {
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
    })
  }
) { }