// File: src/shared/services-effect/provider/types.ts

import * as Effect from 'effect/Effect';
import type { ProviderError } from './errors.js';
import { ProviderImplementationError } from './errors.js';
import type { ZodType } from 'zod';

/** Provider error type */
export type ProviderErrorType = ProviderError;

/** Effect types for provider operations */
export type ValidateEffect = Effect.Effect<void, ProviderImplementationError>;
export type CompletionEffect = Effect.Effect<LLMCompletionResult, ProviderImplementationError>;
export type TextGenerationEffect = Effect.Effect<GenerateTextResult, ProviderImplementationError>;
export type ImageGenerationEffect = Effect.Effect<GenerateImageResult, ProviderImplementationError>;
export type EmbeddingGenerationEffect = Effect.Effect<GenerateEmbeddingResult, ProviderImplementationError>;
export type ObjectGenerationEffect<T> = Effect.Effect<GenerateObjectResult<T>, ProviderImplementationError>;

/** Provider ID type */
export type ProviderId = string & { readonly _brand: unique symbol };

/** Base configuration */
export interface BaseConfig {
  /** Provider version */
  version: string;
  /** Provider tags */
  tags: string[];
  /** Provider description */
  description?: string;
  /** API version */
  apiVersion?: string;
  /** Supported models */
  models?: string[];
  /** Supported capabilities */
  capabilities?: ModelCapability[];
}

/** Provider configuration */
export interface ProviderConfig extends BaseConfig {
  /** Provider name */
  name: ProviderType;
  /** Provider display name */
  displayName: string;
  /** Provider type */
  type: ProviderType;
  /** Environment variable for API key */
  apiKeyEnvVar?: string;
  /** Base URL for API */
  baseUrl?: string;
  /** Rate limiting configuration */
  rateLimit?: {
    /** Requests per minute */
    requestsPerMinute: number;
    /** Tokens per minute */
    tokensPerMinute?: number;
  };
  /** Model IDs */
  modelIds?: string[];
}

/** Model completion options */
export interface ModelCompletionOptions {
  /** Model ID */
  modelId?: string;
  /** Prompt */
  prompt: string;
  /** Temperature */
  temperature?: number;
  /** Max tokens */
  maxTokens?: number;
}

/** Model completion result */
export interface LLMCompletionResult {
  /** Generated content */
  content: string;
  /** Model used */
  model: string;
  /** Token usage */
  tokens: {
    /** Prompt tokens */
    prompt: number;
    /** Completion tokens */
    completion: number;
    /** Total tokens */
    total: number;
  };
  /** Raw response */
  raw: unknown;
}

/** Text generation options */
export interface GenerateTextOptions {
  /** Text prompt */
  prompt: string;
  /** Model ID */
  modelId?: string;
  /** Temperature */
  temperature?: number;
  /** Max tokens */
  maxTokens?: number;
}

/** Text generation result */
export interface GenerateTextResult {
  /** Generated text */
  text: string;
  /** Model used */
  model: string;
  /** Raw response */
  raw: unknown;
}

/** Image generation options */
export interface GenerateImageOptions {
  /** Image prompt */
  prompt: string;
  /** Model ID */
  modelId?: string;
  /** Number of images */
  n?: number;
  /** Image size */
  size?: string;
}

/** Image generation result */
export interface GenerateImageResult {
  /** Generated image URLs */
  urls: string[];
  /** Model used */
  model: string;
  /** Raw response */
  raw: unknown;
}

/** Embedding generation options */
export interface GenerateEmbeddingOptions {
  /** Text to embed */
  text: string;
  /** Model ID */
  modelId?: string;
}

/** Embedding generation result */
export interface GenerateEmbeddingResult {
  /** Generated embeddings */
  embeddings: number[];
  /** Model used */
  model: string;
  /** Raw response */
  raw: unknown;
}

/** Object generation options */
export interface GenerateObjectOptions<T> {
  /** Model ID */
  modelId?: string;
  /** Schema or type definition for the object */
  schema: ZodType<T>;
  /** Input prompt or context */
  prompt: string;
  /** Temperature */
  temperature?: number;
  /** Max tokens */
  maxTokens?: number;
}

/** Object generation result */
export interface GenerateObjectResult<T> {
  /** Generated object */
  object: T;
  /** Model used */
  model: string;
  /** Raw response */
  raw?: unknown;
}


/** Model provider interface */
export interface IModelProvider {
  /** Provider ID */
  providerId: ProviderId;
  /** Provider configuration */
  config: ProviderConfig;
  /** Check if provider supports a capability */
  supportsCapability(capability: ModelCapability): Effect.Effect<boolean, ProviderErrorType>;
  /** Generate text completion */
  complete(prompt: string, options?: ModelCompletionOptions): Effect.Effect<LLMCompletionResult, ProviderErrorType>;
  /** Generate text */
  generateText(options: GenerateTextOptions): Effect.Effect<GenerateTextResult, ProviderErrorType>;
  /** Generate image */
  generateImage(options: GenerateImageOptions): Effect.Effect<GenerateImageResult, ProviderErrorType>;
  /** Generate embedding */
  generateEmbedding(options: GenerateEmbeddingOptions): Effect.Effect<GenerateEmbeddingResult, ProviderErrorType>;
  /** Generate structured object */
  generateObject<T>(options: GenerateObjectOptions<T>): Effect.Effect<GenerateObjectResult<T>, ProviderErrorType>;
}

import { z } from "zod";

/**
 * Provider types supported by the system
 */
export const providerTypes = {
  OPENAI: "openai",
  ANTHROPIC: "anthropic",
  GOOGLE: "google",
  GROQ: "groq",
  LOCAL: "local",
  PERPLEXITY: "perplexity",
  DEEPSEEK: "deepseek",
  GROK: "xAi"
} as const;

export const ProviderType = {
  ...providerTypes
} as const;

export type ProviderType = typeof ProviderType[keyof typeof ProviderType];

/**
 * Rate limit configuration for a provider
 */
export interface ProviderRateLimit {
  readonly requestsPerMinute: number;
  readonly tokensPerMinute?: number;
}

/**
 * Root configuration containing all providers
 */
export interface ProviderConfigFile {
  readonly providers: ProviderConfig[];
  readonly defaultProviderName: string;
}

// Zod Schemas

export const ProviderRateLimitSchema = z.object({
  requestsPerMinute: z.number().positive(),
  tokensPerMinute: z.number().positive().optional()
});

export const ProviderTypeSchema = z.enum([
  ProviderType.OPENAI,
  ProviderType.ANTHROPIC,
  ProviderType.GOOGLE,
  ProviderType.GROQ,
  ProviderType.LOCAL,
  ProviderType.PERPLEXITY,
  ProviderType.DEEPSEEK,
  ProviderType.GROK
]);

export const ProviderConfigSchema = z.object({
  name: z.enum([
    ProviderType.OPENAI,
    ProviderType.ANTHROPIC,
    ProviderType.GOOGLE,
    ProviderType.GROQ,
    ProviderType.LOCAL,
    ProviderType.PERPLEXITY,
    ProviderType.DEEPSEEK,
    ProviderType.GROK
  ]),
  displayName: z.string(),
  type: ProviderTypeSchema,
  apiKeyEnvVar: z.string().optional(),
  baseUrl: z.string().url(),
  rateLimit: ProviderRateLimitSchema,
  modelIds: z.array(z.string()).optional()
});

export const ProviderConfigFileSchema = z.object({
  providers: z.array(ProviderConfigSchema),
  defaultProviderName: z.string()
}); 

/**
 * Model capabilities supported by the system
 */
export const ModelCapability = {
  TEXT_GENERATION: "text-generation",
  CHAT: "chat",
  FUNCTION_CALLING: "function-calling",
  VISION: "vision",
  AUDIO: "audio",
  REASONING: "reasoning",
  CODE_GENERATION: "code-generation",
  TOOL_USE: "tool-use",
  IMAGE_GENERATION: "image-generation",
  EMBEDDINGS: "embeddings",
  OBJECT_GENERATION: "object-generation"
} as const;

export type ModelCapability = typeof ModelCapability[keyof typeof ModelCapability];

/**
 * Context window sizes supported by models
 */
export const ContextWindowSize = {
  SMALL: "small",
  MEDIUM: "medium",
  LARGE: "large"
} as const;

export type ContextWindowSize = typeof ContextWindowSize[keyof typeof ContextWindowSize];

/**
 * Rate limit configuration for a model
 */
export interface RateLimit {
  readonly requestsPerMinute: number;
  readonly tokensPerMinute?: number;
}

/**
 * Model metadata containing additional information
 */
export interface ModelMetadata {
  readonly description: string;
  readonly [key: string]: unknown;
}

/**
 * Configuration for a single model
 */
export interface ModelConfig {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly provider: string;
  readonly modelName: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly contextWindowSize: ContextWindowSize;
  readonly costPer1kInputTokens: number;
  readonly costPer1kOutputTokens: number;
  readonly capabilities: ModelCapability[];
  readonly metadata: ModelMetadata;
  readonly rateLimit: RateLimit;
  readonly tags?: string[];
}

/**
 * Root configuration containing all models
 */
export interface ModelConfigFile {
  readonly name: string;
  readonly version: string;
  readonly models: ModelConfig[];
  readonly tags?: string[];
}

// Zod Schemas

export const RateLimitSchema = z.object({
  requestsPerMinute: z.number().positive(),
  tokensPerMinute: z.number().positive().optional()
});

export const ModelMetadataSchema = z.object({
  description: z.string()
}).catchall(z.unknown());

export const ModelCapabilitySchema = z.enum([
  ModelCapability.TEXT_GENERATION,
  ModelCapability.CHAT,
  ModelCapability.FUNCTION_CALLING,
  ModelCapability.VISION,
  ModelCapability.AUDIO,
  ModelCapability.REASONING,
  ModelCapability.CODE_GENERATION,
  ModelCapability.TOOL_USE,
  ModelCapability.IMAGE_GENERATION,
  ModelCapability.EMBEDDINGS
]);

export const ContextWindowSizeSchema = z.enum([
  ContextWindowSize.SMALL,
  ContextWindowSize.MEDIUM,
  ContextWindowSize.LARGE
]);

export const ModelConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  provider: z.string(),
  modelName: z.string(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  contextWindowSize: ContextWindowSizeSchema,
  costPer1kInputTokens: z.number().min(0),
  costPer1kOutputTokens: z.number().min(0),
  capabilities: z.array(ModelCapabilitySchema),
  metadata: ModelMetadataSchema,
  rateLimit: RateLimitSchema,
  tags: z.array(z.string()).optional()
});

export const ModelConfigFileSchema = z.object({
  name: z.string(),
  version: z.string(),
  models: z.array(ModelConfigSchema),
  tags: z.array(z.string()).optional()
}); 
