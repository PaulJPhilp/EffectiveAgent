// File: src/shared/services-effect/provider/types.ts

import * as Effect from 'effect/Effect';
import type { ProviderError } from './errors.js';
import type { ZodType } from 'zod';

/** Provider error type */
export type ProviderErrorType = ProviderError;

/** Provider ID type */
export type ProviderId = string & { readonly _brand: unique symbol };

/** Provider configuration */
export interface ProviderConfig {
  /** Provider name */
  name: string;
  /** Provider version */
  version: string;
  /** Provider tags */
  tags: string[];
  /** Provider ID */
  id: string;
  /** Provider description */
  description?: string;
  /** Environment variable for API key */
  apiKeyEnvVar?: string;
  /** Base URL for API */
  baseUrl?: string;
  /** API version */
  apiVersion?: string;
  /** Supported models */
  models?: string[];
  /** Supported capabilities */
  capabilities?: ModelCapability[];
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

/** Model capabilities */
export enum ModelCapability {
  /** Text generation */
  TEXT = 'text',
  /** Image generation */
  IMAGE = 'image',
  /** Embedding generation */
  EMBEDDING = 'embedding',
  /** Object generation */
  OBJECT = 'object'
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
