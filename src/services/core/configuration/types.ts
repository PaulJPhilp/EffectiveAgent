/**
 * @file Defines interfaces, Tags, and types for the generic ConfigLoader service.
 */

import { Context, Effect, Layer } from "effect";
import type { FileSystem } from "@effect/platform/FileSystem"; // Needed for R type
import type { Path } from "@effect/platform/Path"; // Needed for R type
import type { z, ZodError } from "zod"; // Import Zod types
import type { ConfigReadError, ConfigParseError, ConfigValidationError } from "./errors.js";

// --- Options ---

/** Options for configuring the ConfigLoader service. */
export interface ConfigLoaderOptions {
    /** The base directory from which to resolve relative config filenames. */
    readonly basePath: string;
    // Add other options later if needed, e.g., default filename, supported formats
}
/** Tag for ConfigLoaderOptions. */
export const ConfigLoaderOptions = Context.GenericTag<ConfigLoaderOptions>(
    "ConfigLoaderOptions"
);

// --- Service Interface & Tag ---

/** Options for a specific load operation. */
export interface LoadConfigOptions<T = unknown> {
    /** The Zod schema to validate the loaded configuration against. */
    readonly schema: z.ZodType<T>;
    /**
     * Whether to perform validation. If false, the schema is ignored.
     * @default true (if schema is provided)
     */
    // readonly validate?: boolean; // Decided against this, schema implies validation
}

/** Service interface for loading and validating configuration files. */
export interface ConfigLoaderApi {
    /**
     * Loads, parses (JSON), and validates a configuration file.
     * Requires FileSystem and Path services from the platform.
     * Requires ConfigLoaderOptions for the base path.
     */
    readonly loadConfig: <T>(
        filename: string, // Relative to basePath in options
        options: LoadConfigOptions<T>
    ) => Effect.Effect<
        T, // Success type is the validated config object
        ConfigReadError | ConfigParseError | ConfigValidationError, // Possible errors
        FileSystem | Path | ConfigLoaderOptions // Required services/config
    >;
}
/** Tag for the ConfigLoaderApi service. */
export const ConfigLoaderApi = Context.GenericTag<ConfigLoaderApi>(
    "ConfigLoaderApi"
);
