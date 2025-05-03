import type { Effect } from "effect";
import type { EffectiveError } from "@/errors.js";
import type {
  InputValidationError,
  OutputValidationError,
  PipelineConfigurationError,
} from "@/framework/pipeline/errors.js";
import type { ExecutiveServiceError } from "@/services/pipeline/service.js";
import { Duration } from "effect";

/** Union of all possible errors the base AiPipeline run method can produce. */
export type AiPipelineError<CustomError extends EffectiveError> =
  | CustomError // Errors from configureChatHistory/configureExecutiveCall
  | InputValidationError
  | OutputValidationError
  | PipelineConfigurationError
  | ExecutiveServiceError; // Errors from ExecutiveService (incl. Policy/Constraint)

/** Parameters for configuring the execution */
export interface ExecutiveCallConfig<A, E, R> {
  /** The Effect to execute */
  effect: Effect.Effect<A, E, R>;
  /** Optional execution parameters */
  parameters?: ExecutiveParameters;
}

export interface ExecutiveParameters {
  maxRetries?: number;
  timeout?: Duration.Duration;
}
