/**
 * @file Defines specific errors for the Skill capability service and execution.
 * @module services/capabilities/skill/errors
 */

import { EffectiveError } from "@/effective-error.js";
import type { ParseError } from "effect/ParseResult";

/**
 * Represents an error during the configuration, loading, or validation
 * of a Skill definition itself (not during execution).
 * @extends EffectiveError
 */
export class SkillConfigError extends EffectiveError {
    public readonly skillName?: string;

    constructor(params: {
        description: string;
        skillName?: string;
        module: string;
        method: string;
        cause?: unknown;
    }) {
        super({
            description: params.description,
            module: params.module,
            method: params.method,
            cause: params.cause,
        });
        this.skillName = params.skillName;
    }
}

/**
 * Represents an error when a specific Skill definition cannot be found
 * in the loaded registry/data.
 * @extends EffectiveError
 */
export class SkillNotFoundError extends EffectiveError {
    public readonly skillName: string;

    constructor(params: {
        skillName: string;
        module: string;
        method: string;
    }) {
        super({
            description: `Skill definition not found: ${params.skillName}`,
            module: params.module,
            method: params.method,
        });
        this.skillName = params.skillName;
    }
}

/**
 * Represents an error when the input provided to invokeSkill fails
 * validation against the Skill's registered inputSchema.
 * @extends EffectiveError
 */
export class SkillInputValidationError extends EffectiveError {
    public readonly skillName: string;

    constructor(params: {
        skillName: string;
        module: string;
        method: string;
        cause: ParseError;
    }) {
        super({
            description: `Invalid input provided for skill: ${params.skillName}`,
            module: params.module,
            method: params.method,
            cause: params.cause,
        });
        this.skillName = params.skillName;
    }
}

/**
 * Represents an error when the output produced by the skill's execution
 * (e.g., from LLM or tool) fails validation against the Skill's
 * registered outputSchema.
 * @extends EffectiveError
 */
export class SkillOutputValidationError extends EffectiveError {
    public readonly skillName: string;

    constructor(params: {
        skillName: string;
        module: string;
        method: string;
        cause: ParseError;
    }) {
        super({
            description: `Invalid output produced by skill: ${params.skillName}`,
            module: params.module,
            method: params.method,
            cause: params.cause,
        });
        this.skillName = params.skillName;
    }
}

/**
 * Represents a generic error occurring during the execution phase of a Skill,
 * after input validation but before output validation. This could wrap errors
 * from LLM calls, Tool execution, prompt rendering, etc.
 * @extends EffectiveError
 */
export class SkillExecutionError extends EffectiveError {
    public readonly skillName: string;

    constructor(params: {
        skillName: string;
        description: string;
        module: string;
        method: string;
        cause?: unknown;
    }) {
        let detail = params.description;
        const cause = params.cause;

        if (!detail) {
            detail = "Unknown execution error";
            if (cause instanceof Error) {
                detail = cause.message;
            } else if (cause && typeof cause === 'object' && 'message' in cause && typeof cause.message === 'string') {
                detail = cause.message;
            } else if (typeof cause === 'string') {
                detail = cause;
            }
        }

        super({
            description: `Error during execution of skill '${params.skillName}': ${detail}`,
            module: params.module,
            method: params.method,
            cause: params.cause,
        });
        this.skillName = params.skillName;
    }
}
