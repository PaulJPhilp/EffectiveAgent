/**
 * @file Index file for exporting the TranscriptionService and related utilities
 * @module services/ai/producers/transcription
 */

// Export service implementation
export {
    AudioFormats, TranscriptionService,
    TranscriptionServiceLive,
    type TranscriptionOptions,
    type TranscriptionResult,
    type TranscriptionServiceApi
} from "./service.js";

// Export error types
export {
    TranscriptionAudioError,
    TranscriptionError,
    TranscriptionModelError,
    TranscriptionProviderError
} from "./errors.js";
