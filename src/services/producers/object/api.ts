/**
 * @file API interface for ObjectService (AI structured object producer).
 * Defines the contract for object generation using AI models/providers.
 */

import type { Effect, Ref, Schema as S } from "effect";
import type { EffectiveResponse } from "@/types.js";
import type { ObjectGenerationError, ObjectInputError, ObjectModelError, ObjectProviderError } from "./errors.js";
import type { ObjectAgentState } from "./service.js";
import type { ObjectGenerationOptions } from "./types.js";

/**
 * Service for generating structured objects using AI models.
 * @template T The type of the object to generate.
 */
export interface ObjectGeneratorApi<T extends S.Schema<any, any>> {
  /** Generate an object of type T using the specified options */
  readonly generate: (options: ObjectGenerationOptions<T>) => Effect.Effect<S.Schema.Type<T>, ObjectGenerationError | ObjectInputError | ObjectModelError | ObjectProviderError>
}

/**
 * API contract for the ObjectService.
 */
export interface ObjectServiceApi<S_Schema extends S.Schema<any, any> = S.Schema<any, any>, T = unknown> {
  /**
   * Generates a structured object based on the provided schema and options.
   * @param options Options for object generation, including schema, prompt, and modelId.
   * @returns Effect that resolves to an EffectiveResponse or fails with an ObjectServiceError.
   */
  readonly generate: (
    options: ObjectGenerationOptions<S_Schema>
  ) => Effect.Effect<EffectiveResponse<T>, Error>;

  /**
   * Get the current service state for monitoring/debugging
   * @returns Effect that resolves to the current ObjectAgentState
   */
  readonly getAgentState: () => Effect.Effect<ObjectAgentState, Error>;

  /**
   * Get the runtime status (returns state information since runtime is not available in simplified service)
   * @returns Effect that resolves to state information
   */
  readonly getRuntime: () => Effect.Effect<{ state: Ref.Ref<ObjectAgentState> }, Error>;

  /**
   * Terminate the object service (resets internal state)
   * @returns Effect that resolves when termination is complete
   */
  readonly terminate: () => Effect.Effect<void, Error>;
}
