import type { GenerateBaseResult, ResponseMessage } from "@/types.js";
import type { ToolServiceApi } from "../tools/api.js";
import type { ToolDefinition } from "../tools/schema.js";
import type { ToolRegistryData } from "../tools/types.js";
import type { ProviderClientApi } from "./api.js"; // Added import
import type { PROVIDER_NAMES } from "./provider-universe.js";

/**
 * Represents a fully qualified tool name in the format `${namespace}:${toolName}`
 */
export type FullToolName = `${string}:${string}`;

/**
 * Detailed reasoning step
 */
export interface ReasoningDetail {
    step: number;
    thought: string;
    action?: string;
    observation?: string;
}

/**
 * Source reference
 */
export interface Source {
    title: string;
    url?: string;
    content: string;
}

/**
 * Warning message
 */
export interface Warning {
    code: string;
    message: string;
}

// GenerateBaseResult moved to @/types.js for centralized access

/**
 * Text generation result from a provider
 */
export interface GenerateTextResult extends GenerateBaseResult {
    /** Generated text content */
    text: string;
    /** Optional reasoning text */
    reasoning?: string
    /** Detailed reasoning parts */
    reasoningDetails?: ReasoningDetail[]
    /** Sources used during generation */
    sources?: Source[]
    /** Response messages generated (for chat or tool calls) */
    messages?: ResponseMessage[]
    /** Warnings from the provider */
    warnings?: Warning[]
    /** Optional array of tool calls requested by the model */
    toolCalls?: ToolCallRequest[];
}

/**
 * Output type for chat endpoint, same structure as GenerateTextResult
 */
export type ChatResult = GenerateTextResult

/**
 * Output type for generateObject based on Vercel AI SDK GenerateObjectResult
 */
export interface GenerateObjectResult<T> extends GenerateBaseResult {
    /** Generated object conforming to the provided schema */
    object: T
}

/**
 * Output type for generateImage based on Vercel AI SDK ImageGenerationResult
 */
export interface GenerateImageResult extends GenerateBaseResult {
    /** Generated image URL or base64 data */
    imageUrl: string
    /** Optional additional generated images (for multiple variations) */
    additionalImages?: string[]
    /** Image generation parameters used */
    parameters: {
        /** Size of the generated image (e.g., '1024x1024') */
        size?: string
        /** Quality setting used for generation */
        quality?: string
        /** Style setting used for generation */
        style?: string
    }
}

/**
 * Output type for generateSpeech based on Vercel AI SDK SpeechGenerationResult
 */
export interface GenerateSpeechResult extends GenerateBaseResult {
    /** Generated audio data as base64 string or URL */
    audioData: string
    /** Audio format of the generated speech (e.g., 'mp3', 'wav') */
    format: string
    /** Speech generation parameters used */
    parameters: {
        /** Voice ID or name used for generation */
        voice?: string
        /** Speed/rate of speech (e.g., '1.0') */
        speed?: string
        /** Pitch adjustment (e.g., '0') */
        pitch?: string
        /** Language code (e.g., 'en-US') */
        language?: string
    }
    /** Duration of the generated audio in seconds */
    duration?: number
}

/**
 * Output type for transcribe based on Vercel AI SDK TranscriptionResult
 */
export interface TranscribeResult extends GenerateBaseResult {
    /** Full transcribed text */
    text: string
    /** Detailed transcription segments with timing */
    segments?: Array<{
        /** Segment ID */
        id: number
        /** Start time in seconds */
        start: number
        /** End time in seconds */
        end: number
        /** Transcribed text for this segment */
        text: string
        /** Confidence score (0-1) */
        confidence?: number
        /** Speaker label if speaker diarization is enabled */
        speaker?: string
        /** Language detected for this segment */
        language?: string
    }>
    /** Language detected in the audio */
    detectedLanguage?: string
    /** Duration of the audio in seconds */
    duration?: number
    /** Audio processing parameters used */
    parameters: {
        /** Language hint provided (e.g., 'en-US') */
        language?: string
        /** Whether speaker diarization was enabled */
        diarization?: boolean
        /** Whether timestamps were enabled */
        timestamps?: boolean
        /** Audio quality settings used */
        quality?: string
    }
}

/**
 * Output type for streamText based on Vercel AI SDK StreamingTextResult
 */
export interface StreamingTextResult extends GenerateBaseResult {
    /** Current chunk of generated text */
    chunk: string
    /** Full text generated so far */
    text: string
    /** Whether this is the final chunk */
    isLast: boolean
    /** Current token count */
    currentTokenCount: number
    /** Optional reasoning text */
    reasoning?: string
    /** Detailed reasoning parts */
    reasoningDetails?: ReasoningDetail[]
    /** Sources used during generation */
    sources?: Source[]
    /** Response messages generated (for chat or tool calls) */
    messages?: ResponseMessage[]
    /** Warnings from the provider */
    warnings?: Warning[]
    /** Stream control functions */
    controller: {
        /** Function to pause the stream */
        pause: () => void
        /** Function to resume the stream */
        resume: () => void
        /** Function to cancel the stream */
        cancel: () => void
        /** Whether the stream is currently paused */
        isPaused: boolean
    }
}

/**
 * Output type for streamObject based on Vercel AI SDK StreamingObjectResult
 */
export interface StreamingObjectResult<T> extends GenerateBaseResult {
    /** Current chunk of generated object */
    chunk: Partial<T>
    /** Full object generated so far */
    object: Partial<T>
    /** Whether this is the final chunk */
    isLast: boolean
    /** Current token count */
    currentTokenCount: number
    /** Stream control functions */
    controller: {
        /** Function to pause the stream */
        pause: () => void
        /** Function to resume the stream */
        resume: () => void
        /** Function to cancel the stream */
        cancel: () => void
        /** Whether the stream is currently paused */
        isPaused: boolean
    }
}

/**
 * Output type for generateEmbeddings based on Vercel AI SDK EmbeddingGenerationResult
 */
export interface GenerateEmbeddingsResult extends GenerateBaseResult {
    /** Array of embedding vectors */
    embeddings: number[][]
    /** Dimensions of each embedding vector */
    dimensions: number
    /** Original texts that were embedded */
    texts: string[]
    /** Optional similarity scores if comparing to other embeddings */
    similarityScores?: number[]
    /** Parameters used for embedding generation */
    parameters: {
        /** Model-specific parameters like truncation, pooling strategy */
        modelParameters?: Record<string, unknown>
        /** Normalization method applied (if any) */
        normalization?: string
        /** Text preprocessing steps applied */
        preprocessing?: string[]
    }
}

/**
 * Metadata and configuration for a single provider.
 *
 * - Provider capability: The union of all capabilities supported by any model
 *   this provider exposes (e.g., if any model supports "vision", the provider
 *   has the "vision" capability).
 * - Used for filtering, UI, and as a source of truth for what the provider can offer.
 */
/**
 * Model capability: What a model or provider can do (as a string literal union).
 */
export type ModelCapability =
    | "text-generation"
    | "chat"
    | "function-calling"
    | "vision"
    | "reasoning"
    | "code-generation"
    | "audio"
    | "image-generation"
    | "embeddings"
    | "tool-use"
    | "search"
    | "research";

/**
 * Canonical provider metadata type for ProviderService.
 *
 * - name: internal provider ID
 * - displayName: user-facing provider name
 * - logoUrl: provider logo
 * - docsUrl: provider documentation
 * - capabilities: all capabilities supported by any model from this provider
 * - configSchema: required API key and base URL
 */
export interface ProviderMetadata {
    name: string;
    displayName: string;
    logoUrl: string;
    docsUrl: string;
    capabilities: readonly ModelCapability[];
    configSchema: {
        apiKeyEnvVar: string;
        baseUrl: string;
    };
}

/**
 * Metadata for a single model.
 *
 * - Model capability: What this specific model can do (e.g., "chat", "vision").
 * - Used for routing, validation, and fine-grained selection.
 */
export interface ProviderModelMetadata {
    id: string;
    name: string;
    /**
     * The set of capabilities this specific model supports.
     * This is the model capability.
     */
    capabilities: readonly ModelCapability[];
    // Add any additional fields as needed
}

/**
 * Base options common to many provider API calls.
 */
export interface BaseProviderParameters {
    /** Maximum tokens to generate */
    maxTokens?: number;
    /** Temperature for sampling */
    temperature?: number;
    /** Top-p sampling */
    topP?: number;
    /** Top-k sampling */
    topK?: number;
    /** Presence penalty */
    presencePenalty?: number;
    /** Frequency penalty */
    frequencyPenalty?: number;
    /** Random seed */
    seed?: number;
    /** Stop sequences */
    stop?: string[];
}

/**
 * Base options shared by all provider operations
 */
export interface BaseProviderOptions {
    /** The model ID to use for the operation */
    readonly modelId: string;
    /** Optional signal for cancellation */
    readonly signal?: AbortSignal;
    /** Optional parameters for model behavior */
    readonly parameters?: BaseProviderParameters;
}

/**
 * Options specific to text generation.
 */
export interface ProviderGenerateTextOptions extends BaseProviderOptions {
    /** Optional system prompt or instructions */
    readonly system?: string;
}

/**
 * Options specific to object generation.
 */
export interface ProviderGenerateObjectOptions<T> extends BaseProviderOptions {
    /** The schema for the object to be generated */
    readonly schema: unknown; // Keeping as unknown for now, consistent with Vercel AI SDK
    /** Optional system prompt or instructions */
    readonly system?: string;
}

/**
 * Options specific to chat generation.
 */
export interface ProviderChatOptions extends BaseProviderOptions {
    /** Optional system prompt or instructions */
    readonly system?: string;
    /** Optional tool service API */
    readonly toolService?: ToolServiceApi;
    /** Optional list of tool definitions to make available to the model */
    readonly tools?: ToolDefinition[];
}

/**
 * Represents a request from the LLM to call a specific tool.
 */
export interface ToolCallRequest {
    /** A unique identifier for this tool call. */
    id: string;
    /** The type of request, e.g., "tool_call". */
    type: "tool_call";
    /** The function/tool to be called. */
    function: {
        /** The name of the function. */
        name: string;
        /** The arguments to call the function with, as a JSON string. */
        arguments: string;
    };
}

/**
 * Options specific to embedding generation.
 */
export interface ProviderGenerateEmbeddingsOptions extends BaseProviderOptions {
    /** Optional batch size for processing embeddings */
    readonly batchSize?: number;
}

/**
 * Options specific to image generation.
 */
export interface ProviderGenerateImageOptions extends BaseProviderOptions {
    /** Number of images to generate */
    readonly n?: number;
    /** Desired size of the image (e.g., '1024x1024') */
    readonly size?: string;
    /** Quality setting (e.g., 'hd', 'standard') */
    readonly quality?: string;
    /** Artistic style (e.g., 'vivid', 'natural') */
    readonly style?: string;
}

/**
 * Options specific to object generation.
 */
export interface ProviderGenerateObjectOptions<T> extends BaseProviderOptions {
    /** The schema for the object to be generated */
    readonly schema: unknown;
    /** Optional system prompt or instructions */
    readonly system?: string;
}

/**
 * Options specific to speech generation.
 */
export interface ProviderGenerateSpeechOptions extends BaseProviderOptions {
    /** Voice ID or name */
    readonly voice?: string;
    /** Speed/rate adjustment */
    readonly speed?: string;
}

/**
 * Options specific to transcription.
 */
export interface ProviderTranscribeOptions extends BaseProviderOptions {
    /** Language hint */
    readonly language?: string;
    /** Enable speaker diarization */
    readonly diarization?: boolean;
    /** Enable timestamps */
    readonly timestamps?: boolean;
}

/**
 * Discriminated union type for all supported AI providers.
 * Each provider has a unique 'name' property that acts as the discriminator.
 */

/**
 * Represents a configured provider instance at runtime.
 * Each union member corresponds to a supported provider, including its unique name,
 * the provider client implementation, and the set of capabilities it supports.
 * Used throughout the provider service for type-safe provider handling and dispatch.
 */
export type EffectiveProviderApi = {
    name: typeof PROVIDER_NAMES[number];
    provider: ProviderClientApi;
    capabilities: Set<ModelCapability>;
    tools?: ToolRegistryData;
};

/**
 * Union type for all supported provider settings.
 */
/**
 * Union type for all supported provider configuration settings.
 * Each member maps a provider name to its specific settings type as required by its SDK.
 * Used for loading, validating, and initializing provider clients.
 */
export type EffectiveProviderSettings = {
    name: typeof PROVIDER_NAMES[number];
    settings: unknown;
};

export type { ToolDefinition, ProviderClientApi };
