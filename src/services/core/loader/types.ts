/**
 * @file Defines Tags and supporting types for the generic EntityLoader service.
 * The main EntityLoaderApi type is derived from the implementation in live.ts.
 */

import { Context } from "effect";
import type { Schema } from "@effect/schema"; // Import Effect Schema type
import type { make } from "@core/loader/live.js"; // Import the implementation factory

// --- Options ---

/** Options for configuring the EntityLoader service. */
export interface EntityLoaderOptions {
    /** The base directory from which to resolve relative entity filenames. */
    readonly basePath: string;
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
 * Service type for loading, parsing, and validating entity definition files.
 * Derived from the `make` function in `live.ts`.
 */
export type EntityLoaderApi = ReturnType<typeof make>;

/** Tag for the EntityLoaderApi service. */
export const EntityLoaderApi = Context.GenericTag<EntityLoaderApi>(
    "EntityLoaderApi",
);

// Note: We removed the manually defined EntityLoaderApi interface.
