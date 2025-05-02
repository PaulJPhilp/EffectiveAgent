/**
 * @file Implements the Intelligence service for managing AI intelligence configurations.
 * @module services/capabilities/intelligence/service
 */

import { Config, ConfigProvider, Effect, Layer, Schema as S } from "effect";
import type { IntelligenceServiceApi } from "./api.js";
import { IntelligenceConfigError } from "./errors.js";
import { IntelligenceFile, type Intelligence } from "./schema.js";

export class IntelligenceService extends Effect.Service<IntelligenceService>()(
  "IntelligenceService",
  {
    
    effect: Effect.gen(function* () {
      const config = yield* ConfigProvider.ConfigProvider;

      return {
        load: () => Effect.gen(function* () {
          const rawConfig = yield* config.load(Config.string("intelligence"));
          const parsedConfig = yield* Effect.try({
            try: () => JSON.parse(rawConfig as string),
            catch: (error) => new IntelligenceConfigError({
              description: "Failed to parse intelligence configuration JSON",
              module: "IntelligenceService",
              method: "load",
              cause: error
            })
          });

          return yield* Effect.mapError(
            S.decode(IntelligenceFile)(parsedConfig),
            (error) => new IntelligenceConfigError({
              description: "Failed to validate intelligence configuration",
              module: "IntelligenceService",
              method: "load",
              cause: error
            })
          );
        }),

        getProfile: (name: string) => Effect.gen(function* (this: IntelligenceServiceApi) {
          const config = yield* this.load();
          const profile = config.intelligences.find((p: Intelligence) => p.name === name);

          if (!profile) {
            return yield* Effect.fail(new IntelligenceConfigError({
              description: `Intelligence profile '${name}' not found`,
              module: "IntelligenceService",
              method: "getProfile"
            }));
          }

          return profile;
        })
      };
    })
  }
) { }