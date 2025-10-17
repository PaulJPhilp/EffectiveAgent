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
  GenerateImageOptions, GenerateObjectOptions, GenerateSpeechOptions, GenerateTextOptions, StreamObjectOptions, StreamTextOptions, TranscribeOptions
} from "./input-types.js";
// Re-export message types and schemas
export {
  EffectiveRole, ImageUrlPart, Message, Metadata, Part, TextPart,
  ToolCallPart,
  ToolPart, type EffectiveMessage, type EffectiveRole as EffectiveRoleType, type Part as PartType
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
// Re-export streaming API
export { streamObject, streamText } from "./streaming/index.js";

// Re-export streaming types
export type {
  FinalMessageEvent, MessagePartEvent, StreamCallbacks, StreamCompleteEvent, StreamController, StreamErrorEvent, StreamEvents, StreamHandle, StreamOptions, StreamResult, TokenDeltaEvent, ToolCallDeltaEvent,
  ToolCallReadyEvent, ToolCallStartedEvent, ToolResultEvent, UnifiedStreamEvent
} from "./streaming/types.js";

// Re-export tool APIs
export {
  defineTool, defineToolWithDescription, runTools, runToolsWithMap
} from "./tools/index.js";

// Re-export tool types
export type {
  Tool, ToolCall, ToolCallingOptions, ToolDefinition, ToolHandler, ToolOrchestrationContext, ToolOrchestrationResult, ToolResult, ToolSchemaType
} from "./tools/types.js";

// Re-export core types
export type {
  BaseAiOptions, BaseAiParameters, EffectiveResponse, EffectiveUsage, FinishReason, GenerateBaseResult, ProviderEffectiveResponse
} from "./types.js";

