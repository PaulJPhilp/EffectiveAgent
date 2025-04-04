// File: src/services/configuration/types.ts (Simplified - No Cache)

import { FileSystem } from "@effect/platform/FileSystem";
import { Context, Effect } from "effect";
import type { z } from "zod";
import type {
	ConfigParseError,
	ConfigReadError,
	ConfigSchemaMissingError,
	ConfigValidationError
} from './errors.js';
import type { BaseConfigSchema, EnvironmentConfigSchema } from './schema.js';

// --- Base Config Types ---
export type BaseConfig = z.infer<typeof BaseConfigSchema>;
export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;

// --- Configuration Loader Options ---
export interface ConfigLoaderOptions {
	readonly basePath: string;
	readonly validateSchema?: boolean;
}
export interface ConfigLoaderOptionsTag extends ConfigLoaderOptions { }
export const ConfigLoaderOptionsTag = Context.GenericTag<ConfigLoaderOptionsTag>("ConfigLoaderOptionsTag");

export interface LoadOptions<T> {
	readonly schema?: z.ZodType<T>;
	readonly validate?: boolean;
}

// --- Declare Brand Symbol ---
declare const ConfigLoaderBrand: unique symbol;

// --- Service Definition (Branded Type Pattern) ---
export interface ConfigLoader {
	readonly [ConfigLoaderBrand]?: never; // Branding

	/**
	 * Loads, parses, and optionally validates a configuration file *each time it's called*.
	 * Returns an Effect that succeeds with the BASE config object or fails
	 * with a specific ConfigurationError subtype.
	 * The caller is responsible for casting to a more specific type T after success.
	 */
	readonly loadConfig: <T extends BaseConfig>(
		filename: string,
		options?: LoadOptions<T>
	) => Effect.Effect<
		BaseConfig,
		ConfigReadError | ConfigParseError | ConfigValidationError | ConfigSchemaMissingError,
		FileSystem
	>;

	// No clearCache method needed
}
// Tag uses the branded interface name
export const ConfigLoader = Context.GenericTag<ConfigLoader>("ConfigLoader");

// --- Errors ---
export * from './errors.js';
