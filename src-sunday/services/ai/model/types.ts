/**
 * @file Defines interfaces, tags, and types related to AI Models.
 */
import { Context, Effect } from "effect";
import type { ProviderName } from "../../schema.js"; // Import global schema enum
import type { Id, JsonObject } from "../../types.js"; // Import global types

// --- Constants & Enums ---

/** Defines the known capabilities of AI models within the framework. */
export const ModelCapabilities = [
	"text-generation", // Core text output
	"chat", // Optimized for conversational turn-taking
	"function-calling", // Can request function execution
	"tool-use", // Broader term, often implies function-calling
	"vision", // Can process images
	"audio-input", // Can process audio input (speech-to-text)
	"audio-output", // Can generate audio output (text-to-speech)
	"reasoning", // Strong logical deduction, planning
	"code-generation", // Specialized in writing code
	"image-generation", // Can generate images from text/prompts
	"embeddings", // Can generate vector embeddings
] as const; // Use 'as const' for literal types

/** Type representing a specific capability of an AI model. */
export type ModelCapability = (typeof ModelCapabilities)[number];

// --- Interfaces & Tags ---

/** Represents the metadata and configuration for a specific AI model. */
export interface Model {
	readonly id: Id; // e.g., "openai/gpt-4o", "anthropic/claude-3.5-sonnet"
	readonly providerName: ProviderName;
	readonly modelName: string; // e.g., "gpt-4o", "claude-3.5-sonnet-20240620"
	readonly displayName: string;
	readonly contextWindow: number; // Max tokens (input + output)
	readonly capabilities: ReadonlyArray<ModelCapability>;
	readonly pricing?: {
		readonly inputCostPerMillionTokens?: number; // In USD
		readonly outputCostPerMillionTokens?: number; // In USD
	};
	readonly metadata?: JsonObject; // Other provider-specific info
}

// Interface for the service managing model information
export interface ModelApi {
	readonly listModels: (params?: {
		provider?: ProviderName;
		capability?: ModelCapability;
	}) => Effect.Effect<ReadonlyArray<Model>>;
	readonly getModelById: (id: Model["id"]) => Effect.Effect<Model, Error>; // Define specific error later
}
// Tag for the service
export const ModelApi = Context.GenericTag<ModelApi>("ModelApi");

// Interface/Tag for Model Configuration loading (if needed separately)
export interface ModelConfiguration {
	// Methods to access model config data loaded from file/source
	readonly getModels: () => Effect.Effect<ReadonlyArray<Model>>;
	readonly getDefaultModelId?: () => Effect.Effect<Model["id"] | undefined>;
}
export const ModelConfiguration = Context.GenericTag<ModelConfiguration>(
	"ModelConfiguration"
);

// Add other model-specific types here
