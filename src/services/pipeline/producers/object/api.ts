/**
 * @file API interface for ObjectService (AI structured object producer).
 * Defines the contract for object generation using AI models/providers.
 */

import type { EffectiveResponse } from "@/types.js";
import { type Effect, Schema as S } from "effect";
import type { ObjectGenerationError, ObjectInputError, ObjectModelError, ObjectProviderError } from "./errors.js";
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
}
