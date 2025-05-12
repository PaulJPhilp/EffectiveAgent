/**
 * @file Main exports for Chat Service
 * @module services/ai/producers/chat
 */

// Service implementation
export {
    ChatService,
    ChatServiceLive, type ChatCompletionOptions, type ChatServiceApi
} from "./service.js";

// Error types
export {
    ChatCompletionError,
    ChatModelError,
    ChatProviderError
} from "./errors.js";

// Utility functions
export {
    mapEffectMessagesToClientCoreMessages
} from "./helpers.js";
