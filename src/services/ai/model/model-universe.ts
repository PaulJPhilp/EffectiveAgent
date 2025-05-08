import { ModelCapability } from "@/schema.js";
import { ModelCapabilityDetail, Provider } from "./schema.js";
/**
 * Canonical list of all models supported by the ModelService.
 *
 * This is the single source of truth for model metadata, configuration, and capabilities.
 * 
 * To add a new model, add a new entry to this array and update ModelMetadata if needed.
 * This file is used by the ModelService to look up model information.
 */

export interface ModelMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly provider: Provider;
  readonly modelName: string;
  readonly displayName: string;
  readonly description?: string;
  readonly vendorCapabilities: readonly (typeof ModelCapability.literals)[number][];
  readonly derivedProficiencies?: readonly ModelCapabilityDetail[];
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
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling", "audio"],
    derivedProficiencies: [],
    contextWindowSize: 128000,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.005,
    costPer1kOutputTokens: 0.015,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "audio/mpeg"]
    }
  },
  {
    id: "gpt-4o-mini",
    name: "gpt-4o-mini",
    version: "1.0.0",
    provider: "openai",
    modelName: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
    description: "OpenAI's compact and fast multimodal model",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling", "audio"],
    derivedProficiencies: [],
    contextWindowSize: 128000,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.00015,
    costPer1kOutputTokens: 0.0006,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "audio/mpeg"]
    }
  },
  {
    id: "gpt-4o-audio-preview",
    name: "gpt-4o-audio-preview",
    version: "preview",
    provider: "openai",
    modelName: "gpt-4o-audio-preview",
    displayName: "GPT-4o Audio (Preview)",
    description: "Preview version of GPT-4o focused on audio capabilities",
    vendorCapabilities: ["audio", "chat"],
    derivedProficiencies: [],
    contextWindowSize: 128000,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "audio",
      supportedFormats: ["audio/mpeg", "audio/wav", "text/plain"]
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
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
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
    id: "gpt-4.1",
    name: "gpt-4.1",
    version: "preview",
    provider: "openai",
    modelName: "gpt-4.1",
    displayName: "GPT-4.1 (Preview)",
    description: "Next iteration of the GPT-4 family (Preview)",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 128000,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "gpt-4.1-mini",
    name: "gpt-4.1-mini",
    version: "preview",
    provider: "openai",
    modelName: "gpt-4.1-mini",
    displayName: "GPT-4.1 Mini (Preview)",
    description: "Compact version of the GPT-4.1 family (Preview)",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 128000,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "gpt-4.1-nano",
    name: "gpt-4.1-nano",
    version: "preview",
    provider: "openai",
    modelName: "gpt-4.1-nano",
    displayName: "GPT-4.1 Nano (Preview)",
    description: "Smallest version of the GPT-4.1 family (Preview)",
    vendorCapabilities: ["text-generation", "chat"],
    derivedProficiencies: [],
    contextWindowSize: 32768,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "gpt-4",
    name: "gpt-4",
    version: "1.0.0",
    provider: "openai",
    modelName: "gpt-4",
    displayName: "GPT-4",
    description: "OpenAI's foundational large model",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 8192,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.03,
    costPer1kOutputTokens: 0.06,
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
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
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
    vendorCapabilities: ["embeddings"],
    derivedProficiencies: [],
    contextWindowSize: 8191,
    costPer1kInputTokens: 0.00013,
    responseFormat: {
      type: "embedding",
      supportedFormats: ["application/json"]
    }
  },
  {
    id: "text-embedding-3-small",
    name: "text-embedding-3-small",
    version: "1.0.0",
    provider: "openai",
    modelName: "text-embedding-3-small",
    displayName: "Text Embedding 3 Small",
    description: "OpenAI's efficient embedding model",
    vendorCapabilities: ["embeddings"],
    derivedProficiencies: [],
    contextWindowSize: 8191,
    costPer1kInputTokens: 0.00002,
    responseFormat: {
      type: "embedding",
      supportedFormats: ["application/json"]
    }
  },
  {
    id: "text-embedding-ada-002",
    name: "text-embedding-ada-002",
    version: "1.0.0",
    provider: "openai",
    modelName: "text-embedding-ada-002",
    displayName: "Text Embedding Ada 002",
    description: "OpenAI's widely used previous generation embedding model",
    vendorCapabilities: ["embeddings"],
    derivedProficiencies: [],
    contextWindowSize: 8191,
    costPer1kInputTokens: 0.0001,
    responseFormat: {
      type: "embedding",
      supportedFormats: ["application/json"]
    }
  },

  // Placeholder for o1 models - mapping to gpt-4o?
  {
    id: "o1",
    name: "o1",
    version: "1.0.0",
    provider: "openai",
    modelName: "o1",
    displayName: "OpenAI o1 (GPT-4o Alias?)",
    description: "Alias or specific version related to GPT-4o",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling", "audio"],
    derivedProficiencies: [],
    contextWindowSize: 128000,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.005,
    costPer1kOutputTokens: 0.015,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "audio/mpeg"]
    }
  },
  {
    id: "o1-mini",
    name: "o1-mini",
    version: "1.0.0",
    provider: "openai",
    modelName: "o1-mini",
    displayName: "OpenAI o1 Mini (GPT-4o Mini Alias?)",
    description: "Alias or specific version related to GPT-4o Mini",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling", "audio"],
    derivedProficiencies: [],
    contextWindowSize: 128000,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.00015,
    costPer1kOutputTokens: 0.0006,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "audio/mpeg"]
    }
  },
  {
    id: "o1-preview",
    name: "o1-preview",
    version: "preview",
    provider: "openai",
    modelName: "o1-preview",
    displayName: "OpenAI o1 (Preview)",
    description: "Preview version related to GPT-4o family",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling", "audio"],
    derivedProficiencies: [],
    contextWindowSize: 128000,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "audio/mpeg"]
    }
  },

  // Placeholder for o3 models - mapping to gpt-3.5?
  {
    id: "o3",
    name: "o3",
    version: "1.0.0",
    provider: "openai",
    modelName: "o3",
    displayName: "OpenAI o3",
    description: "Alias or model from OpenAI (GPT-3.5 family?)",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 16385,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "o3-mini",
    name: "o3-mini",
    version: "1.0.0",
    provider: "openai",
    modelName: "o3-mini",
    displayName: "OpenAI o3 Mini",
    description: "Compact alias or model from OpenAI (GPT-3.5 family?)",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 16385,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },

  // Placeholder for o4 models - mapping to gpt-4?
  {
    id: "o4-mini",
    name: "o4-mini",
    version: "1.0.0",
    provider: "openai",
    modelName: "o4-mini",
    displayName: "OpenAI o4 Mini",
    description: "Compact alias or model from OpenAI (GPT-4 family?)",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 32768,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },

  // Alias for gpt-4o
  {
    id: "chatgpt-4o-latest",
    name: "chatgpt-4o-latest",
    version: "alias",
    provider: "openai",
    modelName: "chatgpt-4o-latest",
    displayName: "ChatGPT 4o (Latest Alias)",
    description: "Alias pointing to the latest GPT-4o model",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling", "audio"],
    derivedProficiencies: [],
    contextWindowSize: 128000,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.005,
    costPer1kOutputTokens: 0.015,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "audio/mpeg"]
    }
  },

  // Anthropic models
  {
    id: "claude-3-opus",
    name: "claude-3-opus",
    version: "20240229",
    provider: "anthropic",
    modelName: "claude-3-opus-20240229",
    displayName: "Claude 3 Opus",
    description: "Anthropic's most capable model for complex tasks requiring deep analysis",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
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
    version: "20240229",
    provider: "anthropic",
    modelName: "claude-3-sonnet-20240229",
    displayName: "Claude 3 Sonnet",
    description: "Anthropic's balanced model offering high-quality at a lower cost than Opus",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
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
    id: "claude-3-5-sonnet",
    name: "claude-3.5-sonnet",
    version: "20240620",
    provider: "anthropic",
    modelName: "claude-3.5-sonnet-20240620",
    displayName: "Claude 3.5 Sonnet",
    description: "Anthropic's most intelligent model yet, setting new industry benchmarks across a wide range of evaluations.",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
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
    version: "20240307",
    provider: "anthropic",
    modelName: "claude-3-haiku-20240307",
    displayName: "Claude 3 Haiku",
    description: "Anthropic's fastest and most compact model for high-throughput applications",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
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
  {
    id: "claude-2.1",
    name: "claude-2.1",
    version: "1.0.0",
    provider: "anthropic",
    modelName: "claude-2.1",
    displayName: "Claude 2.1",
    description: "Anthropic's previous generation large context model",
    vendorCapabilities: ["text-generation", "chat"],
    derivedProficiencies: [],
    contextWindowSize: 200000,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.008,
    costPer1kOutputTokens: 0.024,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "claude-2.0",
    name: "claude-2.0",
    version: "1.0.0",
    provider: "anthropic",
    modelName: "claude-2.0",
    displayName: "Claude 2.0",
    description: "Anthropic's earlier capable model",
    vendorCapabilities: ["text-generation", "chat"],
    derivedProficiencies: [],
    contextWindowSize: 100000,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.008,
    costPer1kOutputTokens: 0.024,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "claude-instant-1.2",
    name: "claude-instant-1.2",
    version: "1.0.0",
    provider: "anthropic",
    modelName: "claude-instant-1.2",
    displayName: "Claude Instant 1.2",
    description: "Anthropic's faster, lower-cost instant model",
    vendorCapabilities: ["text-generation", "chat"],
    derivedProficiencies: [],
    contextWindowSize: 100000,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.0008,
    costPer1kOutputTokens: 0.0024,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },

  // Future/Preview Anthropic Models (Placeholders)
  {
    id: "claude-3-7-sonnet-preview",
    name: "claude-3.7-sonnet-preview",
    version: "20250219-preview",
    provider: "anthropic",
    modelName: "claude-3-7-sonnet-20250219",
    displayName: "Claude 3.7 Sonnet (Preview)",
    description: "Future preview version of Claude Sonnet.",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 200000,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "claude-3-5-sonnet-preview",
    name: "claude-3.5-sonnet-preview",
    version: "20241022-preview",
    provider: "anthropic",
    modelName: "claude-3-5-sonnet-20241022",
    displayName: "Claude 3.5 Sonnet (Preview - Oct 2024)",
    description: "Future preview version of Claude 3.5 Sonnet.",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 200000,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "claude-3-5-haiku-preview",
    name: "claude-3.5-haiku-preview",
    version: "20241022-preview",
    provider: "anthropic",
    modelName: "claude-3-5-haiku-20241022",
    displayName: "Claude 3.5 Haiku (Preview - Oct 2024)",
    description: "Future preview version combining 3.5 capabilities with Haiku speed.",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 200000,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },

  // Google models
  {
    id: "gemini-1.5-pro",
    name: "gemini-1.5-pro",
    version: "1.5",
    provider: "google",
    modelName: "gemini-1.5-pro",
    displayName: "Gemini 1.5 Pro",
    description: "Google's large context multimodal model",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 1048576,
    maxTokens: 8192,
    temperature: 0.7,
    costPer1kInputTokens: 0.0035,
    costPer1kOutputTokens: 0.0105,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "gemini-1.5-pro-latest",
    name: "gemini-1.5-pro-latest",
    version: "latest",
    provider: "google",
    modelName: "gemini-1.5-pro-latest",
    displayName: "Gemini 1.5 Pro (Latest)",
    description: "Pointer to the latest version of Google's Gemini 1.5 Pro model",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 1048576,
    maxTokens: 8192,
    temperature: 0.7,
    costPer1kInputTokens: 0.0035,
    costPer1kOutputTokens: 0.0105,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "gemini-1.5-flash",
    name: "gemini-1.5-flash",
    version: "1.5",
    provider: "google",
    modelName: "gemini-1.5-flash",
    displayName: "Gemini 1.5 Flash",
    description: "Google's fast and cost-effective large context multimodal model",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 1048576,
    maxTokens: 8192,
    temperature: 0.7,
    costPer1kInputTokens: 0.00035,
    costPer1kOutputTokens: 0.00105,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "gemini-1.5-flash-latest",
    name: "gemini-1.5-flash-latest",
    version: "latest",
    provider: "google",
    modelName: "gemini-1.5-flash-latest",
    displayName: "Gemini 1.5 Flash (Latest)",
    description: "Pointer to the latest version of Google's Gemini 1.5 Flash model",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 1048576,
    maxTokens: 8192,
    temperature: 0.7,
    costPer1kInputTokens: 0.00035,
    costPer1kOutputTokens: 0.00105,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "gemini-1.5-flash-8b",
    name: "gemini-1.5-flash-8b",
    version: "1.5-8b",
    provider: "google",
    modelName: "gemini-1.5-flash-8b",
    displayName: "Gemini 1.5 Flash 8B",
    description: "8 Billion parameter variant of Gemini 1.5 Flash",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 1048576,
    maxTokens: 8192,
    temperature: 0.7,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "gemini-1.5-flash-8b-latest",
    name: "gemini-1.5-flash-8b-latest",
    version: "1.5-8b-latest",
    provider: "google",
    modelName: "gemini-1.5-flash-8b-latest",
    displayName: "Gemini 1.5 Flash 8B (Latest)",
    description: "Pointer to the latest 8 Billion parameter variant of Gemini 1.5 Flash",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 1048576,
    maxTokens: 8192,
    temperature: 0.7,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "gemini-pro",
    name: "gemini-pro",
    version: "1.0.0",
    provider: "google",
    modelName: "gemini-pro",
    displayName: "Gemini Pro",
    description: "Google's general purpose text and chat model",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 32768,
    maxTokens: 8192,
    temperature: 0.7,
    costPer1kInputTokens: 0.000125,
    costPer1kOutputTokens: 0.000375,
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
    vendorCapabilities: ["text-generation", "chat", "vision"],
    derivedProficiencies: [],
    contextWindowSize: 16384,
    maxTokens: 4096,
    temperature: 0.4,
    costPer1kInputTokens: 0.000125,
    costPer1kOutputTokens: 0.000375,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "embedding-001",
    name: "embedding-001",
    version: "1.0.0",
    provider: "google",
    modelName: "embedding-001",
    displayName: "Google Embedding 001",
    description: "Google's text embedding model",
    vendorCapabilities: ["embeddings"],
    derivedProficiencies: [],
    contextWindowSize: 8192,
    costPer1kInputTokens: 0.00002,
    responseFormat: {
      type: "embedding",
      supportedFormats: ["application/json"]
    }
  },

  // Groq models
  {
    id: "llama3-8b-groq",
    name: "llama3-8b-groq",
    version: "1.0.0",
    provider: "groq",
    modelName: "llama3-8b-8192",
    displayName: "Llama 3 8B (Groq)",
    description: "Meta's Llama 3 8B model served via Groq with extremely fast inference",
    vendorCapabilities: ["text-generation", "chat"],
    derivedProficiencies: [],
    contextWindowSize: 8192,
    maxTokens: 8192,
    temperature: 0.7,
    costPer1kInputTokens: 0.00005,
    costPer1kOutputTokens: 0.00008,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "llama3-70b-groq",
    name: "llama3-70b-groq",
    version: "1.0.0",
    provider: "groq",
    modelName: "llama3-70b-8192",
    displayName: "Llama 3 70B (Groq)",
    description: "Meta's Llama 3 70B model served via Groq with extremely fast inference",
    vendorCapabilities: ["text-generation", "chat"],
    derivedProficiencies: [],
    contextWindowSize: 8192,
    maxTokens: 8192,
    temperature: 0.7,
    costPer1kInputTokens: 0.00059,
    costPer1kOutputTokens: 0.00079,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "mixtral-8x7b-groq",
    name: "mixtral-8x7b-groq",
    version: "1.0.0",
    provider: "groq",
    modelName: "mixtral-8x7b-32768",
    displayName: "Mixtral 8x7B (Groq)",
    description: "Mixtral 8x7B Instruct model served via Groq",
    vendorCapabilities: ["text-generation", "chat"],
    derivedProficiencies: [],
    contextWindowSize: 32768,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.00024,
    costPer1kOutputTokens: 0.00024,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "gemma-7b-it-groq",
    name: "gemma-7b-it-groq",
    version: "1.0.0",
    provider: "groq",
    modelName: "gemma-7b-it",
    displayName: "Gemma 7B IT (Groq)",
    description: "Google's Gemma 7B Instruct model served via Groq",
    vendorCapabilities: ["text-generation", "chat"],
    derivedProficiencies: [],
    contextWindowSize: 8192,
    maxTokens: 8192,
    temperature: 0.7,
    costPer1kInputTokens: 0.00007,
    costPer1kOutputTokens: 0.00007,
    supportedLanguages: ["en"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },

  // xAI models
  {
    id: "grok-1",
    name: "grok-1",
    version: "1.0.0",
    provider: "xai",
    modelName: "grok-1",
    displayName: "Grok-1",
    description: "xAI's Grok model",
    vendorCapabilities: ["chat"],
    derivedProficiencies: [],
    contextWindowSize: 8192,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "grok-3",
    name: "grok-3",
    version: "1.0.0",
    provider: "xai",
    modelName: "grok-3",
    displayName: "Grok 3",
    description: "xAI's Grok 3 model",
    vendorCapabilities: ["chat"],
    derivedProficiencies: [],
    contextWindowSize: 131072,
    maxTokens: 8192,
    temperature: 0.7,
    supportedLanguages: ["en"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "grok-3-fast",
    name: "grok-3-fast",
    version: "1.0.0",
    provider: "xai",
    modelName: "grok-3-fast",
    displayName: "Grok 3 Fast",
    description: "xAI's Grok 3 Fast model",
    vendorCapabilities: ["chat"],
    derivedProficiencies: [],
    contextWindowSize: 131072,
    maxTokens: 8192,
    temperature: 0.7,
    supportedLanguages: ["en"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "grok-3-mini",
    name: "grok-3-mini",
    version: "1.0.0",
    provider: "xai",
    modelName: "grok-3-mini",
    displayName: "Grok 3 Mini",
    description: "xAI's Grok 3 Mini model",
    vendorCapabilities: ["chat"],
    derivedProficiencies: [],
    contextWindowSize: 131072,
    maxTokens: 8192,
    temperature: 0.7,
    supportedLanguages: ["en"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "grok-3-mini-fast",
    name: "grok-3-mini-fast",
    version: "1.0.0",
    provider: "xai",
    modelName: "grok-3-mini-fast",
    displayName: "Grok 3 Mini Fast",
    description: "xAI's Grok 3 Mini Fast model",
    vendorCapabilities: ["chat"],
    derivedProficiencies: [],
    contextWindowSize: 131072,
    maxTokens: 8192,
    temperature: 0.7,
    supportedLanguages: ["en"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "grok-2-1212",
    name: "grok-2-1212",
    version: "1.0.0",
    provider: "xai",
    modelName: "grok-2-1212",
    displayName: "Grok 2 (1212)",
    description: "xAI's Grok 2 model (1212 version)",
    vendorCapabilities: ["chat"],
    derivedProficiencies: [],
    contextWindowSize: 8192,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "grok-2-vision-1212",
    name: "grok-2-vision-1212",
    version: "1.0.0",
    provider: "xai",
    modelName: "grok-2-vision-1212",
    displayName: "Grok 2 Vision (1212)",
    description: "xAI's Grok 2 Vision model (1212 version)",
    vendorCapabilities: ["chat", "vision"],
    derivedProficiencies: [],
    contextWindowSize: 8192,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "grok-beta",
    name: "grok-beta",
    version: "beta",
    provider: "xai",
    modelName: "grok-beta",
    displayName: "Grok Beta",
    description: "xAI's Grok Beta model",
    vendorCapabilities: ["chat"],
    derivedProficiencies: [],
    contextWindowSize: 8192,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "grok-vision-beta",
    name: "grok-vision-beta",
    version: "beta",
    provider: "xai",
    modelName: "grok-vision-beta",
    displayName: "Grok Vision Beta",
    description: "xAI's Grok Vision Beta model",
    vendorCapabilities: ["chat", "vision"],
    derivedProficiencies: [],
    contextWindowSize: 8192,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },

  // Perplexity models
  {
    id: "sonar-pro",
    name: "sonar-pro",
    version: "1.0.0",
    provider: "perplexity",
    modelName: "sonar-pro",
    displayName: "Perplexity Sonar Pro",
    description: "Perplexity's advanced conversational model with internet access.",
    vendorCapabilities: ["chat", "text-generation", "search"],
    derivedProficiencies: [],
    contextWindowSize: 16384,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "sonar",
    name: "sonar",
    version: "1.0.0",
    provider: "perplexity",
    modelName: "sonar",
    displayName: "Perplexity Sonar",
    description: "Perplexity's standard conversational model with internet access.",
    vendorCapabilities: ["chat", "text-generation", "search"],
    derivedProficiencies: [],
    contextWindowSize: 16384,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "sonar-deep-research",
    name: "sonar-deep-research",
    version: "1.0.0",
    provider: "perplexity",
    modelName: "sonar-deep-research",
    displayName: "Perplexity Sonar Deep Research",
    description: "Perplexity's model optimized for in-depth research tasks.",
    vendorCapabilities: ["chat", "text-generation", "search", "research"],
    derivedProficiencies: [],
    contextWindowSize: 16384,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "pplx-7b-chat",
    name: "pplx-7b-chat",
    version: "1.0.0",
    provider: "perplexity",
    modelName: "pplx-7b-chat",
    displayName: "Perplexity 7B Chat",
    description: "Perplexity's 7B chat model",
    vendorCapabilities: ["chat"],
    derivedProficiencies: [],
    contextWindowSize: 4096,
    maxTokens: 2048,
    temperature: 0.7,
    supportedLanguages: ["en"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "pplx-70b-chat",
    name: "pplx-70b-chat",
    version: "1.0.0",
    provider: "perplexity",
    modelName: "pplx-70b-chat",
    displayName: "Perplexity 70B Chat",
    description: "Perplexity's 70B chat model",
    vendorCapabilities: ["chat"],
    derivedProficiencies: [],
    contextWindowSize: 4096,
    maxTokens: 2048,
    temperature: 0.7,
    supportedLanguages: ["en"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },

  // DeepSeek models
  {
    id: "deepseek-chat",
    name: "deepseek-chat",
    version: "1.0.0",
    provider: "deepseek",
    modelName: "deepseek-chat",
    displayName: "DeepSeek Chat",
    description: "DeepSeek general chat model",
    vendorCapabilities: ["chat", "text-generation"],
    derivedProficiencies: [],
    contextWindowSize: 32768,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en", "zh"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "deepseek-coder",
    name: "deepseek-coder",
    version: "1.0.0",
    provider: "deepseek",
    modelName: "deepseek-coder",
    displayName: "DeepSeek Coder",
    description: "DeepSeek code generation model",
    vendorCapabilities: ["code-generation", "text-generation"],
    derivedProficiencies: [],
    contextWindowSize: 16384,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "deepseek-reasoner",
    name: "deepseek-reasoner",
    version: "1.0.0",
    provider: "deepseek",
    modelName: "deepseek-reasoner",
    displayName: "DeepSeek Reasoner",
    description: "DeepSeek model optimized for reasoning tasks.",
    vendorCapabilities: ["chat", "text-generation", "reasoning", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 32768,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en", "zh"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },

  // Experimental / Preview Google Models
  {
    id: "gemini-2.5-flash-preview",
    name: "gemini-2.5-flash-preview-04-17",
    version: "2.5-preview-0417",
    provider: "google",
    modelName: "gemini-2.5-flash-preview-04-17",
    displayName: "Gemini 2.5 Flash (Preview 04-17)",
    description: "Preview version of Google Gemini 2.5 Flash model",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 1048576,
    maxTokens: 8192,
    temperature: 0.7,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "gemini-2.5-pro-experimental",
    name: "gemini-2.5-pro-exp-03-25",
    version: "2.5-exp-0325",
    provider: "google",
    modelName: "gemini-2.5-pro-exp-03-25",
    displayName: "Gemini 2.5 Pro (Experimental 03-25)",
    description: "Experimental version of Google Gemini 2.5 Pro model",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 1048576,
    maxTokens: 8192,
    temperature: 0.7,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "gemini-2.0-flash",
    name: "gemini-2.0-flash",
    version: "2.0",
    provider: "google",
    modelName: "gemini-2.0-flash",
    displayName: "Gemini 2.0 Flash",
    description: "Google Gemini 2.0 Flash model",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 1048576,
    maxTokens: 8192,
    temperature: 0.7,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },

  // Qwen models
  {
    id: "qwen-turbo",
    name: "qwen-turbo",
    version: "1.0.0",
    provider: "qwen",
    modelName: "qwen-turbo",
    displayName: "Qwen Turbo",
    description: "Alibaba's fast and cost-effective Qwen model.",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 8192,
    maxTokens: 2048,
    temperature: 0.7,
    supportedLanguages: ["en", "zh"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "qwen-plus",
    name: "qwen-plus",
    version: "1.0.0",
    provider: "qwen",
    modelName: "qwen-plus",
    displayName: "Qwen Plus",
    description: "Alibaba's balanced Qwen model.",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 32768,
    maxTokens: 2048,
    temperature: 0.7,
    supportedLanguages: ["en", "zh"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "qwen-max",
    name: "qwen-max",
    version: "1.0.0",
    provider: "qwen",
    modelName: "qwen-max",
    displayName: "Qwen Max",
    description: "Alibaba's most capable Qwen model.",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 32768,
    maxTokens: 2048,
    temperature: 0.7,
    supportedLanguages: ["en", "zh"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "qwen-vl-plus",
    name: "qwen-vl-plus",
    version: "1.0.0",
    provider: "qwen",
    modelName: "qwen-vl-plus",
    displayName: "Qwen VL Plus",
    description: "Alibaba's vision-language model.",
    vendorCapabilities: ["text-generation", "chat", "vision"],
    derivedProficiencies: [],
    contextWindowSize: 32768,
    maxTokens: 2048,
    temperature: 0.7,
    supportedLanguages: ["en", "zh"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "image/jpeg", "image/png"]
    }
  },
  {
    id: "qwen-vl-max",
    name: "qwen-vl-max",
    version: "1.0.0",
    provider: "qwen",
    modelName: "qwen-vl-max",
    displayName: "Qwen VL Max",
    description: "Alibaba's most capable vision-language model.",
    vendorCapabilities: ["text-generation", "chat", "vision"],
    derivedProficiencies: [],
    contextWindowSize: 32768,
    maxTokens: 2048,
    temperature: 0.7,
    supportedLanguages: ["en", "zh"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "image/jpeg", "image/png"]
    }
  },
  {
    id: "qwen-plus-latest",
    name: "qwen-plus-latest",
    version: "latest",
    provider: "qwen",
    modelName: "qwen-plus-latest",
    displayName: "Qwen Plus (Latest)",
    description: "Pointer to the latest version of Alibaba's balanced Qwen model.",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 32768,
    maxTokens: 2048,
    temperature: 0.7,
    supportedLanguages: ["en", "zh"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "qwen2.5-72b-instruct",
    name: "qwen2.5-72b-instruct",
    version: "2.5",
    provider: "qwen",
    modelName: "qwen2.5-72b-instruct",
    displayName: "Qwen 2.5 72B Instruct",
    description: "Alibaba's Qwen 2.5 72B instruction-tuned model.",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 65536,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en", "zh", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "qwen2.5-14b-instruct-1m",
    name: "qwen2.5-14b-instruct-1m",
    version: "2.5-1M",
    provider: "qwen",
    modelName: "qwen2.5-14b-instruct-1m",
    displayName: "Qwen 2.5 14B Instruct (1M Context)",
    description: "Alibaba's Qwen 2.5 14B instruction-tuned model with 1M token context window.",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 1048576,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en", "zh", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    }
  },
  {
    id: "qwen2.5-vl-72b-instruct",
    name: "qwen2.5-vl-72b-instruct",
    version: "2.5",
    provider: "qwen",
    modelName: "qwen2.5-vl-72b-instruct",
    displayName: "Qwen 2.5 VL 72B Instruct",
    description: "Alibaba's Qwen 2.5 72B vision-language instruction-tuned model.",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 65536,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en", "zh", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "image/jpeg", "image/png"]
    }
  },
  {
    id: "placeholder-id",
    name: "placeholder-name",
    version: "1.0.0",
    provider: "openai",
    modelName: "placeholder-model-name",
    displayName: "Placeholder Model",
    description: "This is a placeholder, update all real entries.",
    vendorCapabilities: ["chat"],
    derivedProficiencies: [],
    contextWindowSize: 4096
  }
] as const;

/**
 * Canonical tuple of model IDs derived from the universe.
 * Used for type-safe schema and literal union elsewhere.
 */
export const MODEL_IDS = MODEL_UNIVERSE.map(m => m.id) as unknown as readonly (typeof MODEL_UNIVERSE)[number]["id"][];
