// File: src/shared/services-effect/skill/errors.ts

import { Data } from "effect";
import type { JSONObject } from "../../../types.js";

export class SkillNotFoundError extends Data.TaggedError("SkillNotFoundError")<{
  readonly message: string;
  readonly skillId: string;
}> {
  constructor(options: { skillId: string }) {
    super({
      message: `Skill configuration not found for ID: ${options.skillId}`,
      skillId: options.skillId
    });
  }
}

export class SkillExecutionError extends Data.TaggedError("SkillExecutionError")<{
  readonly message: string;
  readonly skillId: string;
  readonly cause?: unknown;
}> {
  constructor(options: { message: string; skillId: string; cause?: unknown }) {
    super({
      message: options.message,
      skillId: options.skillId,
      cause: options.cause
    });
  }
}

export class SkillModelError extends Data.TaggedError("SkillModelError")<{
  readonly message: string;
  readonly skillId: string;
  readonly modelId: string;
  readonly cause?: unknown;
}> {
  constructor(options: {
    message: string;
    skillId: string;
    modelId: string;
    cause?: unknown;
  }) {
    super({
      message: options.message,
      skillId: options.skillId,
      modelId: options.modelId,
      cause: options.cause
    });
  }
}

export class SkillPromptError extends Data.TaggedError("SkillPromptError")<{
  readonly message: string;
  readonly skillId: string;
  readonly promptId: string;
  readonly cause?: unknown;
}> {
  constructor(options: {
    message: string;
    skillId: string;
    promptId: string;
    cause?: unknown;
  }) {
    super({
      message: options.message,
      skillId: options.skillId,
      promptId: options.promptId,
      cause: options.cause
    });
  }
}

export class SkillOutputValidationError extends Data.TaggedError("SkillOutputValidationError")<{
  readonly message: string;
  readonly skillId: string;
  readonly output: JSONObject;
  readonly validationErrors: ReadonlyArray<string>;
}> {
  constructor(options: {
    skillId: string;
    output: JSONObject;
    validationErrors: ReadonlyArray<string>;
  }) {
    super({
      message: `Output validation failed for skill ${options.skillId}: ${options.validationErrors.join(", ")}`,
      skillId: options.skillId,
      output: options.output,
      validationErrors: options.validationErrors
    });
  }
}
