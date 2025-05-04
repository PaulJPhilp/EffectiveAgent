/**
 * @file Error types for the Skill capability service.
 * @module services/capabilities/skill/errors
 */

import { Data } from "effect";

export class SkillConfigError extends Data.TaggedError("SkillConfigError")<{
    readonly description: string;
    readonly module: string;
    readonly method: string;
    readonly skillName?: string;
    readonly cause?: unknown;
}> { }

export class SkillNotFoundError extends Data.TaggedError("SkillNotFoundError")<{
    readonly description: string;
    readonly skillName: string;
}> { }

export class SkillExecutionError extends Data.TaggedError("SkillExecutionError")<{
    readonly description: string;
    readonly skillName: string;
    readonly module: string;
    readonly method: string;
    readonly cause?: unknown;
}> { }

export class SkillInputValidationError extends Data.TaggedError("SkillInputValidationError")<{
    readonly description: string;
    readonly skillName: string;
    readonly validationErrors: unknown[];
}> { }

export class SkillOutputValidationError extends Data.TaggedError("SkillOutputValidationError")<{
    readonly description: string;
    readonly skillName: string;
    readonly validationErrors: unknown[];
    readonly output?: unknown;
}> { }
