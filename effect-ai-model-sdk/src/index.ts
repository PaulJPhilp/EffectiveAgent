/**
 * @file Main entry point for @org_name/effect-ai-model-sdk
 * @module @org_name/effect-ai-model-sdk
 */

// Re-export core operations
export { generateText, generateObject, generateEmbeddings } from "./core/operations.js";

// Re-export error types
export {
  AiSdkConfigError,
  AiSdkError,
  AiSdkMessageTransformError,
  AiSdkOperationError,
  AiSdkProviderError,
  AiSdkSchemaError
} from "./errors.js";

// Re-export provider system
export {
  createProvider,
  getLanguageModel,
  getLanguageModelByName,
  getEmbeddingModel,
  type ProviderName,
  type ProviderConfig
} from "./providers/factory.js";

// Re-export message types and utilities
export {
  EffectiveRole,
  TextPart,
  ToolCallPart,
  ToolPart,
  ImageUrlPart,
  Part,
  Metadata,
  Message,
  type EffectiveMessage,
  toVercelMessage,
  toEffectiveMessage,
  toVercelMessages,
  toEffectiveMessages
} from "./types/messages.js";

// Re-export input types
export type {
  EffectiveInput,
  GenerateTextOptions,
  GenerateObjectOptions,
  ChatOptions,
  GenerateEmbeddingsOptions,
  GenerateImageOptions,
  GenerateSpeechOptions,
  TranscribeOptions,
  StreamTextOptions,
  StreamObjectOptions,
  ToolDefinition
} from "./types/inputs.js";

// Re-export result types
export type {
  GenerateTextResult,
  ChatResult,
  GenerateObjectResult,
  GenerateEmbeddingsResult,
  GenerateImageResult,
  GenerateSpeechResult,
  TranscribeResult,
  StreamingTextChunk,
  StreamingObjectChunk
} from "./types/results.js";

// Re-export core types
export type {
  FinishReason,
  EffectiveUsage,
  GenerateBaseResult,
  EffectiveResponse,
  ProviderEffectiveResponse,
  BaseAiParameters,
  BaseAiOptions
} from "./types/core.js";
