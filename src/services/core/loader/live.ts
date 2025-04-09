/**
 * @file Live implementation of the EntityLoaderApi service.
 * Hides FileSystem dependency using injection via the layer.
 */

import {
    EntityLoadError,
    EntityParseError,
    EntityValidationError,
} from "@core/loader/errors.js";
// Import the Tag alias and the derived Type from types.ts
import {
    EntityLoaderApiTag,
    type EntityLoaderApi as EntityLoaderApiType, // Derived type
    type LoadEntityOptions,
} from "@core/loader/types.js";
import { FileSystem } from "@effect/platform"; // Keep FileSystem import
import { Schema } from "@effect/schema";
import { Context, Effect, Layer } from "effect"; // Added Context

// --- Implementation Factory ---

/**
 * Factory function (synchronous) for creating the EntityLoaderApi service implementation.
 * Requires FileSystem to be injected.
 */
export const make = (
    fs: FileSystem.FileSystem // Inject FileSystem service
) => {
    /**
     * Loads, parses (JSON), and validates an entity definition file using Effect Schema.
     */
    const loadEntity = <T, I>(
        filePath: string,
        options: LoadEntityOptions<T, I>,
    ): Effect.Effect< // R is now 'never' for the returned method
        T,
        EntityLoadError | EntityParseError | EntityValidationError,
        never
    > =>
        // Use injected fs instance directly
        fs.exists(filePath).pipe( // Start chain with fs operation
            Effect.mapError(
                (cause) =>
                    new EntityLoadError({
                        filePath,
                        message: "Failed check file existence",
                        cause,
                    }),
            ),
            Effect.filterOrFail(
                (exists) => exists,
                () => new EntityLoadError({ filePath, message: "Entity definition file not found" })
            ),
            Effect.flatMap(() => fs.readFileString(filePath, "utf8").pipe( // Use injected fs
                Effect.mapError((cause) => new EntityLoadError({ filePath, cause }))
            )),
            Effect.flatMap(content => Effect.try({ // Parse JSON
                try: () => JSON.parse(content) as I,
                catch: error => new EntityParseError({ filePath, cause: error })
            })),
            Effect.flatMap(parsedJson => Schema.decodeUnknown(options.schema)(parsedJson).pipe( // Validate
                Effect.mapError(parseError => new EntityValidationError({ filePath, cause: parseError }))
            )),
            // catchAll remains the same conceptually, but applies to the new chain
            Effect.catchAll((error) => {
                if (
                    error instanceof EntityLoadError ||
                    error instanceof EntityParseError ||
                    error instanceof EntityValidationError
                ) {
                    return Effect.fail(error);
                }
                return Effect.fail(
                    new EntityLoadError({
                        filePath,
                        message: "Unexpected error during entity load",
                        cause: error,
                    }),
                );
            })
        ); // End of loadEntity pipe chain

    /**
     * Loads and parses (JSON) an entity definition file, skipping schema validation.
     */
    const loadRawEntity = (
        filePath: string,
        options: { skipValidation: true }
    ): Effect.Effect< // R is now 'never'
        unknown,
        EntityLoadError | EntityParseError,
        never
    > =>
        // Use injected fs instance directly
        fs.exists(filePath).pipe( // Start chain with fs operation
            Effect.mapError(
                (cause) =>
                    new EntityLoadError({
                        filePath,
                        message: "Failed check file existence",
                        cause,
                    }),
            ),
            Effect.filterOrFail(
                (exists) => exists,
                () => new EntityLoadError({ filePath, message: "Entity definition file not found" })
            ),
            Effect.flatMap(() => fs.readFileString(filePath, "utf8").pipe( // Use injected fs
                Effect.mapError((cause) => new EntityLoadError({ filePath, cause }))
            )),
            Effect.flatMap(content => Effect.try({ // Parse JSON only
                try: () => JSON.parse(content),
                catch: error => new EntityParseError({ filePath, cause: error })
            })),
            // catchAll remains the same conceptually
            Effect.catchAll((error) => {
                if (error instanceof EntityLoadError || error instanceof EntityParseError) {
                    return Effect.fail(error);
                }
                return Effect.fail(
                    new EntityLoadError({
                        filePath,
                        message: "Unexpected error during raw entity load",
                        cause: error,
                    }),
                );
            }),
        ); // End of loadRawEntity pipe chain


    // Return the service implementation object
    return {
        loadEntity,
        loadRawEntity,
    };
}; // End of make function

// --- Layer Definition ---

/**
 * Live Layer for the EntityLoaderApi service.
 * Requires FileSystem service to build the implementation.
 */
export const EntityLoaderApiLiveLayer: Layer.Layer<
    EntityLoaderApiType, // Provides the API defined in types.ts
    never, // No layer building errors
    FileSystem.FileSystem // Requires FileSystem
> = Layer.effect(
    EntityLoaderApiTag, // Tag for the service interface
    // Effect to build the service: Get FileSystem and inject into make
    Effect.map(FileSystem.FileSystem, (fs) => make(fs))
);
