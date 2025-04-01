// File: src/shared/services-effect/prompt/errors.ts

import { Data } from "effect";

export class PromptNotFoundError extends Data.TaggedError("PromptNotFoundError")<{
  readonly message: string;
  readonly promptId: string;
}> {
  constructor(options: { promptId: string }) {
    super({
      message: `Prompt template not found for ID: ${options.promptId}`,
      promptId: options.promptId
    });
  }
}

export class PromptRenderingError extends Data.TaggedError("PromptRenderingError")<{
  readonly message: string;
  readonly promptId?: string;
  readonly template: string;
  readonly variables: Record<string, unknown>;
  readonly cause?: unknown;
}> {
  constructor(options: {
    template: string;
    variables: Record<string, unknown>;
    promptId?: string;
    cause?: unknown;
  }) {
    super({
      message: `Failed to render prompt${options.promptId ? ` (ID: ${options.promptId})` : ''}`,
      promptId: options.promptId,
      template: options.template,
      variables: options.variables,
      cause: options.cause
    });
  }
}

export class PromptVariableMissingError extends Data.TaggedError("PromptVariableMissingError")<{
  readonly message: string;
  readonly promptId?: string;
  readonly missingVariables: ReadonlyArray<string>;
}> {
  constructor(options: {
    missingVariables: ReadonlyArray<string>;
    promptId?: string;
  }) {
    super({
      message: `Required variables missing${options.promptId ? ` for prompt ${options.promptId}` : ''}: ${options.missingVariables.join(', ')}`,
      promptId: options.promptId,
      missingVariables: options.missingVariables
    });
  }
}
