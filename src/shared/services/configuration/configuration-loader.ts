// File: src/services/configuration/configurationLoader.ts (Simplified - No Cache)

import { FileSystem } from "@effect/platform/FileSystem";
import { Path } from "@effect/platform/Path";
import { Effect, Layer } from "effect";
import { ZodError, z } from "zod";

// Import types, errors, and Tag
import {
	ConfigParseError,
	ConfigReadError,
	ConfigSchemaMissingError,
	ConfigValidationError
} from './errors.js';
import type { BaseConfig, ConfigLoaderOptions, LoadOptions } from './types.js';
import { ConfigLoader, ConfigLoaderOptionsTag } from './types.js';

// --- Service Implementation Object Factory ---
// No Cache dependency
const makeConfigLoader = (
	options: ConfigLoaderOptions,
	fs: FileSystem,
	path: Path
): ConfigLoader => {

	// Helper to read file as string
	const readFile = async (filePath: string): Promise<string> => {
		try {
			return await fs.readFileString(filePath, "utf8");
		} catch (error) {
			throw new ConfigReadError({ filePath, cause: error });
		}
	};

	// Helper to parse JSON
	const parseJson = (content: string, filePath: string): unknown => {
		try {
			return JSON.parse(content);
		} catch (error) {
			throw new ConfigParseError({ filePath, cause: error });
		}
	};

	// Helper to validate with schema
	const validateWithSchema = <T>(data: unknown, schema: z.ZodType<T>, filePath: string): T => {
		try {
			return schema.parse(data);
		} catch (error) {
			if (error instanceof ZodError) {
				throw new ConfigValidationError({ filePath, zodError: error });
			}
			throw new ConfigValidationError({
				filePath,
				zodError: new ZodError([{
					code: 'custom',
					message: `Unexpected validation error: ${error}`,
					path: []
				}])
			});
		}
	};

	// Main loader function wrapped in Effect
	const loadAndValidateFile = <T extends BaseConfig>(
		filename: string,
		loadOpts: LoadOptions<T> = {}
	): Effect.Effect<BaseConfig, ConfigReadError | ConfigParseError | ConfigValidationError | ConfigSchemaMissingError> => {
		return Effect.try({
			try: () => {
				// Get full path
				const filePath = path.join(options.basePath, filename);

				// Determine if validation is needed
				const shouldValidate = loadOpts.validate ?? options.validateSchema ?? true;
				const schema = loadOpts.schema;

				// Create async function to execute the whole process
				const loadProcess = async (): Promise<BaseConfig> => {
					// Read file
					const content = await readFile(filePath);

					// Parse JSON
					const parsed = parseJson(content, filePath);

					// Validate if needed
					if (!shouldValidate) {
						Effect.logWarning(`Loading config from ${filePath} without validation.`);
						return parsed as BaseConfig;
					}

					if (!schema) {
						throw new ConfigSchemaMissingError({ filePath });
					}

					// Validate and return
					return validateWithSchema(parsed, schema, filePath);
				};

				// Return as a promise to be handled by Effect.try
				return loadProcess();
			},
			catch: (error) => {
				// Just pass through our custom errors
				if (error instanceof ConfigReadError ||
					error instanceof ConfigParseError ||
					error instanceof ConfigValidationError ||
					error instanceof ConfigSchemaMissingError) {
					return error;
				}
				// Wrap any other errors as read errors
				return new ConfigReadError({
					filePath: filename,
					cause: error
				});
			}
		});
	};

	// --- Return the implementation object literal ---
	return {
		loadConfig: <T extends BaseConfig>(
			filename: string,
			loadOpts: LoadOptions<T> = {}
		) => loadAndValidateFile(filename, loadOpts),
	};
};


// --- Service Layer Definition ---
/**
 * Live Layer for the ConfigLoader service.
 * Requires ConfigLoaderOptionsTag, FileSystem, and Path from context.
 */
export const ConfigLoaderLive = Layer.effect(
	ConfigLoader, // The public Tag we are providing
	// Resolve dependencies and call the factory function
	Effect.map(
		Effect.all([ConfigLoaderOptionsTag, FileSystem, Path]), // Resolve dependencies
		([options, fs, path]) => makeConfigLoader(options, fs, path) // Create the implementation
	)
);

// --- Example Option/Platform Layers ---
/*
import { FileSystem } from "@effect/platform/FileSystem";
import { Path } from "@effect/platform/Path";

export const ConfigLoaderOptionsLive = (options: ConfigLoaderOptions) => Layer.succeed(ConfigLoaderOptionsTag, options);
export const PlatformLive = Layer.merge(FileSystem.layer, Path.layer);

// Example Composition:
// const options = { basePath: '/app/config', validateSchema: true };
// const liveConfigLoader = Layer.provide(ConfigLoaderLive, Layer.merge(ConfigLoaderOptionsLive(options), PlatformLive));
*/
