/**
 * @file Live implementation of the ConfigLoaderApi service.
 */

import { FileSystem, Path } from "@effect/platform"; // Import platform services
import { Schema } from "@effect/schema"; // For Schema.decodeUnknown
import { Context, Effect, Layer } from "effect";
import { ZodError, z } from "zod"; // Import Zod types
import {
    ConfigParseError,
    ConfigReadError,
    ConfigValidationError,
} from "./errors.js"; // Import specific errors
import {
    ConfigLoaderApi,
    ConfigLoaderOptions,
    type LoadConfigOptions,
} from "./types.js"; // Import Tag/Interface/Types

// --- Live Implementation ---

class ConfigLoaderApiLive implements ConfigLoaderApi {
    loadConfig = <T>(
        filename: string,
        options: LoadConfigOptions<T>
        // R type declared in interface: FileSystem | Path | ConfigLoaderOptions
    ): Effect.Effect<
        T, // Success is the validated config object T
        ConfigReadError | ConfigParseError | ConfigValidationError,
        FileSystem | Path | ConfigLoaderOptions // Explicitly list requirements
    > =>
        Effect.gen(function* () {
            // Get dependencies from context
            const fs = yield* FileSystem;
            const path = yield* Path;
            const loaderOptions = yield* ConfigLoaderOptions;

            // 1. Resolve full file path
            const filePath = yield* path.join(loaderOptions.basePath, filename).pipe(
                // Catch potential path resolution errors (less common)
                Effect.mapError((cause) => new ConfigReadError({ filePath: filename, message: "Failed to resolve config path", cause }))
            );

            // 2. Check if file exists
            const exists = yield* fs.exists(filePath).pipe(
                Effect.mapError((cause) => new ConfigReadError({ filePath, message: "Failed check file existence", cause }))
            );
            if (!exists) {
                return yield* Effect.fail(new ConfigReadError({ filePath, message: "Configuration file not found" }));
            }

            // 3. Read file content
            const content = yield* fs.readFileString(filePath, "utf8").pipe(
                Effect.mapError((cause) => new ConfigReadError({ filePath, cause })) // Map specific FS error
            );

            // 4. Parse JSON - More explicit error handling
            const parsedJson = yield* Effect.try({
                try: () => JSON.parse(content),
                // Explicitly catch and map to ConfigParseError
                catch: (error) => new ConfigParseError({ filePath, cause: error }),
            });

            // 5. Validate with Zod schema using Schema.decodeUnknown
            const decoded = yield* Schema.decodeUnknown(options.schema)(parsedJson).pipe(
                // Map the ParseError from @effect/schema to our specific ConfigValidationError
                Effect.mapError((parseError) => {
                    // Extract ZodError if possible from ParseError cause for better context
                    const cause = parseError.cause instanceof ZodError ? parseError.cause : parseError;
                    return new ConfigValidationError({ filePath, cause });
                })
            );

            // Ensure the return type matches T
            return decoded as T; // Keep cast if necessary for generic T
        }).pipe(
            // Add a final catchAll as a safety net and to help TS inference
            Effect.catchAll((error) => {
                // If it's already one of our known errors, re-throw it
                if (error instanceof ConfigReadError || error instanceof ConfigParseError || error instanceof ConfigValidationError) {
                    return Effect.fail(error);
                }
                // Otherwise, wrap unexpected errors (e.g., from path.join, fs.exists if not caught above)
                // Use ConfigReadError as a generic fallback for loading issues
                return Effect.fail(new ConfigReadError({ filePath: filename, message: "Unexpected error during config load", cause: error }));
            })
        );
}

// --- Layer Definition ---

/**
 * Live Layer for the ConfigLoaderApi service.
 * This layer itself has no requirements (R=never), but the effects
 * returned by its methods require FileSystem, Path, and ConfigLoaderOptions.
 */
export const ConfigLoaderApiLiveLayer: Layer.Layer<ConfigLoaderApi> = Layer.succeed(
    ConfigLoaderApi, // The Tag
    new ConfigLoaderApiLive() // The implementation instance
);
