// File: src/shared/services-effect/skill/skillConfigurationService.ts

import { Effect, Layer, HashMap } from "effect";
import type { SkillConfig, SkillConfigFile } from './schema.js';
import { SkillConfigurationService, SkillConfigFileTag } from './types.js';
import { SkillNotFoundError } from './errors.js';

// --- Service Implementation Object Factory ---
const makeSkillConfigurationService = (
  skillConfigFile: SkillConfigFile
): SkillConfigurationService => {
  if (!skillConfigFile || !Array.isArray(skillConfigFile.skills)) {
    throw new Error("Invalid or missing SkillConfigFile provided");
  }

  let skillsMap = HashMap.empty<string, SkillConfig>();
  const tempList: SkillConfig[] = [];
  const categoryMap = new Map<string, SkillConfig[]>();

  skillConfigFile.skills.forEach((skill: SkillConfig) => {
    const skillId = skill.id;
    if (HashMap.has(skillsMap, skillId)) {
      Effect.logWarning(`[SkillConfigurationService] Duplicate skill ID: ${skillId}. Using first occurrence.`);
    } else {
      skillsMap = HashMap.set(skillsMap, skillId, skill);
      tempList.push(skill);

      if (skill.category) {
        if (!categoryMap.has(skill.category)) {
          categoryMap.set(skill.category, []);
        }
        categoryMap.get(skill.category)?.push(skill);
      }
    }
  });

  const finalSkillsMap = skillsMap;
  const skillList: ReadonlyArray<SkillConfig> = Object.freeze([...tempList]);
  const categoriesMap = new Map<string, ReadonlyArray<SkillConfig>>(
    Array.from(categoryMap.entries()).map(([category, skills]) => [
      category,
      Object.freeze([...skills])
    ])
  );

  return {
    getSkillConfig: (skillId: string): Effect.Effect<SkillConfig, SkillNotFoundError> => {
      return Effect.sync(() => HashMap.get(finalSkillsMap, skillId)).pipe(
        Effect.flatMap(maybeSkill =>
          maybeSkill._tag === "Some"
            ? Effect.succeed(maybeSkill.value)
            : Effect.fail(new SkillNotFoundError({ skillId }))
        )
      );
    },

    listSkills: (): Effect.Effect<ReadonlyArray<SkillConfig>> => {
      return Effect.succeed(skillList);
    },

    findSkillsByCategory: (category: string): Effect.Effect<ReadonlyArray<SkillConfig>> => {
      return Effect.sync(() => categoriesMap.get(category) ?? []);
    }
  };
};

// --- Service Layer Definition ---
export const SkillConfigurationServiceLive = Layer.effect(
  SkillConfigurationService,
  Effect.map(SkillConfigFileTag, configFile => makeSkillConfigurationService(configFile))
);
