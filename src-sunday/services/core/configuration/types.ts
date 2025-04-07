/**
 * @file Defines interfaces, Tags, and types for the generic EntityLoader service.
 */

import { Context, Effect } from "effect";
import type { FileSystem } from "@effect/platform/FileSystem"; // Needed for R type
import type { Path } from "@effect/platform/Path"; // Needed for R type
import type { Schema } from "@effect/schema"; // Import Effect Schema type
import type {
    EntityLoadError,
    EntityParseError,
    EntityValidationError,
} from "../loader/errors.js"; // Use relative path instead of alias

// --- Options ---

/** Options for configuring the EntityLoader service. */
export interface EntityLoaderOptions {
    /** The base directory from which to resolve relative entity filenames. */
    readonly basePath: string;
    // Add other options later if needed, e.g., default filename, supported formats
}
/** Tag for EntityLoaderOptions. */
export const EntityLoaderOptions = Context.GenericTag<EntityLoaderOptions>(
    "EntityLoaderOptions",
);

// --- Service Interface & Tag ---

/** Options for a specific load operation. */
export interface LoadEntityOptions<T, I = unknown> {
    /** The Effect Schema to validate the loaded entity against. */
    readonly schema: Schema.Schema<T, I>; // Use Effect Schema
}

/**
 * Service interface for loading, parsing, and validating entity definition files.
 * The actual service type will be derived from the `make` function in `live.ts`.
 * This interface defines the expected structure.
 */
export interface EntityLoaderApi {
    /**
     * Loads, parses (currently JSON), and validates an entity definition file.
     * Requires FileSystem and Path services from the platform.
     * Requires EntityLoaderOptions for the base path.
     */
    readonly loadEntity: <T, I>(
        filename: string, // Relative to basePath in options
        options: LoadEntityOptions<T, I>,
    ) => Effect.Effect<
        T, // Success type is the validated entity object
        EntityLoadError | EntityParseError | EntityValidationError, // Possible errors
        FileSystem | Path | EntityLoaderOptions // Required services/config
    >;
}
/** Tag for the EntityLoaderApi service. */
export const EntityLoaderApi = Context.GenericTag<EntityLoaderApi>(
    "EntityLoaderApi",
);
