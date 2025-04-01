// File: src/services/configuration/errors.ts

import { Data } from "effect";
import type { ZodError } from "zod";

// Base Error (Optional but good practice)
export class ConfigurationError extends Data.TaggedError("ConfigurationError")<{
	readonly message: string;
	readonly key?: string;
	readonly filePath?: string; // Add filePath context
	readonly cause?: unknown;
}> {
	constructor(options: { message: string; key?: string; filePath?: string; cause?: unknown }) {
		super({
			message: options.message,
			key: options.key,
			filePath: options.filePath,
			cause: options.cause
		});
	}
}

// Specific Errors
export class ConfigReadError extends Data.TaggedError("ConfigReadError")<{
	readonly message: string;
	readonly filePath: string;
	readonly cause?: unknown;
}> {
	constructor(options: { filePath: string, cause?: unknown }) {
		super({
			message: `Failed to read configuration file: ${options.filePath}`,
			filePath: options.filePath,
			cause: options.cause
		});
	}
}

export class ConfigParseError extends Data.TaggedError("ConfigParseError")<{
	readonly message: string;
	readonly filePath: string;
	readonly cause?: unknown;
}> {
	constructor(options: { filePath: string, cause?: unknown }) {
		super({
			message: `Failed to parse JSON in configuration file: ${options.filePath}`,
			filePath: options.filePath,
			cause: options.cause
		});
	}
}

export class ConfigValidationError extends Data.TaggedError("ConfigValidationError")<{
	readonly message: string;
	readonly filePath: string;
	readonly zodErrors: ReadonlyArray<string>; // Store formatted Zod errors
	readonly cause?: ZodError; // Store original ZodError
}> {
	constructor(options: { filePath: string, zodError: ZodError }) {
		super({
			message: `Invalid configuration schema in ${options.filePath}`,
			filePath: options.filePath,
			// Format errors for easy access
			zodErrors: options.zodError.errors.map(e => `[${e.path.join('.') || '<root>'}] ${e.message}`),
			cause: options.zodError
		});
	}
}

export class ConfigSchemaMissingError extends Data.TaggedError("ConfigSchemaMissingError")<{
	readonly message: string;
	readonly filePath: string;
}> {
	constructor(options: { filePath: string }) {
		super({
			message: `Schema is required for validation when loading ${options.filePath}`,
			filePath: options.filePath
		});
	}
}
