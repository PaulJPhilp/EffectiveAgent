/**
 * @file Provides the Layer for ConfigLoaderOptions, typically reading
 * the base path from application configuration (e.g., environment variables).
 */

import { Config, Context, Effect, Layer } from "effect";
import type { ConfigError } from "effect/ConfigError";
import { ConfigLoaderOptions } from "./types.js"; // Import the Tag/Interface

// --- Configuration Definition ---

// Define the structure of the configuration we need using Effect's Config module
const configLoaderConfig: Config.Config<ConfigLoaderOptions> = // Explicit type
    Config.string("CONFIG_BASE_PATH").pipe(
        Config.withDefault("./config"), // Default to './config' relative to project root if env var not set
        Config.map((basePath) => ({ basePath })) // Map the string to the ConfigLoaderOptions structure
    );
// The type of configLoaderConfig is Config<ConfigLoaderOptions>

// --- Layer Definition ---

/**
 * Live Layer for providing ConfigLoaderOptions.
 * Reads the base path from the 'CONFIG_BASE_PATH' environment variable
 * (via Effect Config), with a default value.
 *
 * This layer implicitly requires the default ConfigProvider provided by the Effect runtime.
 * It can fail with ConfigError if the environment variable has issues (though unlikely with a default).
 */
export const ConfigLoaderOptionsLiveLayer: Layer.Layer<ConfigLoaderOptions, ConfigError> =
    Layer.effect(
        ConfigLoaderOptions, // The Tag to provide
        // To get the value from a Config object, simply yield it or use it directly
        // in an Effect context. The runtime resolves it using the ConfigProvider.
        configLoaderConfig // <--- Use the Config object directly
    );

// --- Alternative: Layer Factory for Hardcoded Path ---
/**
 * Creates a Layer providing ConfigLoaderOptions with a specific, hardcoded base path.
 * Useful for testing or specific application setups.
 */
export const ConfigLoaderOptionsLayer = (
    options: ConfigLoaderOptions
): Layer.Layer<ConfigLoaderOptions> => Layer.succeed(ConfigLoaderOptions, options);

