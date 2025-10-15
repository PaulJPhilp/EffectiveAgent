/**
 * @file Main entry point for @effective-agent/ai-sdk
 * @module @effective-agent/ai-sdk
 * @since 0.1.0
 */


// Re-export AI operations
export {
  generateEmbeddingsWithModel, generateObjectWithModel, generateTextWithModel
} from "./ai-operations.js";

// Re-export error types
export {
  AiSdkConfigError, AiSdkError, AiSdkMessageTransformError, AiSdkOperationError, AiSdkProviderError,
  AiSdkSchemaError
} from "./errors.js";
// Re-export input types
export type {
  ChatOptions, EffectiveInput, GenerateEmbeddingsOptions,
  GenerateImageOptions, GenerateObjectOptions, GenerateSpeechOptions, GenerateTextOptions, StreamObjectOptions, StreamTextOptions, ToolDefinition, TranscribeOptions
} from "./input-types.js";
// Re-export message types and schemas
export {type EffectiveMessage, 
  EffectiveRole, type EffectiveRole as EffectiveRoleType, ImageUrlPart, Message, Metadata, Part, type Part as PartType, TextPart,
  ToolCallPart,
  ToolPart 
} from "./message.js";
// Re-export message transformation utilities
export {
  toEffectiveMessage, toEffectiveMessages, toVercelMessage, toVercelMessages
} from "./message-transformer.js";
// Re-export provider factory
export {
  createProvider, getEmbeddingModel, getLanguageModel,
  getLanguageModelByName, type ProviderConfig, type ProviderName
} from "./provider-factory.js";
// Re-export result types
export type {
  ChatResult, GenerateEmbeddingsResult,
  GenerateImageResult, GenerateObjectResult, GenerateSpeechResult, GenerateTextResult, ReasoningDetail, ResponseMessage, Source, StreamingObjectChunk, StreamingTextChunk, ToolCallRequest, TranscribeResult, TranscriptionSegment, Warning
} from "./result-types.js";
// Re-export schema conversion utilities
export {
  encodeWithSchema, toStandardSchema, toZodSchema, validateWithSchema
} from "./schema-converter.js";
// Re-export core types
export type {
  BaseAiOptions, BaseAiParameters, EffectiveResponse, EffectiveUsage, FinishReason, GenerateBaseResult, ProviderEffectiveResponse
} from "./types.js";

