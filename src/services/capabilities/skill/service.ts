/**
 * @file Implements the Skill service for managing skill configurations.
 * @module services/capabilities/skill/service
 */

import { Config, ConfigProvider, Effect, Ref, Schema as S } from "effect";
import { SkillConfigError } from "./errors.js";
import { Skill, SkillFile } from "./schema.js";
import type { SkillDefinition, SkillService as SkillServiceInterface } from "./types.js";

export class SkillService extends Effect.Service<SkillServiceInterface>()(
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
        }),

        make: (input: SkillDefinition) => Effect.gen(function* () {
          // 1. Validate input against schema
          const validatedSkill = yield* Effect.mapError(
            S.decode(Skill)(input),
            (error) => new SkillConfigError({
              description: "Invalid skill definition",
              skillName: input.name,
              module: "SkillService",
              method: "make",
              cause: error
            })
          );

          // 2. Add to stored config
          const currentConfig = yield* Ref.get(skillRef);
          const updatedSkills = [...currentConfig.skills, validatedSkill];
          const updatedConfig = { ...currentConfig, skills: updatedSkills };
          yield* Ref.set(skillRef, updatedConfig);

          return validatedSkill;
        }),

        update: (input: SkillDefinition) => Effect.gen(function* () {
          // 1. Validate input against schema
          const validatedSkill = yield* Effect.mapError(
            S.decode(Skill)(input),
            (error) => new SkillConfigError({
              description: "Invalid skill definition",
              skillName: input.name,
              module: "SkillService",
              method: "update",
              cause: error
            })
          );

          // 2. Update in stored config
          const currentConfig = yield* Ref.get(skillRef);
          const updatedSkills = currentConfig.skills.map(skill =>
            skill.name === input.name ? validatedSkill : skill
          );
          const updatedConfig = { ...currentConfig, skills: updatedSkills };
          yield* Ref.set(skillRef, updatedConfig);

          return validatedSkill;
        })
      };
    })
  }
) { }