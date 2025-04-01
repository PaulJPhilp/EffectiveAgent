// File: src/services/model/errors.ts

import { Data } from "effect";

// --- Configuration Related Errors ---
export class ModelConfigLoadError extends Data.TaggedError("ModelConfigLoadError")<{
	readonly message: string;
	readonly filePath?: string;
	readonly cause?: unknown;
}> { }

export class ModelNotFoundError extends Data.TaggedError("ModelNotFoundError")<{
	readonly message: string;
	readonly modelId: string;
}> {
	constructor(options: { modelId: string }) {
		super({ message: `Model configuration not found for ID: ${options.modelId}`, modelId: options.modelId });
	}
}

export class ModelCapabilityError extends Data.TaggedError("ModelCapabilityError")<{
	readonly message: string;
	readonly modelId: string;
	readonly requiredCapability: string;
}> {
	constructor(options: { modelId: string, requiredCapability: string }) {
		super({ message: `Model ${options.modelId} does not support the required capability: ${options.requiredCapability}`, modelId: options.modelId, requiredCapability: options.requiredCapability });
	}
}

// --- Generation Related Errors ---
export class GenerationError extends Data.TaggedError("GenerationError")<{
	readonly message: string;
	readonly modelId: string;
	readonly cause?: unknown;
}> {
	constructor(options: { message: string, modelId: string, cause?: unknown }) {
		super({ message: options.message, modelId: options.modelId, cause: options.cause });
	}
}

export class ValidationError extends Data.TaggedError("ValidationError")<{
	readonly message: string;
	readonly validationErrors?: ReadonlyArray<string>;
	readonly generatedData?: unknown;
	readonly modelId: string;
}> {
	constructor(options: { message: string, modelId: string, validationErrors?: ReadonlyArray<string>, generatedData?: unknown }) {
		super({ message: options.message, modelId: options.modelId, validationErrors: options.validationErrors, generatedData: options.generatedData });
	}
}
