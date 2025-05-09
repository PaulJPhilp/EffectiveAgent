/**
 * @file API interface for ObjectService (AI structured object producer).
 * Defines the contract for object generation using AI models/providers.
 */

import { GenerateObjectResult } from "@/services/ai/provider/types.js";
import type { Effect } from "effect";
import type { ObjectGenerationError, ObjectInputError, ObjectModelError, ObjectProviderError } from "./errors.js";
import type { ObjectGenerationOptions } from "./types.js";

/**
 * Service for generating structured objects using AI models.
 * @template T The type of the object to generate.
 */
export interface ObjectGeneratorApi<T> {
  /** Generate an object of type T using the specified options */
  readonly generate: (options: ObjectGenerationOptions<T>) => Effect.Effect<T, ObjectGenerationError | ObjectInputError | ObjectModelError | ObjectProviderError>
}

/**
 * API contract for the ObjectService.
 */
export interface ObjectServiceApi {
  /**
   * Generates a structured object from the given prompt and schema.
   * @param options - Options for object generation (prompt, modelId, schema, etc.)
   * @returns Effect that resolves to an AiResponse or fails with an ObjectServiceError.
   * @throws {ObjectModelError} If the model is invalid or missing.
   * @throws {ObjectProviderError} If the provider is misconfigured or unavailable.
   * @throws {ObjectGenerationError} If the provider fails to generate the object.
   */
  generate: <T>(
    options: ObjectGenerationOptions<T>
  ) => Effect.Effect<
    GenerateObjectResult<T>,
    ObjectModelError | ObjectProviderError | ObjectGenerationError | ObjectInputError
  >;
}
