import { ModelCapability } from "@/schema.js";
import { PROVIDER_NAMES } from "../provider/provider-universe.js";
import { ModelCapabilityDetail } from "./schema.js";
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
  readonly provider: typeof PROVIDER_NAMES[number];
  readonly modelName: string;
  readonly displayName: string;
  readonly description?: string;
  readonly vendorCapabilities: readonly ModelCapability[];
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
  readonly thinkingBudget?: number;
  readonly enabled: boolean;
}

export const MODEL_UNIVERSE: readonly ModelMetadata[] = [
  // OpenAI models - Latest Reasoning Models
  {
    id: "o4-mini",
    name: "o4-mini",
    version: "1.0.0",
    provider: "openai",
    modelName: "o4-mini",
    displayName: "o4-mini",
    description: "Fast, efficient reasoning model with multimodal capabilities and tool integration",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling", "reasoning"],
    derivedProficiencies: [],
    contextWindowSize: 200000,
    maxTokens: 100000,
    temperature: 0.7,
    costPer1kInputTokens: 0.00116,
    costPer1kOutputTokens: 0.00462,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    thinkingBudget: 50000,
    enabled: true
  },
  {
    id: "o3",
    name: "o3",
    version: "1.0.0",
    provider: "openai",
    modelName: "o3",
    displayName: "o3",
    description: "Advanced reasoning model with superior performance on complex tasks",
    vendorCapabilities: ["text-generation", "chat", "reasoning"],
    derivedProficiencies: [],
    contextWindowSize: 128000,
    maxTokens: 32768,
    temperature: 0.7,
    costPer1kInputTokens: 0.015,
    costPer1kOutputTokens: 0.06,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    thinkingBudget: 100000,
    enabled: true
  },
  {
    id: "o3-mini",
    name: "o3-mini",
    version: "1.0.0",
    provider: "openai",
    modelName: "o3-mini",
    displayName: "o3-mini",
    description: "Compact reasoning model balancing performance and cost",
    vendorCapabilities: ["text-generation", "chat", "reasoning"],
    derivedProficiencies: [],
    contextWindowSize: 200000,
    maxTokens: 32768,
    temperature: 0.7,
    costPer1kInputTokens: 0.001,
    costPer1kOutputTokens: 0.004,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    thinkingBudget: 30000,
    enabled: true
  },
  {
    id: "o1",
    name: "o1",
    version: "1.0.0",
    provider: "openai",
    modelName: "o1",
    displayName: "o1",
    description: "Advanced reasoning model for complex problem-solving",
    vendorCapabilities: ["text-generation", "chat", "reasoning"],
    derivedProficiencies: [],
    contextWindowSize: 200000,
    maxTokens: 32768,
    temperature: 0.7,
    costPer1kInputTokens: 0.015,
    costPer1kOutputTokens: 0.06,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    thinkingBudget: 65536,
    enabled: true
  },
  {
    id: "o1-pro",
    name: "o1-pro",
    version: "1.0.0",
    provider: "openai",
    modelName: "o1-pro",
    displayName: "o1-pro",
    description: "Premium reasoning model with enhanced capabilities",
    vendorCapabilities: ["text-generation", "chat", "reasoning"],
    derivedProficiencies: [],
    contextWindowSize: 200000,
    maxTokens: 32768,
    temperature: 0.7,
    costPer1kInputTokens: 0.06,
    costPer1kOutputTokens: 0.24,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    thinkingBudget: 131072,
    enabled: true
  },
  {
    id: "o1-preview",
    name: "o1-preview",
    version: "preview",
    provider: "openai",
    modelName: "o1-preview",
    displayName: "o1-preview",
    description: "Preview version of o1 reasoning model",
    vendorCapabilities: ["text-generation", "chat", "reasoning"],
    derivedProficiencies: [],
    contextWindowSize: 128000,
    maxTokens: 32768,
    temperature: 0.7,
    costPer1kInputTokens: 0.015,
    costPer1kOutputTokens: 0.06,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    thinkingBudget: 32768,
    enabled: true
  },
  {
    id: "o1-mini",
    name: "o1-mini",
    version: "1.0.0",
    provider: "openai",
    modelName: "o1-mini",
    displayName: "o1-mini",
    description: "Compact reasoning model for cost-effective applications",
    vendorCapabilities: ["text-generation", "chat", "reasoning"],
    derivedProficiencies: [],
    contextWindowSize: 128000,
    maxTokens: 32768,
    temperature: 0.7,
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.012,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    thinkingBudget: 16384,
    enabled: true
  },

  // GPT-4.1 Series
  {
    id: "gpt-4.1",
    name: "gpt-4.1",
    version: "1.0.0",
    provider: "openai",
    modelName: "gpt-4.1",
    displayName: "GPT-4.1",
    description: "Latest GPT-4.1 with massive context window and superior coding capabilities",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 1000000,
    maxTokens: 32768,
    temperature: 0.7,
    costPer1kInputTokens: 0.002,
    costPer1kOutputTokens: 0.008,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "gpt-4.1-mini",
    name: "gpt-4.1-mini",
    version: "1.0.0",
    provider: "openai",
    modelName: "gpt-4.1-mini",
    displayName: "GPT-4.1 Mini",
    description: "Balanced performance and cost with large context window",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 1000000,
    maxTokens: 32768,
    temperature: 0.7,
    costPer1kInputTokens: 0.0004,
    costPer1kOutputTokens: 0.0016,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "gpt-4.1-nano",
    name: "gpt-4.1-nano",
    version: "1.0.0",
    provider: "openai",
    modelName: "gpt-4.1-nano",
    displayName: "GPT-4.1 Nano",
    description: "Ultra-fast and cost-efficient with large context window",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 1000000,
    maxTokens: 32768,
    temperature: 0.7,
    costPer1kInputTokens: 0.0001,
    costPer1kOutputTokens: 0.0004,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },

  // GPT-4.5 Preview
  {
    id: "gpt-4.5",
    name: "gpt-4.5",
    version: "preview",
    provider: "openai",
    modelName: "gpt-4.5",
    displayName: "GPT-4.5 Preview",
    description: "Preview of next-generation GPT-4.5 model",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 128000,
    maxTokens: 16384,
    temperature: 0.7,
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.012,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },

  // GPT-4o Series
  {
    id: "gpt-4o",
    name: "gpt-4o",
    version: "1.0.0",
    provider: "openai",
    modelName: "gpt-4o",
    displayName: "GPT-4o",
    description: "Flagship multimodal model with vision and generation capabilities",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling", "image-generation"],
    derivedProficiencies: [],
    contextWindowSize: 128000,
    maxTokens: 16384,
    temperature: 0.7,
    costPer1kInputTokens: 0.005,
    costPer1kOutputTokens: 0.015,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "image/png"]
    },
    enabled: true
  },
  {
    id: "gpt-4o-2024-11-20",
    name: "gpt-4o-2024-11-20",
    version: "2024-11-20",
    provider: "openai",
    modelName: "gpt-4o-2024-11-20",
    displayName: "GPT-4o (Nov 2024)",
    description: "November 2024 version of GPT-4o with improved performance",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 128000,
    maxTokens: 16384,
    temperature: 0.7,
    costPer1kInputTokens: 0.0025,
    costPer1kOutputTokens: 0.01,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "gpt-4o-2024-08-06",
    name: "gpt-4o-2024-08-06",
    version: "2024-08-06",
    provider: "openai",
    modelName: "gpt-4o-2024-08-06",
    displayName: "GPT-4o (Aug 2024)",
    description: "August 2024 version of GPT-4o",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 128000,
    maxTokens: 16384,
    temperature: 0.7,
    costPer1kInputTokens: 0.0025,
    costPer1kOutputTokens: 0.01,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "gpt-4o-2024-05-13",
    name: "gpt-4o-2024-05-13",
    version: "2024-05-13",
    provider: "openai",
    modelName: "gpt-4o-2024-05-13",
    displayName: "GPT-4o (May 2024)",
    description: "Original GPT-4o release from May 2024",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 128000,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.005,
    costPer1kOutputTokens: 0.015,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "gpt-4o-mini",
    name: "gpt-4o-mini",
    version: "1.0.0",
    provider: "openai",
    modelName: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
    description: "Cost-effective multimodal model with vision capabilities",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 128000,
    maxTokens: 16384,
    temperature: 0.7,
    costPer1kInputTokens: 0.00015,
    costPer1kOutputTokens: 0.0006,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },

  // GPT-4 Turbo Series
  {
    id: "gpt-4-turbo",
    name: "gpt-4-turbo",
    version: "1.0.0",
    provider: "openai",
    modelName: "gpt-4-turbo",
    displayName: "GPT-4 Turbo",
    description: "Enhanced GPT-4 with larger context window",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 128000,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.01,
    costPer1kOutputTokens: 0.03,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "gpt-4-turbo-2024-04-09",
    name: "gpt-4-turbo-2024-04-09",
    version: "2024-04-09",
    provider: "openai",
    modelName: "gpt-4-turbo-2024-04-09",
    displayName: "GPT-4 Turbo (Apr 2024)",
    description: "April 2024 version of GPT-4 Turbo",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 128000,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.01,
    costPer1kOutputTokens: 0.03,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },

  // GPT-4 Classic Series
  {
    id: "gpt-4",
    name: "gpt-4",
    version: "1.0.0",
    provider: "openai",
    modelName: "gpt-4",
    displayName: "GPT-4",
    description: "Original GPT-4 model with strong reasoning capabilities",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 8192,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.03,
    costPer1kOutputTokens: 0.06,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "gpt-4-32k",
    name: "gpt-4-32k",
    version: "1.0.0",
    provider: "openai",
    modelName: "gpt-4-32k",
    displayName: "GPT-4 32K",
    description: "GPT-4 with extended 32K context window (legacy)",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 32768,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.06,
    costPer1kOutputTokens: 0.12,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: false
  },

  // GPT-3.5 Series
  {
    id: "gpt-3.5-turbo",
    name: "gpt-3.5-turbo",
    version: "1.0.0",
    provider: "openai",
    modelName: "gpt-3.5-turbo",
    displayName: "GPT-3.5 Turbo",
    description: "Fast and cost-effective model for most tasks",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 16385,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.0005,
    costPer1kOutputTokens: 0.0015,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "gpt-3.5-turbo-0125",
    name: "gpt-3.5-turbo-0125",
    version: "0125",
    provider: "openai",
    modelName: "gpt-3.5-turbo-0125",
    displayName: "GPT-3.5 Turbo (0125)",
    description: "January 2025 version of GPT-3.5 Turbo",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 16385,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.0005,
    costPer1kOutputTokens: 0.0015,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "gpt-3.5-turbo-1106",
    name: "gpt-3.5-turbo-1106",
    version: "1106",
    provider: "openai",
    modelName: "gpt-3.5-turbo-1106",
    displayName: "GPT-3.5 Turbo (1106)",
    description: "November 2023 version of GPT-3.5 Turbo",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 16385,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.001,
    costPer1kOutputTokens: 0.002,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "gpt-3.5-turbo-16k",
    name: "gpt-3.5-turbo-16k",
    version: "16k",
    provider: "openai",
    modelName: "gpt-3.5-turbo-16k",
    displayName: "GPT-3.5 Turbo 16K",
    description: "GPT-3.5 Turbo with 16K context window (legacy)",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 16385,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.004,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: false
  },

  // Realtime Models
  {
    id: "gpt-4o-realtime",
    name: "gpt-4o-realtime",
    version: "1.0.0",
    provider: "openai",
    modelName: "gpt-4o-realtime",
    displayName: "GPT-4o Realtime",
    description: "Real-time audio and text interaction model",
    vendorCapabilities: ["text-generation", "chat", "audio"],
    derivedProficiencies: [],
    contextWindowSize: 128000,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.005,
    costPer1kOutputTokens: 0.02,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "audio",
      supportedFormats: ["audio/mpeg", "audio/wav", "text/plain"]
    },
    enabled: true
  },
  {
    id: "gpt-4o-mini-realtime",
    name: "gpt-4o-mini-realtime",
    version: "1.0.0",
    provider: "openai",
    modelName: "gpt-4o-mini-realtime",
    displayName: "GPT-4o Mini Realtime",
    description: "Cost-effective real-time audio and text model",
    vendorCapabilities: ["text-generation", "chat", "audio"],
    derivedProficiencies: [],
    contextWindowSize: 128000,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.00015,
    costPer1kOutputTokens: 0.0006,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "audio",
      supportedFormats: ["audio/mpeg", "audio/wav", "text/plain"]
    },
    enabled: true
  },


  // OpenAI Embedding Models
  {
    id: "text-embedding-3-large",
    name: "text-embedding-3-large",
    version: "1.0.0",
    provider: "openai",
    modelName: "text-embedding-3-large",
    displayName: "Text Embedding 3 Large",
    description: "Most capable embedding model for text search and similarity tasks",
    vendorCapabilities: ["embeddings"],
    derivedProficiencies: [],
    contextWindowSize: 8191,
    costPer1kInputTokens: 0.00013,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "embedding",
      supportedFormats: ["application/json"]
    },
    enabled: true
  },
  {
    id: "text-embedding-3-small",
    name: "text-embedding-3-small",
    version: "1.0.0",
    provider: "openai",
    modelName: "text-embedding-3-small",
    displayName: "Text Embedding 3 Small",
    description: "Efficient and cost-effective embedding model",
    vendorCapabilities: ["embeddings"],
    derivedProficiencies: [],
    contextWindowSize: 8191,
    costPer1kInputTokens: 0.00002,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "embedding",
      supportedFormats: ["application/json"]
    },
    enabled: true
  },
  {
    id: "text-embedding-ada-002",
    name: "text-embedding-ada-002",
    version: "1.0.0",
    provider: "openai",
    modelName: "text-embedding-ada-002",
    displayName: "Text Embedding Ada 002",
    description: "Previous generation embedding model (legacy)",
    vendorCapabilities: ["embeddings"],
    derivedProficiencies: [],
    contextWindowSize: 8191,
    costPer1kInputTokens: 0.0001,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "embedding",
      supportedFormats: ["application/json"]
    },
    enabled: false
  },

  // OpenAI Image Generation Models
  {
    id: "dall-e-3",
    name: "dall-e-3",
    version: "1.0.0",
    provider: "openai",
    modelName: "dall-e-3",
    displayName: "DALL-E 3",
    description: "Advanced image generation model with high-quality outputs",
    vendorCapabilities: ["image-generation"],
    derivedProficiencies: [],
    costPer1kInputTokens: 0.04, // $0.040 per image (1024×1024)
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "image",
      supportedFormats: ["image/png"]
    },
    enabled: true
  },
  {
    id: "dall-e-2",
    name: "dall-e-2",
    version: "1.0.0",
    provider: "openai",
    modelName: "dall-e-2",
    displayName: "DALL-E 2",
    description: "Previous generation image generation model (legacy)",
    vendorCapabilities: ["image-generation"],
    derivedProficiencies: [],
    costPer1kInputTokens: 0.02, // $0.020 per image (1024×1024)
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "image",
      supportedFormats: ["image/png"]
    },
    enabled: false
  },

  // OpenAI Audio Models
  {
    id: "whisper-1",
    name: "whisper-1",
    version: "1.0.0",
    provider: "openai",
    modelName: "whisper-1",
    displayName: "Whisper",
    description: "Speech-to-text transcription and translation model",
    vendorCapabilities: ["audio"],
    derivedProficiencies: [],
    costPer1kInputTokens: 0.006, // $0.006 per minute
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "application/json"]
    },
    enabled: true
  },
  {
    id: "tts-1",
    name: "tts-1",
    version: "1.0.0",
    provider: "openai",
    modelName: "tts-1",
    displayName: "TTS 1",
    description: "Text-to-speech model for natural voice synthesis",
    vendorCapabilities: ["audio"],
    derivedProficiencies: [],
    costPer1kInputTokens: 0.015, // $0.015 per 1K characters
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "audio",
      supportedFormats: ["audio/mpeg", "audio/wav", "audio/flac"]
    },
    enabled: true
  },
  {
    id: "tts-1-hd",
    name: "tts-1-hd",
    version: "1.0.0",
    provider: "openai",
    modelName: "tts-1-hd",
    displayName: "TTS 1 HD",
    description: "High-definition text-to-speech model for premium voice quality",
    vendorCapabilities: ["audio"],
    derivedProficiencies: [],
    costPer1kInputTokens: 0.03, // $0.030 per 1K characters
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "audio",
      supportedFormats: ["audio/mpeg", "audio/wav", "audio/flac"]
    },
    enabled: true
  },

  // OpenAI Moderation Models
  {
    id: "text-moderation-latest",
    name: "text-moderation-latest",
    version: "latest",
    provider: "openai",
    modelName: "text-moderation-latest",
    displayName: "Text Moderation (Latest)",
    description: "Content moderation model for detecting harmful content",
    vendorCapabilities: ["text-generation"],
    derivedProficiencies: [],
    contextWindowSize: 32768,
    costPer1kInputTokens: 0.0002,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["application/json"]
    },
    enabled: true
  },
  {
    id: "text-moderation-stable",
    name: "text-moderation-stable",
    version: "stable",
    provider: "openai",
    modelName: "text-moderation-stable",
    displayName: "Text Moderation (Stable)",
    description: "Stable version of content moderation model",
    vendorCapabilities: ["text-generation"],
    derivedProficiencies: [],
    contextWindowSize: 32768,
    costPer1kInputTokens: 0.0002,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["application/json"]
    },
    enabled: true
  },

  // OpenAI Alias Models
  {
    id: "chatgpt-4o-latest",
    name: "chatgpt-4o-latest",
    version: "alias",
    provider: "openai",
    modelName: "chatgpt-4o-latest",
    displayName: "ChatGPT 4o (Latest)",
    description: "Alias pointing to the latest GPT-4o model",
    vendorCapabilities: ["text-generation", "chat", "vision", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 128000,
    maxTokens: 16384,
    temperature: 0.7,
    costPer1kInputTokens: 0.005,
    costPer1kOutputTokens: 0.015,
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },

  // Anthropic models
  {
    id: "claude-opus-4",
    name: "claude-opus-4",
    version: "20250514",
    provider: "anthropic",
    modelName: "claude-opus-4-20250514",
    displayName: "Claude Opus 4",
    description: "Anthropic's most powerful and capable model for highly complex tasks. Sets new standards in complex reasoning and advanced coding with superior intelligence.",
    vendorCapabilities: ["text-generation", "chat", "function-calling", "vision", "reasoning"],
    derivedProficiencies: [],
    contextWindowSize: 200000, // 200K tokens
    maxTokens: 32000, // 32K tokens max output
    temperature: 0.7,
    costPer1kInputTokens: 0.015, // $15/MTok
    costPer1kOutputTokens: 0.075, // $75/MTok
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "application/json"]
    },
    enabled: true,
  },
  {
    id: "claude-sonnet-4",
    name: "claude-sonnet-4",
    version: "20250514",
    provider: "anthropic",
    modelName: "claude-sonnet-4-20250514",
    displayName: "Claude Sonnet 4",
    description: "Anthropic's high-performance model with exceptional reasoning capabilities. Optimal balance of intelligence, cost, and speed for production use cases.",
    vendorCapabilities: ["text-generation", "chat", "function-calling", "vision", "reasoning"],
    derivedProficiencies: [],
    contextWindowSize: 200000, // 200K tokens
    maxTokens: 64000, // 64K tokens max output
    temperature: 0.7,
    costPer1kInputTokens: 0.003, // $3/MTok
    costPer1kOutputTokens: 0.015, // $15/MTok
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "application/json"]
    },
    enabled: true,
  },
  {
    id: "claude-3-7-sonnet",
    name: "claude-3-7-sonnet",
    version: "20250219",
    provider: "anthropic",
    modelName: "claude-3-7-sonnet-20250219",
    displayName: "Claude Sonnet 3.7",
    description: "Anthropic's first hybrid reasoning model with extended thinking capabilities. State-of-the-art for coding and delivers significant improvements in content generation, data analysis, and planning.",
    vendorCapabilities: ["text-generation", "chat", "function-calling", "vision", "reasoning"],
    derivedProficiencies: [],
    contextWindowSize: 200000, // 200K tokens
    maxTokens: 64000, // 64K tokens max output (with beta header: 128K)
    temperature: 0.7,
    costPer1kInputTokens: 0.003, // $3/MTok
    costPer1kOutputTokens: 0.015, // $15/MTok
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "application/json"]
    },
    enabled: true,
  },
  {
    id: "claude-3-5-sonnet",
    name: "claude-3-5-sonnet",
    version: "20241022",
    provider: "anthropic",
    modelName: "claude-3-5-sonnet-20241022",
    displayName: "Claude Sonnet 3.5",
    description: "Anthropic's intelligent model with strong performance across text generation, reasoning, math, and coding. Upgraded version with improved capabilities.",
    vendorCapabilities: ["text-generation", "chat", "function-calling", "vision"],
    derivedProficiencies: [],
    contextWindowSize: 200000, // 200K tokens
    maxTokens: 8192, // 8K tokens max output
    temperature: 0.7,
    costPer1kInputTokens: 0.003, // $3/MTok
    costPer1kOutputTokens: 0.015, // $15/MTok
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "application/json"]
    },
    enabled: true,
  },
  {
    id: "claude-3-5-haiku",
    name: "claude-3-5-haiku",
    version: "20241022",
    provider: "anthropic",
    modelName: "claude-3-5-haiku-20241022",
    displayName: "Claude Haiku 3.5",
    description: "Anthropic's fastest and most cost-effective model. Intelligence at blazing speeds with improved instruction following and precise tool use.",
    vendorCapabilities: ["text-generation", "chat", "function-calling", "vision"],
    derivedProficiencies: [],
    contextWindowSize: 200000, // 200K tokens
    maxTokens: 8192, // 8K tokens max output
    temperature: 0.7,
    costPer1kInputTokens: 0.0008, // $0.80/MTok
    costPer1kOutputTokens: 0.004, // $4/MTok
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "application/json"]
    },
    enabled: true,
  },
  {
    id: "claude-3-opus",
    name: "claude-3-opus",
    version: "20240229",
    provider: "anthropic",
    modelName: "claude-3-opus-20240229",
    displayName: "Claude Opus 3",
    description: "Anthropic's previous flagship model with top-level intelligence, fluency, and understanding. Powerful model for the most complex tasks.",
    vendorCapabilities: ["text-generation", "chat", "function-calling", "vision"],
    derivedProficiencies: [],
    contextWindowSize: 200000, // 200K tokens
    maxTokens: 4096, // 4K tokens max output
    temperature: 0.7,
    costPer1kInputTokens: 0.015, // $15/MTok
    costPer1kOutputTokens: 0.075, // $75/MTok
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "application/json"]
    },
    enabled: true,
  },
  {
    id: "claude-3-haiku",
    name: "claude-3-haiku",
    version: "20240307",
    provider: "anthropic",
    modelName: "claude-3-haiku-20240307",
    displayName: "Claude Haiku 3",
    description: "Anthropic's fast and compact model for near-instant responsiveness. Quick and accurate targeted performance for simpler tasks.",
    vendorCapabilities: ["text-generation", "chat", "function-calling", "vision"],
    derivedProficiencies: [],
    contextWindowSize: 200000, // 200K tokens
    maxTokens: 4096, // 4K tokens max output
    temperature: 0.7,
    costPer1kInputTokens: 0.00025, // $0.25/MTok
    costPer1kOutputTokens: 0.00125, // $1.25/MTok
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "application/json"]
    },
    enabled: true,
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
    },
    enabled: true
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
    },
    enabled: true
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
    },
    enabled: true
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
    },
    enabled: true
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
    },
    enabled: true
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
    },
    enabled: true
  },

  // Google models
  {
    id: "gemini-2.5-pro",
    name: "gemini-2.5-pro",
    version: "20250514",
    provider: "google",
    modelName: "gemini-2.5-pro-preview-06-05",
    displayName: "Gemini 2.5 Pro",
    description: "Google's most powerful thinking model with maximum response accuracy and state-of-the-art performance. Excels at complex coding, reasoning, and multimodal understanding.",
    vendorCapabilities: ["text-generation", "chat", "function-calling", "vision", "reasoning"],
    derivedProficiencies: [],
    contextWindowSize: 1048576, // 1M tokens
    maxTokens: 65536, // 64K tokens
    temperature: 0.7,
    costPer1kInputTokens: 1.25, // $1.25/1M tokens for <= 200K input
    costPer1kOutputTokens: 10.0, // $10/1M tokens for <= 200K input
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "application/json"]
    },
    thinkingBudget: 1000000, // 1M tokens for reasoning
    enabled: true,
  },
  {
    id: "gemini-2.5-flash",
    name: "gemini-2.5-flash",
    version: "20250520",
    provider: "google",
    modelName: "gemini-2.5-flash-preview-05-20",
    displayName: "Gemini 2.5 Flash",
    description: "Google's first hybrid reasoning model offering well-rounded capabilities with adaptive thinking budgets. Best model in terms of price-performance.",
    vendorCapabilities: ["text-generation", "chat", "function-calling", "vision", "reasoning"],
    derivedProficiencies: [],
    contextWindowSize: 1048576, // 1M tokens
    maxTokens: 65536, // 64K tokens
    temperature: 0.7,
    costPer1kInputTokens: 0.15, // $0.15/1M tokens
    costPer1kOutputTokens: 0.60, // $0.60/1M tokens (non-thinking)
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "application/json"]
    },
    thinkingBudget: 500000, // 500K tokens for reasoning
    enabled: true,
  },
  {
    id: "gemini-2.0-flash",
    name: "gemini-2.0-flash",
    version: "001",
    provider: "google",
    modelName: "gemini-2.0-flash",
    displayName: "Gemini 2.0 Flash",
    description: "Google's newest multimodal model with next generation features and improved capabilities. Built for agentic experiences with superior speed and native tool use.",
    vendorCapabilities: ["text-generation", "chat", "function-calling", "vision", "code-generation"],
    derivedProficiencies: [],
    contextWindowSize: 1048576, // 1M tokens
    maxTokens: 8192, // 8K tokens
    temperature: 0.7,
    costPer1kInputTokens: 0.10, // $0.10/1M tokens (text/image/video)
    costPer1kOutputTokens: 0.40, // $0.40/1M tokens
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "application/json"]
    },
    enabled: true,
  },
  {
    id: "gemini-2.0-flash-lite",
    name: "gemini-2.0-flash-lite",
    version: "001",
    provider: "google",
    modelName: "gemini-2.0-flash-lite",
    displayName: "Gemini 2.0 Flash Lite",
    description: "A Gemini 2.0 Flash model optimized for cost efficiency and low latency. Smallest and most cost effective model for at-scale usage.",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 1048576, // 1M tokens
    maxTokens: 8192, // 8K tokens
    temperature: 0.7,
    costPer1kInputTokens: 0.075, // $0.075/1M tokens
    costPer1kOutputTokens: 0.30, // $0.30/1M tokens
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "application/json"]
    },
    enabled: true,
  },
  {
    id: "gemini-1.5-pro",
    name: "gemini-1.5-pro",
    version: "002",
    provider: "google",
    modelName: "gemini-1.5-pro",
    displayName: "Gemini 1.5 Pro",
    description: "Google's mid-size multimodal model optimized for complex reasoning tasks. Can process large amounts of data with a breakthrough 2 million token context window.",
    vendorCapabilities: ["text-generation", "chat", "function-calling", "vision"],
    derivedProficiencies: [],
    contextWindowSize: 2097152, // 2M tokens
    maxTokens: 8192, // 8K tokens
    temperature: 0.7,
    costPer1kInputTokens: 1.25, // $1.25/1M tokens for <= 128K input
    costPer1kOutputTokens: 5.0, // $5/1M tokens for <= 128K input
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "application/json"]
    },
    enabled: true,
  },
  {
    id: "gemini-1.5-flash",
    name: "gemini-1.5-flash",
    version: "002",
    provider: "google",
    modelName: "gemini-1.5-flash",
    displayName: "Gemini 1.5 Flash",
    description: "Google's fast and versatile multimodal model for scaling across diverse tasks. Optimized for speed with a 1 million token context window.",
    vendorCapabilities: ["text-generation", "chat", "function-calling", "vision"],
    derivedProficiencies: [],
    contextWindowSize: 1048576, // 1M tokens
    maxTokens: 8192, // 8K tokens
    temperature: 0.7,
    costPer1kInputTokens: 0.075, // $0.075/1M tokens for <= 128K input
    costPer1kOutputTokens: 0.30, // $0.30/1M tokens for <= 128K input
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "application/json"]
    },
    enabled: true,
  },
  {
    id: "gemini-1.5-flash-8b",
    name: "gemini-1.5-flash-8b",
    version: "001",
    provider: "google",
    modelName: "gemini-1.5-flash-8b",
    displayName: "Gemini 1.5 Flash-8B",
    description: "Google's small model designed for lower intelligence tasks and high volume usage. Cost-effective option with 1 million token context window.",
    vendorCapabilities: ["text-generation", "chat", "function-calling", "vision"],
    derivedProficiencies: [],
    contextWindowSize: 1048576, // 1M tokens
    maxTokens: 8192, // 8K tokens
    temperature: 0.7,
    costPer1kInputTokens: 0.0375, // $0.0375/1M tokens for <= 128K input
    costPer1kOutputTokens: 0.15, // $0.15/1M tokens for <= 128K input
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "application/json"]
    },
    enabled: true,
  },
  {
    id: "gemini-1.0-pro",
    name: "gemini-1.0-pro",
    version: "001",
    provider: "google",
    modelName: "gemini-1.0-pro",
    displayName: "Gemini 1.0 Pro",
    description: "Google's original Gemini Pro model for text and multimodal tasks. Supports up to 32K context window with competitive performance.",
    vendorCapabilities: ["text-generation", "chat", "vision"],
    derivedProficiencies: [],
    contextWindowSize: 32768, // 32K tokens
    maxTokens: 8192, // 8K tokens
    temperature: 0.7,
    costPer1kInputTokens: 0.125, // $0.125/1K characters
    costPer1kOutputTokens: 0.375, // $0.375/1K characters
    supportedLanguages: ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "hi", "ar"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true,
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
    },
    enabled: true
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
    },
    enabled: true
  },

  // Groq models
  {
    id: "llama-4-scout-17b-16e-instruct",
    name: "llama-4-scout-17b-16e-instruct",
    version: "1.0.0",
    provider: "groq",
    modelName: "meta-llama/llama-4-scout-17b-16e-instruct",
    displayName: "Llama 4 Scout (17Bx16E)",
    description: "Meta's latest Llama 4 Scout model with 17B parameters and 16 experts, optimized for fast inference on Groq hardware.",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 131072, // 128K tokens
    maxTokens: 8192,
    temperature: 0.7,
    costPer1kInputTokens: 0.11,
    costPer1kOutputTokens: 0.34,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "llama-4-maverick-17b-128e-instruct",
    name: "llama-4-maverick-17b-128e-instruct",
    version: "1.0.0",
    provider: "groq",
    modelName: "meta-llama/llama-4-maverick-17b-128e-instruct",
    displayName: "Llama 4 Maverick (17Bx128E)",
    description: "Meta's Llama 4 Maverick model with 17B parameters and 128 experts, designed for complex reasoning tasks.",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 131072, // 128K tokens
    maxTokens: 8192,
    temperature: 0.7,
    costPer1kInputTokens: 0.20,
    costPer1kOutputTokens: 0.60,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "llama-guard-4-12b",
    name: "llama-guard-4-12b",
    version: "1.0.0",
    provider: "groq",
    modelName: "meta-llama/llama-guard-4-12b",
    displayName: "Llama Guard 4 12B",
    description: "Meta's Llama Guard 4 model for content moderation and safety classification with 128K context.",
    vendorCapabilities: ["text-generation", "chat"],
    derivedProficiencies: [],
    contextWindowSize: 131072, // 128K tokens
    maxTokens: 8192,
    temperature: 0.7,
    costPer1kInputTokens: 0.20,
    costPer1kOutputTokens: 0.20,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "deepseek-r1-distill-llama-70b",
    name: "deepseek-r1-distill-llama-70b",
    version: "1.0.0",
    provider: "groq",
    modelName: "deepseek-r1-distill-llama-70b",
    displayName: "DeepSeek R1 Distill Llama 70B",
    description: "DeepSeek's R1 reasoning model distilled into Llama 70B architecture, optimized for reasoning tasks.",
    vendorCapabilities: ["text-generation", "chat", "reasoning", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 131072, // 128K tokens
    maxTokens: 8192,
    temperature: 0.7,
    costPer1kInputTokens: 0.75,
    costPer1kOutputTokens: 0.99,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    thinkingBudget: 150000, // Reasoning model with thinking capability
    enabled: true
  },
  {
    id: "qwen-qwq-32b",
    name: "qwen-qwq-32b",
    version: "1.0.0",
    provider: "groq",
    modelName: "qwen-qwq-32b",
    displayName: "Qwen QwQ 32B (Preview)",
    description: "Alibaba's Qwen QwQ 32B reasoning model with 128K context, optimized for question-answering and reasoning.",
    vendorCapabilities: ["text-generation", "chat", "reasoning", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 131072, // 128K tokens
    maxTokens: 8192,
    temperature: 0.7,
    costPer1kInputTokens: 0.29,
    costPer1kOutputTokens: 0.39,
    supportedLanguages: ["en", "zh", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    thinkingBudget: 100000, // Reasoning model
    enabled: true
  },
  {
    id: "mistral-saba-24b",
    name: "mistral-saba-24b",
    version: "1.0.0",
    provider: "groq",
    modelName: "mistral-saba-24b",
    displayName: "Mistral Saba 24B",
    description: "Mistral's Saba 24B model optimized for fast inference on Groq hardware.",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 32768,
    maxTokens: 8192,
    temperature: 0.7,
    costPer1kInputTokens: 0.79,
    costPer1kOutputTokens: 0.79,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "llama-3.3-70b-versatile",
    version: "3.3",
    provider: "groq",
    modelName: "llama-3.3-70b-versatile",
    displayName: "Llama 3.3 70B Versatile",
    description: "Meta's Llama 3.3 70B model with 128K context, optimized for versatile tasks and fast inference.",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 131072, // 128K tokens
    maxTokens: 8192,
    temperature: 0.7,
    costPer1kInputTokens: 0.59,
    costPer1kOutputTokens: 0.79,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "llama-3.1-8b-instant",
    name: "llama-3.1-8b-instant",
    version: "3.1",
    provider: "groq",
    modelName: "llama-3.1-8b-instant",
    displayName: "Llama 3.1 8B Instant",
    description: "Meta's Llama 3.1 8B model with 128K context, optimized for ultra-fast inference and instant responses.",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 131072, // 128K tokens
    maxTokens: 8192,
    temperature: 0.7,
    costPer1kInputTokens: 0.05,
    costPer1kOutputTokens: 0.08,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "llama3-70b-8192",
    name: "llama3-70b-8192",
    version: "3.0",
    provider: "groq",
    modelName: "llama3-70b-8192",
    displayName: "Llama 3 70B",
    description: "Meta's Llama 3 70B model with 8K context, served via Groq with extremely fast inference.",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 8192,
    maxTokens: 8192,
    temperature: 0.7,
    costPer1kInputTokens: 0.59,
    costPer1kOutputTokens: 0.79,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "llama3-8b-8192",
    name: "llama3-8b-8192",
    version: "3.0",
    provider: "groq",
    modelName: "llama3-8b-8192",
    displayName: "Llama 3 8B",
    description: "Meta's Llama 3 8B model with 8K context, served via Groq with extremely fast inference.",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 8192,
    maxTokens: 8192,
    temperature: 0.7,
    costPer1kInputTokens: 0.05,
    costPer1kOutputTokens: 0.08,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "gemma2-9b-it",
    name: "gemma2-9b-it",
    version: "2.0",
    provider: "groq",
    modelName: "gemma2-9b-it",
    displayName: "Gemma 2 9B IT",
    description: "Google's Gemma 2 9B Instruct model with 8K context, served via Groq for fast inference.",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 8192,
    maxTokens: 8192,
    temperature: 0.7,
    costPer1kInputTokens: 0.20,
    costPer1kOutputTokens: 0.20,
    supportedLanguages: ["en"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "llama-guard-3-8b",
    name: "llama-guard-3-8b",
    version: "3.0",
    provider: "groq",
    modelName: "llama-guard-3-8b",
    displayName: "Llama Guard 3 8B",
    description: "Meta's Llama Guard 3 8B model for content moderation and safety classification.",
    vendorCapabilities: ["text-generation", "chat"],
    derivedProficiencies: [],
    contextWindowSize: 8192,
    maxTokens: 8192,
    temperature: 0.7,
    costPer1kInputTokens: 0.20,
    costPer1kOutputTokens: 0.20,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "mixtral-8x7b-32768",
    name: "mixtral-8x7b-32768",
    version: "1.0.0",
    provider: "groq",
    modelName: "mixtral-8x7b-32768",
    displayName: "Mixtral 8x7B",
    description: "Mixtral 8x7B Instruct model with 32K context, served via Groq for fast inference.",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 32768,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.24,
    costPer1kOutputTokens: 0.24,
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "whisper-large-v3",
    name: "whisper-large-v3",
    version: "3.0",
    provider: "groq",
    modelName: "whisper-large-v3",
    displayName: "Whisper Large V3",
    description: "OpenAI's Whisper Large V3 model for multilingual speech-to-text transcription, optimized for Groq's fast inference.",
    vendorCapabilities: ["audio"],
    derivedProficiencies: [],
    contextWindowSize: 30000, // ~30 seconds of audio context
    maxTokens: 8192,
    temperature: 0.0,
    costPer1kInputTokens: 0.111, // Per hour transcribed
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "application/json"]
    },
    enabled: true
  },
  {
    id: "whisper-large-v3-turbo",
    name: "whisper-large-v3-turbo",
    version: "3.0-turbo",
    provider: "groq",
    modelName: "whisper-large-v3-turbo",
    displayName: "Whisper Large V3 Turbo",
    description: "A fine-tuned version of Whisper Large V3 designed for fast, multilingual transcription tasks with improved speed.",
    vendorCapabilities: ["audio"],
    derivedProficiencies: [],
    contextWindowSize: 30000, // ~30 seconds of audio context
    maxTokens: 8192,
    temperature: 0.0,
    costPer1kInputTokens: 0.04, // Per hour transcribed
    supportedLanguages: ["en", "multi"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "application/json"]
    },
    enabled: true
  },
  {
    id: "distil-whisper-large-v3-en",
    name: "distil-whisper-large-v3-en",
    version: "3.0-distil",
    provider: "groq",
    modelName: "distil-whisper-large-v3-en",
    displayName: "Distil-Whisper Large V3 English",
    description: "A distilled version of Whisper Large V3 optimized for English-only transcription with faster performance and lower cost.",
    vendorCapabilities: ["audio"],
    derivedProficiencies: [],
    contextWindowSize: 30000, // ~30 seconds of audio context
    maxTokens: 8192,
    temperature: 0.0,
    costPer1kInputTokens: 0.02, // Per hour transcribed
    supportedLanguages: ["en"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain", "application/json"]
    },
    enabled: true
  },

  // Perplexity models
  {
    id: "sonar-pro",
    name: "sonar-pro",
    version: "1.0.0",
    provider: "perplexity",
    modelName: "sonar-pro",
    displayName: "Perplexity Sonar Pro",
    description: "Perplexity's premier offering with search grounding, supporting advanced queries and follow-ups.",
    vendorCapabilities: ["chat", "text-generation", "search"],
    derivedProficiencies: [],
    contextWindowSize: 200000,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015,
    supportedLanguages: ["en"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "sonar",
    name: "sonar",
    version: "1.0.0",
    provider: "perplexity",
    modelName: "sonar",
    displayName: "Perplexity Sonar",
    description: "Perplexity's lightweight offering with search grounding, quicker and cheaper than Sonar Pro.",
    vendorCapabilities: ["chat", "text-generation", "search"],
    derivedProficiencies: [],
    contextWindowSize: 127072,
    maxTokens: 4096,
    temperature: 0.7,
    costPer1kInputTokens: 0.001,
    costPer1kOutputTokens: 0.001,
    supportedLanguages: ["en"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "sonar-deep-research",
    name: "sonar-deep-research",
    version: "1.0.0",
    provider: "perplexity",
    modelName: "sonar-deep-research",
    displayName: "Perplexity Sonar Deep Research",
    description: "Perplexity's model optimized for in-depth research tasks with comprehensive analysis.",
    vendorCapabilities: ["chat", "text-generation", "search", "research"],
    derivedProficiencies: [],
    contextWindowSize: 200000,
    maxTokens: 8192,
    temperature: 0.7,
    costPer1kInputTokens: 0.01,
    costPer1kOutputTokens: 0.01,
    supportedLanguages: ["en"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "sonar-reasoning-pro",
    name: "sonar-reasoning-pro",
    version: "1.0.0",
    provider: "perplexity",
    modelName: "sonar-reasoning-pro",
    displayName: "Perplexity Sonar Reasoning Pro",
    description: "Premier reasoning offering powered by DeepSeek R1 for complex analytical tasks.",
    vendorCapabilities: ["chat", "text-generation", "reasoning"],
    derivedProficiencies: [],
    contextWindowSize: 200000,
    maxTokens: 8192,
    temperature: 0.7,
    supportedLanguages: ["en"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "sonar-reasoning",
    name: "sonar-reasoning",
    version: "1.0.0",
    provider: "perplexity",
    modelName: "sonar-reasoning",
    displayName: "Perplexity Sonar Reasoning",
    description: "Lightweight reasoning offering powered by reasoning models trained with DeepSeek R1.",
    vendorCapabilities: ["chat", "text-generation", "reasoning"],
    derivedProficiencies: [],
    contextWindowSize: 127072,
    maxTokens: 4096,
    temperature: 0.7,
    supportedLanguages: ["en"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "r1-1776",
    name: "r1-1776",
    version: "1.0.0",
    provider: "perplexity",
    modelName: "r1-1776",
    displayName: "R1 1776",
    description: "Uncensored version of the DeepSeek R1 model post-trained to provide unbiased, factual information.",
    vendorCapabilities: ["chat", "text-generation", "reasoning"],
    derivedProficiencies: [],
    contextWindowSize: 200000,
    maxTokens: 8192,
    temperature: 0.7,
    supportedLanguages: ["en"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
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
    },
    enabled: true
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
    },
    enabled: true
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
    },
    enabled: true
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
    },
    enabled: true
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
    },
    enabled: true
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
    },
    enabled: true
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
    },
    enabled: true
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
    },
    enabled: true
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
    },
    enabled: true
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
    },
    enabled: true
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
    },
    enabled: true
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
    },
    enabled: true
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
    },
    enabled: true
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
    },
    enabled: true
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
    },
    enabled: true
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
    },
    enabled: true
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
    },
    enabled: true
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
    contextWindowSize: 4096,
    enabled: true
  },
  // Qwen Models
  {
    id: "qwen-max",
    name: "qwen-max",
    version: "2.5",
    provider: "qwen",
    modelName: "qwen-max",
    displayName: "Qwen Max",
    description: "Qwen's most powerful model with advanced reasoning and tool use capabilities",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 32768,
    maxTokens: 2048,
    temperature: 0.7,
    costPer1kInputTokens: 0.002,
    costPer1kOutputTokens: 0.01,
    supportedLanguages: ["en", "zh"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "qwen-plus",
    name: "qwen-plus",
    version: "2.5",
    provider: "qwen",
    modelName: "qwen-plus",
    displayName: "Qwen Plus",
    description: "Balanced performance model for general-purpose use",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 32768,
    maxTokens: 2048,
    temperature: 0.7,
    costPer1kInputTokens: 0.001,
    costPer1kOutputTokens: 0.005,
    supportedLanguages: ["en", "zh"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "qwen-max-longcontext",
    name: "qwen-max-longcontext",
    version: "2.5",
    provider: "qwen",
    modelName: "qwen-max-longcontext",
    displayName: "Qwen Max Long Context",
    description: "Extended context window version of Qwen Max",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 128000,
    maxTokens: 2048,
    temperature: 0.7,
    costPer1kInputTokens: 0.004,
    costPer1kOutputTokens: 0.02,
    supportedLanguages: ["en", "zh"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "qwen-plus-longcontext",
    name: "qwen-plus-longcontext",
    version: "2.5",
    provider: "qwen",
    modelName: "qwen-plus-longcontext",
    displayName: "Qwen Plus Long Context",
    description: "Extended context window version of Qwen Plus",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 128000,
    maxTokens: 2048,
    temperature: 0.7,
    costPer1kInputTokens: 0.002,
    costPer1kOutputTokens: 0.01,
    supportedLanguages: ["en", "zh"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "qwen-vl-max",
    name: "qwen-vl-max",
    version: "2.5",
    provider: "qwen",
    modelName: "qwen-vl-max",
    displayName: "Qwen VL Max",
    description: "Vision-language model with advanced multimodal capabilities",
    vendorCapabilities: ["text-generation", "chat", "function-calling", "vision"],
    derivedProficiencies: [],
    contextWindowSize: 32768,
    maxTokens: 2048,
    temperature: 0.7,
    costPer1kInputTokens: 0.004,
    costPer1kOutputTokens: 0.02,
    supportedLanguages: ["en", "zh"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "qwen-vl-plus",
    name: "qwen-vl-plus",
    version: "2.5",
    provider: "qwen",
    modelName: "qwen-vl-plus",
    displayName: "Qwen VL Plus",
    description: "Cost-effective vision-language model",
    vendorCapabilities: ["text-generation", "chat", "function-calling", "vision"],
    derivedProficiencies: [],
    contextWindowSize: 32768,
    maxTokens: 2048,
    temperature: 0.7,
    costPer1kInputTokens: 0.002,
    costPer1kOutputTokens: 0.01,
    supportedLanguages: ["en", "zh"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  },
  {
    id: "text-embedding-v3",
    name: "text-embedding-v3",
    version: "3.0",
    provider: "qwen",
    modelName: "text-embedding-v3",
    displayName: "Text Embedding V3",
    description: "High-quality text embeddings optimized for semantic search",
    vendorCapabilities: ["embeddings"],
    derivedProficiencies: [],
    contextWindowSize: 8192,
    maxTokens: 8192,
    temperature: 0,
    costPer1kInputTokens: 0.0001,
    costPer1kOutputTokens: 0,
    supportedLanguages: ["en", "zh"],
    responseFormat: {
      type: "embedding",
      supportedFormats: ["vector"]
    },
    enabled: true
  },
  {
    id: "gemini-2.0-flash",
    name: "gemini-2_0-flash",
    version: "2.0.0",
    provider: "google",
    modelName: "gemini-2.0-flash",
    displayName: "Gemini 2.0 Flash",
    description: "Google's Gemini 2.0 Flash model optimized for fast responses",
    vendorCapabilities: ["text-generation", "chat", "function-calling"],
    derivedProficiencies: [],
    contextWindowSize: 32768,
    maxTokens: 32768,
    temperature: 0.7,
    costPer1kInputTokens: 0.0001,
    costPer1kOutputTokens: 0.0002,
    supportedLanguages: ["en"],
    responseFormat: {
      type: "text",
      supportedFormats: ["text/plain"]
    },
    enabled: true
  }
] as const;

/**
 * Canonical tuple of model IDs derived from the universe.
 * Used for type-safe schema and literal union elsewhere.
 */
export const MODEL_IDS = MODEL_UNIVERSE.map(m => m.id) as unknown as readonly (typeof MODEL_UNIVERSE)[number]["id"][];
