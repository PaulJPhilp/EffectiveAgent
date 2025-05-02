/**
 * @file Transcription service specific error types
 * @module services/ai/producers/transcription/errors
 */

import { EffectiveError } from "@/errors.js";

/**
 * Error thrown when there are issues with transcription model configuration or access
 */
/**
 * Error thrown when there are issues with transcription model configuration or access.
 * @extends EffectiveError
 */
export class TranscriptionModelError extends EffectiveError {
    constructor(params: { description: string; module: string; method: string; cause?: unknown }) {
        super(params);
    }
}

/**
 * Error thrown when there are issues with transcription provider configuration or access
 */
/**
 * Error thrown when there are issues with transcription provider configuration or access.
 * @extends EffectiveError
 */
export class TranscriptionProviderError extends EffectiveError {
    public readonly status?: number;
    public readonly response?: unknown;
    constructor(params: { status?: number; response?: unknown; description: string; module: string; method: string; cause?: unknown }) {
        super(params);
        this.status = params.status;
        this.response = params.response;
    }
}

/**
 * Error thrown when the transcription request fails
 */
/**
 * Error thrown when the transcription request fails.
 * @extends EffectiveError
 */
export class TranscriptionError extends EffectiveError {
    constructor(params: { description: string; module: string; method: string; cause?: unknown }) {
        super(params);
    }
}

/**
 * Error thrown when the audio file validation or processing fails
 */
/**
 * Error thrown when the audio file validation or processing fails
 * @extends EffectiveError
 */
export class TranscriptionAudioError extends EffectiveError {
    public readonly fileType?: string;
    public readonly fileSize?: number;
    public readonly maxSize?: number;
    /**
     * @param params - Error details
     */
    constructor(params: {
        description: string;
        module: string;
        method: string;
        cause?: unknown;
        fileType?: string;
        fileSize?: number;
        maxSize?: number;
    }) {
        super(params);
        this.fileType = params.fileType;
        this.fileSize = params.fileSize;
        this.maxSize = params.maxSize;
    }
}