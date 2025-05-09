/**
 * @file Implements the Skill service for managing skill configurations and execution.
 */

import { Effect, HashMap, Ref, Schema as S } from "effect";
import type { ImportedType } from "./api.js";
import {
  SkillConfigError,
  SkillExecutionError,
  SkillInputValidationError,
  SkillNotFoundError,
  SkillOutputValidationError
} from "./errors.js";
import { Skill } from "./schema.js";
import type {
  RegisteredSkill,
  SkillDefinition,
  SkillExecutionParamsType,
  SkillName
} from "./types.js";

/**
 * Default implementation of the SkillService.
 */
export class SkillService extends Effect.Service<SkillServiceApi>()("SkillService", {
  effect: Effect.gen(function* () {
    // Store for registered skills
    const skillsRef = yield* Ref.make<HashMap.HashMap<SkillName, RegisteredSkill>>(HashMap.empty());

    return {
      make: (definition: unknown) => Effect.mapError(
        S.decode(Skill)(definition),
        (error) => new SkillConfigError({
          description: "Failed to validate skill definition",
          skillName: "unknown",
          module: "SkillService",
          method: "make",
          cause: error
        })
      ),

      update: (currentData: SkillDefinition, updates: Partial<SkillDefinition>) =>
        Effect.gen(function* () {
          const merged = { ...currentData, ...updates };
          return yield* SkillService.prototype.make(merged);
        }),

      getSkill: (name: SkillName) => Effect.gen(function* () {
        const skills = yield* Ref.get(skillsRef);
        const skill = HashMap.get(skills, name);

        if (!skill) {
          return yield* Effect.fail(new SkillNotFoundError({
            description: `Skill not found: ${name}`,
            skillName: name
          }));
        }

        return skill;
      }),

      invokeSkill: ({ skillName, input, overrideParams }: {
        skillName: SkillName;
        input: unknown;
        overrideParams?: Partial<SkillExecutionParamsType>;
      }) => Effect.gen(function* () {
        // 1. Get the registered skill
        const skill = yield* SkillService.prototype.getSkill(skillName);

        // 2. Validate input against skill's schema
        const validatedInput = yield* Effect.mapError(
          S.decode(skill.inputSchema)(input),
          (error) => new SkillInputValidationError({
            description: "Invalid skill input",
            skillName,
            validationErrors: [error]
          })
        );

        // 3. Execute the skill
        const rawOutput = yield* Effect.fail(new SkillExecutionError({
          description: "Skill execution not implemented",
          skillName,
          module: "SkillService",
          method: "invokeSkill"
        }));

        // 4. Validate output
        return yield* Effect.mapError(
          S.decode(skill.outputSchema)(rawOutput),
          (error) => new SkillOutputValidationError({
            description: "Invalid skill output",
            skillName,
            validationErrors: [error],
            output: rawOutput
          })
        );
      })
    };
  }),
  dependencies: []
}) { }