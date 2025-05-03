import { EffectiveError } from "@/errors.js";

export type PipelineSpecificError = BasePipelineError;

export class BasePipelineError extends EffectiveError {
  constructor(params: { description: string; method: string; cause?: unknown }) {
    super({
      ...params,
      module: "AiPipeline"
    });
  }
}

/**
 * Error indicating that the raw input provided to the pipeline
 * failed validation against the pipeline's input schema.
 */
export class InputValidationError extends BasePipelineError {
  constructor(cause: unknown) {
    super({
      description: "Pipeline input validation failed",
      method: "run",
      cause,
    });
  }
}

/**
 * Error indicating that the response received from the AI service
 * failed validation against the pipeline's output schema.
 */
export class OutputValidationError extends BasePipelineError {
  constructor(cause: unknown) {
    super({
      description: "Pipeline output validation failed",
      method: "run",
      cause,
    });
  }
}

/**
 * Error indicating a problem within the pipeline's configuration logic,
 * such as being unable to determine executive call options or an unsupported type.
 */
export class PipelineConfigurationError extends BasePipelineError {
  constructor(description: string, cause?: unknown) {
    super({
      description: `Pipeline configuration error: ${description}`,
      method: "configureExecutiveCall",
      cause,
    });
  }
}

/**
 * Error indicating a problem during pipeline execution.
 */
export class PipelineExecutionError extends BasePipelineError {
  constructor(description: string, cause?: unknown) {
    super({
      description: `Pipeline execution error: ${description}`,
      method: "execute",
      cause,
    });
  }
}
