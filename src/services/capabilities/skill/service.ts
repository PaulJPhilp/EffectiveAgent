/**
 * @file Implements the Skill service for managing skill configurations.
 * @module services/capabilities/skill/service
 */

import { Config, ConfigProvider, Effect, Ref, Schema as S } from "effect";
import { SkillConfigError } from "./errors.js";
import { SkillFile } from "./schema.js";

export class SkillService extends Effect.Service<SkillService>()(
  "SkillService",
  {
    effect: Effect.gen(function* () {
      // Configuration provider for loading skill config
      const config = yield* ConfigProvider.ConfigProvider;
      // Ref to store loaded configuration
      let skillRef: Ref.Ref<SkillFile>;

      return {
        load: () => Effect.gen(function* () {
          // 1. Load raw config string
          const rawConfig = yield* config.load(Config.string("skills")).pipe(
            Effect.mapError(cause => new SkillConfigError({
              description: "Failed to load skill configuration",
              module: "SkillService",
              method: "load",
              cause
            }))
          );

          // 2. Parse JSON
          const parsedConfig = yield* Effect.try({
            try: () => JSON.parse(rawConfig as string),
            catch: (error) => new SkillConfigError({
              description: "Failed to parse skill configuration JSON",
              module: "SkillService",
              method: "load",
              cause: error
            })
          });

          // 3. Validate schema
          const validConfig = yield* Effect.mapError(
            S.decode(SkillFile)(parsedConfig),
            (error) => new SkillConfigError({
              description: "Failed to validate skill configuration",
              module: "SkillService",
              method: "load",
              cause: error
            })
          );

          // 4. Store in ref and return
          skillRef = yield* Ref.make<SkillFile>(validConfig);
          return yield* Ref.get(skillRef);
        })
      };
    })
  }
) { }
