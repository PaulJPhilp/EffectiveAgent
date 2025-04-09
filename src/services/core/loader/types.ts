/**
 * @file Defines Tags and supporting types for the generic EntityLoader service.
 * The EntityLoaderApi type is derived from the implementation in live.ts.
 * Methods require 'never' context, hiding implementation details like FileSystem.
 */

import type {
    EntityLoadError,
    EntityParseError,
    EntityValidationError,
    LoaderError, // Import union type
} from "@core/loader/errors.js";
import type { make } from "@core/loader/live.js";
// FileSystem/Path no longer needed here as they are implementation details
import type { Schema } from "@effect/schema";
import { Context, Effect } from "effect";

// --- Options ---
/** Options for a specific load operation. */
export interface LoadEntityOptions<T, I = unknown> {
    readonly schema: Schema.Schema<T, I>;
    readonly skipValidation?: boolean;
}

// --- Service Interface & Tag ---

/**
 * Service type for loading, parsing, and validating entity definition files.
 * Derived from the `make` function in `live.ts`.
 */
export type EntityLoaderApi = ReturnType<typeof make>;

/** Tag for the EntityLoaderApi service. */
export const EntityLoaderApiTag = Context.GenericTag<EntityLoaderApi>(
    "EntityLoaderApi",
);

// --- Explicit Interface (for clarity, matches derived type) ---
// This helps document the public contract without implementation details.
export interface IEntityLoaderApi {
    /**
    * Loads, parses (JSON), and validates an entity definition file.
    * The underlying implementation requires FileSystem.
    * @param filePath The absolute path to the file.
    * @param options Options including the schema for validation.
    * @returns Effect yielding the validated entity T.
    */
    readonly loadEntity: <T, I>(
        filePath: string,
        options: LoadEntityOptions<T, I>,
    ) => Effect.Effect<
        T,
        EntityLoadError | EntityParseError | EntityValidationError,
        never // R = never (FileSystem is hidden)
    >;

    /**
     * Loads and parses (JSON) an entity definition file, skipping schema validation.
     * The underlying implementation requires FileSystem.
     * @param filePath The absolute path to the file.
     * @param options Options indicating skipValidation.
     * @returns Effect yielding the raw parsed JSON as 'unknown'.
     */
    readonly loadRawEntity: (
        filePath: string,
        options: { skipValidation: true }
    ) => Effect.Effect<
        unknown,
        EntityLoadError | EntityParseError,
        never // R = never (FileSystem is hidden)
    >;
}

// Static assertion to ensure derived type matches interface
// Uncomment after live.ts is updated if needed for verification
// const _assertType: IEntityLoaderApi = {} as EntityLoaderApi;
