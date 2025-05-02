/**
 * @file ExecutiveService API
 * @description Service contract for the ExecutiveService. Defines only the public interface and option types required for the contract.
 */

import type { Effect, Option } from "effect";
import type { TextServiceApi, TextGenerationOptions } from "@/services/ai/producers/text/api.js";
import type { TextModelError, TextProviderError, TextGenerationError, TextInputError } from "@/services/ai/producers/text/errors.js";
import type { AiResponse } from "@effect/ai/AiResponse";

/**
 * Options for controlling Effect execution behavior.
 */
/** Base options for all execute operations */
export interface BaseExecuteOptions {
  /** Maximum number of retry attempts */
  readonly maxAttempts: number;
  /** Base delay between retries in milliseconds */
  readonly baseDelayMs: number;
  /** Maximum delay between retries in milliseconds */
  readonly maxDelayMs: number;
  /** Optional AbortSignal to cancel the operation */
  readonly signal?: AbortSignal;
  /** Pipeline ID for policy and audit tracking */
  readonly pipelineId?: string;
  /** Type of operation being performed */
  readonly operationType?: string;
  /** Model ID to use for the operation */
  readonly modelId?: string;
  /** Additional tags for policy and audit tracking */
  readonly tags?: Readonly<Record<string, string | number | boolean>>;
  /** Maximum cumulative tokens allowed across all retries */
  readonly maxCumulativeTokens?: number;
}

/** Options for text generation operations */
export interface TextExecuteOptions extends BaseExecuteOptions {
  /** Model ID to use for text generation */
  readonly modelId: string;
  /** Text generation prompt */
  readonly prompt: string;
  /** Optional system prompt */
  readonly system?: Option.Option<string>;
  /** Additional model parameters */
  readonly parameters?: Record<string, any>;
}

/**
 * Default execution options.
 */
export const DEFAULT_EXECUTE_OPTIONS: BaseExecuteOptions = {
  maxAttempts: 1,
  baseDelayMs: 100,
  maxDelayMs: 5000,
} as const;

/**
 * @file ExecutiveService API
 * @description
 * Service contract for the ExecutiveService. This contract is domain-agnostic:
 * it defines an interface for executing any Effect (from a Producer), applying
 * policy enforcement, constraints, and auditing. The ExecutiveService does not
 * know or care about the type of operation (text, image, etc.).
 */


import type { ExecutiveServiceError } from "./errors.js";

/**
 * Service contract for the ExecutiveService.
 * Accepts and executes an Effect from a Producer, with policy enforcement,
 * constraints, and auditing. Returns an Effect of the same result type.
 */
export interface ExecutiveServiceApi {
	/**
	 * Executes a generic Effect, enforcing policy and constraints.
	 * @param effect The Effect to execute (from a Producer)
	 * @param options Options for controlling execution behavior
	 * @returns An Effect that yields the result or an ExecutiveServiceError
	 */
	execute<R, E, A>(
		effect: Effect.Effect<A, E, R>,
		options?: BaseExecuteOptions
	): Effect.Effect<A, E | ExecutiveServiceError, R>;

	/**
	 * Executes a text generation operation with policy enforcement and constraints.
	 * @param options Options for text generation
	 * @returns An Effect that yields the text response or an error
	 */
	executeText(
		options: TextExecuteOptions
	): Effect.Effect<
		AiResponse,
		TextModelError | TextProviderError | TextGenerationError | TextInputError | ExecutiveServiceError
	>;
}
