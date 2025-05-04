// File: src/services/configuration/configurationLoader.ts (Simplified - No Cache)

import { FileSystem } from "@effect/platform/FileSystem";
import { Effect, Layer } from "effect";
import path from "path";
import { ZodError, z } from "zod";
import {
	ConfigParseError,
	ConfigReadError,
	ConfigSchemaMissingError,
	ConfigValidationError
} from "./errors.js";
import { BaseConfigSchema } from "./schema.js";
import type { BaseConfig, ConfigLoaderOptions, LoadOptions } from "./types.js";
import { ConfigLoader, ConfigLoaderOptionsTag } from "./types.js";

// --- Service Implementation Object Factory ---
const makeConfigLoader = (
	options: ConfigLoaderOptions,
	fs: FileSystem
): ConfigLoader => {

	// Helper to read file as string
	const readFile = (filePath: string): Effect.Effect<string, ConfigReadError, FileSystem> =>
		fs.readFileString(filePath).pipe(
			Effect.mapError(error => new ConfigReadError({ filePath, cause: error }))
		);

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
	): Effect.Effect<BaseConfig, ConfigReadError | ConfigParseError | ConfigValidationError | ConfigSchemaMissingError, FileSystem> => {
		return Effect.gen(function* () {
			// Get full path
			const filePath = path.join(options.basePath, filename);
			const exists = yield* fs.exists(filePath).pipe(
				Effect.mapError(error => new ConfigReadError({ filePath, cause: error }))
			);
			if (!exists) {
				return yield* Effect.fail(
					new ConfigReadError({
						filePath,
						cause: new Error(`Configuration file not found: ${filePath}`)
					})
				);
			}

			// Read file
			const content = yield* readFile(filePath);

			// Parse JSON
			const parsed = yield* Effect.try({
				try: () => parseJson(content, filePath),
				catch: error => new ConfigParseError({ filePath, cause: error })
			});

			// Validate against base schema first
			let validated: BaseConfig
			try {
				validated = BaseConfigSchema.parse(parsed)
			} catch (error) {
				return yield* Effect.fail(
					new ConfigValidationError({
						filePath,
						zodError: error instanceof ZodError ? error : new ZodError([{
							code: 'custom',
							message: `Base schema validation failed: ${error}`,
							path: []
						}])
					})
				)
			}

			// Validate against provided schema if any
			if (loadOpts.schema) {
				try {
					validated = validateWithSchema(validated, loadOpts.schema, filePath)
				} catch (error) {
					return yield* Effect.fail(
						new ConfigValidationError({
							filePath,
							zodError: error instanceof ZodError ? error : new ZodError([{
								code: 'custom',
								message: `Schema validation failed: ${error}`,
								path: []
							}])
						})
					)
				}
			} else {
				return yield* Effect.fail(
					new ConfigSchemaMissingError({ filePath })
				)
			}

			return validated as BaseConfig
		});
	};

	// --- Return the implementation object literal ---
	return {
		loadConfig: <T extends BaseConfig>(
			filename: string,
			loadOpts: LoadOptions<T> = {}
		) => loadAndValidateFile(filename, loadOpts)
	};
};

// --- Service Layer Definition ---
/**
 * Live Layer for the ConfigLoader service.
 * Requires ConfigLoaderOptionsTag and FileSystem from context.
 */
export const ConfigLoaderLive = Layer.effect(
	ConfigLoader,
	Effect.map(
		Effect.all([ConfigLoaderOptionsTag, FileSystem]),
		([options, fs]) => makeConfigLoader(options, fs)
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
