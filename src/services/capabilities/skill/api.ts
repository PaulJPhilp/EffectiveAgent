/**
 * @file Defines the Skill Service API for managing skill configurations and execution.
 */

import type { Effect } from "effect";
import type {
    SkillConfigError,
    SkillExecutionError,
    SkillInputValidationError,
    SkillNotFoundError,
    SkillOutputValidationError
} from "./errors.js";
import type {
    RegisteredSkill,
    SkillDefinition,
    SkillExecutionParamsType,
    SkillName
} from "./types.js";

/**
 * Service API for managing and executing skills.
 * Handles validation, registration, and execution of skill definitions.
 */
export interface SkillServiceApi {
    /**
     * Validates raw skill definition data against the schema.
     * 
     * @param definition - The raw skill definition to validate
     * @returns An Effect that yields the validated SkillDefinition or fails with SkillConfigError
     */
    readonly make: (definition: unknown) => Effect.Effect<SkillDefinition, SkillConfigError>;

    /**
     * Updates an existing skill definition with partial changes.
     * 
     * @param currentData - The current validated skill definition
     * @param updates - Partial updates to apply to the definition
     * @returns An Effect that yields the updated and validated SkillDefinition or fails with SkillConfigError
     */
    readonly update: (
        currentData: SkillDefinition,
        updates: Partial<SkillDefinition>
    ) => Effect.Effect<SkillDefinition, SkillConfigError>;

    /**
     * Invokes a configured Skill by name with the given input.
     * This is the primary method for agents/workflows to execute skills.
     * 
     * @param params - The skill execution parameters
     * @returns An Effect that yields the skill output or fails with a skill-related error
     */
    readonly invokeSkill: (params: {
        skillName: SkillName;
        input: unknown; // Raw input, validated internally
        overrideParams?: Partial<SkillExecutionParamsType>;
    }) => Effect.Effect<
        unknown, // Output type is determined at runtime based on skill definition
        | SkillNotFoundError
        | SkillConfigError
        | SkillInputValidationError
        | SkillOutputValidationError
        | SkillExecutionError
    >;

    /**
     * Gets a registered skill by name.
     * 
     * @param name - The name of the skill to retrieve
     * @returns An Effect that yields the registered skill or fails with SkillNotFoundError
     */
    readonly getSkill: (name: SkillName) => Effect.Effect<RegisteredSkill, SkillNotFoundError>;
} 