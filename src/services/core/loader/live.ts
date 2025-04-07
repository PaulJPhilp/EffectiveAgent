/**
 * @file Live implementation of the EntityLoaderApi service.
 */

import { Effect, Layer } from "effect";
import { FileSystem } from "@effect/platform"; // Import platform services namespace
import { Schema } from "@effect/schema"; // For Schema.decodeUnknown and types
import {
    EntityLoaderApi,
    type LoadEntityOptions,
} from "@core/loader/types.js"; // Use path alias and updated types
import {
    EntityLoadError,
    EntityParseError,
    EntityValidationError,
} from "@core/loader/errors.js"; // Use path alias and updated error names

// --- Implementation Factory ---

/**
 * Factory function for creating the EntityLoaderApi service implementation.
 */
export const make = () => {
    /**
     * Loads, parses (JSON), and validates an entity definition file using Effect Schema.
     * Requires FileSystem service from the platform.
     * The filename is treated as a complete path.
     */
    const loadEntity = <T, I>(
        filePath: string,
        options: LoadEntityOptions<T, I>,
    ): Effect.Effect<
        T, // Success type is the validated entity object T
        EntityLoadError | EntityParseError | EntityValidationError, // Possible errors
        FileSystem.FileSystem // Required services (FileSystem only)
    > =>
        Effect.gen(function* () {
            // Get dependencies from context
            const fs = yield* FileSystem.FileSystem;

            // 1. Check if file exists
            const exists = yield* fs.exists(filePath).pipe(
                Effect.mapError(
                    (cause) =>
                        new EntityLoadError({
                            filePath,
                            message: "Failed check file existence",
                            cause,
                        }),
                ),
            );
            if (!exists) {
                return yield* Effect.fail(
                    new EntityLoadError({
                        filePath,
                        message: "Entity definition file not found",
                    }),
                );
            }

            // 2. Read file content
            const content = yield* fs.readFileString(filePath, "utf8").pipe(
                Effect.mapError((cause) => new EntityLoadError({ filePath, cause })),
            );

            // 3. Parse JSON string
            const parsedJson = yield* Effect.try({
                try: () => JSON.parse(content) as I, // Attempt to parse JSON
                catch: (error) => new EntityParseError({ filePath, cause: error }), // Map syntax errors
            });

            // 4. Decode the parsed JSON using the provided schema
            const decoded = yield* Schema.decodeUnknown(options.schema)(
                parsedJson,
            ).pipe(
                // Map schema validation errors
                Effect.mapError(
                    (parseError) => new EntityValidationError({ filePath, cause: parseError }),
                ),
            );

            return decoded;
        }).pipe(
            // Add a final catchAll as a safety net for truly unexpected errors
            // Note: Errors from steps 1-4 should already be correctly typed.
            Effect.catchAll((error) => {
                // If it's already one of our known LoaderErrors, re-fail with it
                if (
                    error instanceof EntityLoadError ||
                    error instanceof EntityParseError ||
                    error instanceof EntityValidationError
                ) {
                    return Effect.fail(error);
                }
                // Otherwise, wrap unexpected errors (less likely now)
                return Effect.fail(
                    new EntityLoadError({
                        filePath,
                        message: "Unexpected error during entity load",
                        cause: error,
                    }),
                );
            }),
        ); // Ensure the R type is preserved

    // Return the service implementation object
    return {
        loadEntity,
    };
};

// --- Layer Definition ---

/**
 * Live Layer for the EntityLoaderApi service.
 * This layer provides the implementation but does not require any context itself.
 * The effects returned by its methods require FileSystem.FileSystem.
 */
export const EntityLoaderApiLiveLayer: Layer.Layer<EntityLoaderApi> =
    Layer.succeed(
        EntityLoaderApi, // The Tag
        make(), // The implementation instance created by the factory
    );
