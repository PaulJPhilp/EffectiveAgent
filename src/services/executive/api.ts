/**
 * @file ExecutiveService API
 * @description Service contract for the ExecutiveService. Defines only the public interface and option types required for the contract.
 */

import type { Effect } from "effect";

/**
 * Options for controlling Effect execution behavior.
 */
export interface ExecuteOptions {
  /** Maximum number of retry attempts */
  readonly maxAttempts: number;
  /** Base delay between retries in milliseconds */
  readonly baseDelayMs: number;
  /** Maximum delay between retries in milliseconds */
  readonly maxDelayMs: number;
  /** Optional AbortSignal to cancel the operation */
  readonly signal?: AbortSignal;
}

/**
 * Default execution options.
 */
export const DEFAULT_EXECUTE_OPTIONS: ExecuteOptions = {
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
		options?: ExecuteOptions
	): Effect.Effect<A, E | ExecutiveServiceError, R>;
}
