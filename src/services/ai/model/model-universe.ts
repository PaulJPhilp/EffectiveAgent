/**
 * Canonical list of all models supported by the ModelService.
 *
 * This is the single source of truth for model metadata, configuration, and capabilities.
 * 
 * To add a new model, add a new entry to this array and update ModelMetadata if needed.
 * This file is used by the ModelService to look up model information.
 */
import { ModelCapability } from "@/schema.js";
import type { Provider } from "./schema.js";

export interface ModelMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly provider: Provider;
  readonly modelName: string;
  readonly displayName: string;
  readonly description?: string;
  readonly capabilities: readonly (typeof ModelCapability.literals)[number][];
  readonly contextWindowSize?: number;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly costPer1kInputTokens?: number;
  readonly costPer1kOutputTokens?: number;
  readonly supportedLanguages?: readonly string[];
  readonly responseFormat?: {
    readonly type: "text" | "image" | "audio" | "embedding";
    readonly supportedFormats: readonly string[];
  };
}

export const MODEL_UNIVERSE: readonly ModelMetadata[] = [
  // OpenAI models
  {
    id: "gpt-4o",
    name: "gpt-4o",
    version: "1.0.0",
    provider: "openai",
    modelName: "gpt-4o",
    displayName: "GPT-4o",
    description: "OpenAI's most advanced model, optimized for chat and multimodal capabilities",
    capabilities: ["text-generation", "chat", "vision", "function-calling"],
    contextWindowSize: 128000,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.005,
    costPer1kOutputTokens: 0.015,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "gpt-4-turbo",
    name: "gpt-4-turbo",
    version: "1.0.0",
    provider: "openai",
    modelName: "gpt-4-turbo",
    displayName: "GPT-4 Turbo",
    description: "OpenAI's most advanced model optimized for both cost and capability",
    capabilities: ["text-generation", "chat", "function-calling"],
    contextWindowSize: 128000,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.01,
    costPer1kOutputTokens: 0.03,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "gpt-3.5-turbo",
    name: "gpt-3.5-turbo",
    version: "1.0.0",
    provider: "openai",
    modelName: "gpt-3.5-turbo",
    displayName: "GPT-3.5 Turbo",
    description: "OpenAI's fast and economical model for chat-based applications",
    capabilities: ["text-generation", "chat", "function-calling"],
    contextWindowSize: 16385,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.0005,
    costPer1kOutputTokens: 0.0015,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "text-embedding-3-large",
    name: "text-embedding-3-large",
    version: "1.0.0",
    provider: "openai",
    modelName: "text-embedding-3-large",
    displayName: "Text Embedding 3 Large",
    description: "OpenAI's most capable embedding model for text search and similarity tasks",
    capabilities: ["embeddings"],
    contextWindowSize: 8191,
    costPer1kInputTokens: 0.00013,
    responseFormat: {
      type: "embedding",
      supportedFormats: ["application/json"]
    }
  },
  
  // Anthropic models
  {
    id: "claude-3-opus",
    name: "claude-3-opus",
    version: "1.0.0",
    provider: "anthropic",
    modelName: "claude-3-opus",
    displayName: "Claude 3 Opus",
    description: "Anthropic's most capable model for complex tasks requiring deep analysis",
    capabilities: ["text-generation", "chat", "vision", "function-calling"],
    contextWindowSize: 200000,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.015,
    costPer1kOutputTokens: 0.075,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "claude-3-sonnet",
    name: "claude-3-sonnet",
    version: "1.0.0",
    provider: "anthropic",
    modelName: "claude-3-sonnet",
    displayName: "Claude 3 Sonnet",
    description: "Anthropic's balanced model offering high-quality at a lower cost than Opus",
    capabilities: ["text-generation", "chat", "vision", "function-calling"],
    contextWindowSize: 200000,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "claude-3-haiku",
    name: "claude-3-haiku",
    version: "1.0.0",
    provider: "anthropic",
    modelName: "claude-3-haiku",
    displayName: "Claude 3 Haiku",
    description: "Anthropic's fastest and most compact model for high-throughput applications",
    capabilities: ["text-generation", "chat", "vision"],
    contextWindowSize: 200000,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.00025,
    costPer1kOutputTokens: 0.00125,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  
  // Google models
  {
    id: "gemini-pro",
    name: "gemini-pro",
    version: "1.0.0",
    provider: "google",
    modelName: "gemini-pro",
    displayName: "Gemini Pro",
    description: "Google's general purpose text and chat model",
    capabilities: ["text-generation", "chat", "function-calling"],
    contextWindowSize: 32000,
    maxTokens: 8192,
    temperature: 0.7,
    costPer1kInputTokens: 0.00125,
    costPer1kOutputTokens: 0.00375,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "gemini-pro-vision",
    name: "gemini-pro-vision",
    version: "1.0.0",
    provider: "google",
    modelName: "gemini-pro-vision",
    displayName: "Gemini Pro Vision",
    description: "Google's multimodal model for text, image and chat",
    capabilities: ["text-generation", "chat", "vision"],
    contextWindowSize: 32000,
    maxTokens: 8192,
    temperature: 0.7,
    costPer1kInputTokens: 0.00125,
    costPer1kOutputTokens: 0.00375,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  
  // Groq models
  {
    id: "llama-3-8b-groq",
    name: "llama-3-8b-groq",
    version: "1.0.0",
    provider: "groq",
    modelName: "llama-3-8b-8192-instruct",
    displayName: "Llama 3 8B (Groq)",
    description: "Meta's Llama 3 8B model served via Groq with extremely fast inference",
    capabilities: ["text-generation", "chat"],
    contextWindowSize: 8192,
    maxTokens: 2048,
    temperature: 0.7,
    costPer1kInputTokens: 0.0001,
    costPer1kOutputTokens: 0.0002,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "llama-3-70b-groq",
    name: "llama-3-70b-groq",
    version: "1.0.0",
    provider: "groq",
    modelName: "llama-3-70b-8192-instruct",
    displayName: "Llama 3 70B (Groq)",
    description: "Meta's Llama 3 70B model served via Groq with extremely fast inference",
    capabilities: ["text-generation", "chat"],
    contextWindowSize: 8192,
    maxTokens: 2048,
    temperature: 0.7,
    costPer1kInputTokens: 0.0006,
    costPer1kOutputTokens: 0.0009,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  }
] as const;

/**
 * Canonical tuple of model IDs derived from the universe.
 * Used for type-safe schema and literal union elsewhere.
 */
export const MODEL_IDS = MODEL_UNIVERSE.map(m => m.id) as unknown as readonly (typeof MODEL_UNIVERSE)[number]["id"][];
