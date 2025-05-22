import { EffectiveError } from "@/errors.js"; 
import { Data } from "effect";

// Errors moved from shared/errors.ts
export class PipelineConfigError extends Data.TaggedError("PipelineConfigError")<{
    readonly description: string;
    readonly module: string;
    readonly method: string;
    readonly cause?: unknown;
}> { }

export class PipelineSharedExecutionError extends Data.TaggedError("PipelineSharedExecutionError")<{
    readonly description: string;
    readonly module: string;
    readonly method: string;
    readonly cause?: unknown;
}> { }

export class PipelineValidationError extends Data.TaggedError("PipelineValidationError")<{
    readonly description: string;
    readonly module: string;
    readonly method: string;
    readonly validationErrors: string[];
}> { }

export type PipelineError = PipelineConfigError | PipelineSharedExecutionError | PipelineValidationError;

// Original errors from this file
export type PipelineSpecificError = BasePipelineError;

export class BasePipelineError extends EffectiveError {
  constructor(params: { description: string; method: string; cause?: unknown }) {
    super({
      ...params,
      module: "AiPipeline"
    });
  }
}

export class InputValidationError extends BasePipelineError {
  constructor(cause: unknown) {
    super({
      description: "Pipeline input validation failed",
      method: "run",
      cause,
    });
  }
}

export class OutputValidationError extends BasePipelineError {
  constructor(cause: unknown) {
    super({
      description: "Pipeline output validation failed",
      method: "run",
      cause,
    });
  }
}

export class PipelineConfigurationError extends BasePipelineError {
  constructor(description: string, cause?: unknown) {
    super({
      description: `Pipeline configuration error: ${description}`,
      method: "configureExecutiveCall",
      cause,
    });
  }
}

export class PipelineExecutionError extends BasePipelineError {
  constructor(description: string, cause?: unknown) {
    super({
      description: `Pipeline execution error: ${description}`,
      method: "execute",
      cause,
    });
  }
}
