/**
 * @file Transcription service specific error types
 * @module services/ai/producers/transcription/errors
 */

import { AIError } from "@/services/ai/errors.js";

/**
 * Error thrown when there are issues with transcription model configuration or access
 */
export class TranscriptionModelError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, {
            ...options,
            code: "transcription_model_error",
            name: "TranscriptionModelError",
            module: "TranscriptionService",
            method: "transcribe"
        })
    }
}

/**
 * Error thrown when there are issues with transcription provider configuration or access
 */
export class TranscriptionProviderError extends AIError {
    constructor(message: string, options?: ErrorOptions & {
        status?: number;
        response?: unknown;
    }) {
        super(message, {
            ...options,
            code: "transcription_provider_error",
            name: "TranscriptionProviderError",
            module: "TranscriptionService",
            method: "transcribe"
        })
    }
}

/**
 * Error thrown when the transcription request fails
 */
export class TranscriptionError extends AIError {
    constructor(message: string, options?: ErrorOptions) {
        super(message, {
            ...options,
            code: "transcription_error",
            name: "TranscriptionError",
            module: "TranscriptionService",
            method: "transcribe"
        })
    }
}

/**
 * Error thrown when the audio file validation or processing fails
 */
export class TranscriptionAudioError extends AIError {
    constructor(message: string, options?: ErrorOptions & {
        fileType?: string;
        fileSize?: number;
        maxSize?: number;
    }) {
        super(message, {
            ...options,
            code: "transcription_audio_error",
            name: "TranscriptionAudioError",
            module: "TranscriptionService",
            method: "transcribe"
        })
    }
} 