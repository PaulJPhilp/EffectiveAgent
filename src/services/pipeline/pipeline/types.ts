import { Duration, Effect } from "effect";
import type {
  InputValidationError,
  OutputValidationError,
  PipelineConfigurationError,
} from "./errors.js";
import { } from "./errors.js";
import { EffectiveError } from "@/errors.js";
import { ExecutiveServiceError } from "../shared/service.js";

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
  timeout?: Duration.Duration;
}
