/**
 * @file Implements the TranscriptionService for handling AI audio transcription.
 * @module services/ai/producers/transcription/service
 */

import { ModelService, type ModelServiceApi } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { AiError } from "@effect/ai/AiError";
import { Layer } from "effect";
import * as Effect from "effect/Effect";
import type { Span } from "effect/Tracer";
import { TranscriptionAudioError, TranscriptionError, TranscriptionModelError, TranscriptionProviderError } from "./errors.js";

/**
 * Supported audio formats for transcription
 */
export const AudioFormats = {
    MP3: "mp3",
    MP4: "mp4",
    WAV: "wav",
    FLAC: "flac",
    OGG: "ogg",
    M4A: "m4a",
    WEBM: "webm"
} as const;

/**
 * Options for audio transcription
 */
export interface TranscriptionOptions {
    /** The model ID to use */
    readonly modelId?: string;
    /** The audio data to transcribe (base64 or Uint8Array) */
    readonly audioData: string | Uint8Array;
    /** Audio file format (if not automatically detected) */
    readonly audioFormat?: (typeof AudioFormats)[keyof typeof AudioFormats];
    /** Tracing span for observability */
    readonly span: Span;
    /** Optional parameters for transcription behavior */
    readonly parameters?: {
        /** Language hint (e.g., 'en-US', 'fr-FR') */
        language?: string;
        /** Enable speaker diarization (identifying different speakers) */
        diarization?: boolean;
        /** Include timestamps for each segment */
        timestamps?: boolean;
        /** Audio quality setting (e.g., 'standard', 'high') */
        quality?: string;
    };
}

/**
 * Result of the transcription process
 */
export interface TranscriptionResult {
    /** The transcribed text */
    readonly text: string;
    /** The model used */
    readonly model: string;
    /** The timestamp of the transcription */
    readonly timestamp: Date;
    /** The ID of the response */
    readonly id: string;
    /** Detailed transcription segments with timing (if available) */
    readonly segments?: Array<{
        /** Segment ID */
        readonly id: number;
        /** Start time in seconds */
        readonly start: number;
        /** End time in seconds */
        readonly end: number;
        /** Transcribed text for this segment */
        readonly text: string;
        /** Confidence score (0-1) */
        readonly confidence?: number;
        /** Speaker label if speaker diarization is enabled */
        readonly speaker?: string;
        /** Language detected for this segment */
        readonly language?: string;
    }>;
    /** Language detected in the audio */
    readonly detectedLanguage?: string;
    /** Duration of the audio in seconds */
    readonly duration?: number;
    /** Optional usage statistics */
    readonly usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

/**
 * TranscriptionService interface for handling AI audio transcription
 */
export interface TranscriptionServiceApi {
    readonly transcribe: (options: TranscriptionOptions) => Effect.Effect<TranscriptionResult, AiError>;
}

/**
 * TranscriptionService provides methods for transcribing audio using AI providers.
 */
export class TranscriptionService extends Effect.Service<TranscriptionServiceApi>()("TranscriptionService", {
    effect: Effect.gen(function* () {
        // Get services
        const providerService = yield* ProviderService;
        const modelService: ModelServiceApi = yield* ModelService;

        return {
            transcribe: (options: TranscriptionOptions) =>
                Effect.gen(function* () {
                    // Validate audio data
                    if (!options.audioData) {
                        return yield* Effect.fail(new TranscriptionAudioError("Audio data is required"));
                    }

                    // Get model ID or fail
                    const modelId = yield* Effect.fromNullable(options.modelId).pipe(
                        Effect.mapError(() => new TranscriptionModelError("Model ID must be provided"))
                    );

                    // Get provider name from model service
                    const providerName = yield* modelService.getProviderName(modelId).pipe(
                        Effect.mapError((error) => new TranscriptionProviderError("Failed to get provider name for model", { cause: error }))
                    );

                    // Get provider client
                    const providerClient = yield* providerService.getProviderClient(providerName).pipe(
                        Effect.mapError((error) => new TranscriptionProviderError("Failed to get provider client", { cause: error }))
                    );

                    yield* Effect.annotateCurrentSpan("ai.provider.name", providerName);
                    yield* Effect.annotateCurrentSpan("ai.model.name", modelId);

                    // Get model from the provider
                    const model = yield* Effect.tryPromise({
                        try: async () => {
                            // Use the provider to get the language model
                            const models = await Effect.runPromise(providerClient.getModels());
                            const matchingModel = models.find(m => m.modelId === modelId);
                            if (!matchingModel) {
                                throw new Error(`Model ${modelId} not found`);
                            }
                            return matchingModel;
                        },
                        catch: (error) => new TranscriptionModelError(`Failed to get model ${modelId}`, { cause: error })
                    });

                    // Transcribe the audio using the provider's transcribe method
                    const result = yield* Effect.tryPromise({
                        try: async () => {
                            const result = await Effect.runPromise(providerClient.transcribe(
                                options.audioData,
                                {
                                    model: modelId,
                                    ...options.parameters
                                }
                            ));
                            return result;
                        },
                        catch: (error) => new TranscriptionError("Transcription failed", { cause: error })
                    });

                    // Map the result to TranscriptionResult
                    return {
                        text: result.text,
                        model: result.model,
                        timestamp: result.timestamp,
                        id: result.id,
                        segments: result.segments,
                        detectedLanguage: result.detectedLanguage,
                        duration: result.duration,
                        usage: result.usage ? {
                            promptTokens: result.usage.promptTokens || 0,
                            completionTokens: result.usage.completionTokens || 0,
                            totalTokens: result.usage.totalTokens || 0
                        } : undefined
                    };
                }).pipe(
                    Effect.withSpan("TranscriptionService.transcribe")
                )
        };
    })
}) { }

/**
 * Default Layer for TranscriptionService
 */
export const TranscriptionServiceLive = Layer.effect(
    TranscriptionService,
    TranscriptionService
); 