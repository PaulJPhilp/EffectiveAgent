/**
 * @file Implements the TranscriptionService for handling AI audio transcription.
 * @module services/ai/producers/transcription/service
 */

import type { ModelServiceApi } from "@/services/ai/model/api.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { EffectiveResponse } from "@/types.js";
import { Layer } from "effect";
import * as Effect from "effect/Effect";
import { Span } from "effect/Tracer";
import type { TranscriptionServiceApi } from "./api.js";
import { TranscriptionAudioError, TranscriptionError, TranscriptionModelError, TranscriptionProviderError } from "./errors.js";
import type { TranscriptionResult } from "./types.js";

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
    /** Optional abort signal for cancellation */
    readonly signal?: AbortSignal;
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

/**
 * TranscriptionService interface for handling AI audio transcription
 */
// TranscriptionServiceApi is now imported from './api.js'


/**
 * TranscriptionService provides methods for transcribing audio using AI providers.
 */
export class TranscriptionService extends Effect.Service<TranscriptionServiceApi>()(
    "TranscriptionService",
    {
        effect: Effect.gen(function* () {
            // Get services
            const providerService = yield* ProviderService;
            const modelService: ModelServiceApi = yield* ModelService;

            return {
                transcribe: (options: TranscriptionOptions) =>
                    Effect.gen(function* () {
                        // Validate audio data
                        if (!options.audioData) {
                            return yield* Effect.fail(new TranscriptionAudioError({
                                description: "Audio data is required",
                                module: "TranscriptionService",
                                method: "transcribe"
                            }));
                        }

                        // Get model ID or fail
                        const modelId = yield* Effect.fromNullable(options.modelId).pipe(
                            Effect.mapError(() => new TranscriptionModelError({
                                description: "Model ID must be provided",
                                module: "TranscriptionService",
                                method: "transcribe"
                            }))
                        );

                        // Get provider name from model service
                        const providerName = yield* modelService.getProviderName(modelId).pipe(
                            Effect.mapError((error) => new TranscriptionProviderError({
                                description: "Failed to get provider name for model",
                                module: "TranscriptionService",
                                method: "transcribe",
                                cause: error
                            }))
                        );
                        // Get provider client
                        const providerClient = yield* providerService.getProviderClient(providerName).pipe(
                            Effect.mapError((error) => new TranscriptionProviderError({
                                description: "Failed to get provider client",
                                module: "TranscriptionService",
                                method: "transcribe",
                                cause: error
                            }))
                        );

                        yield* Effect.annotateCurrentSpan("ai.provider.name", providerName);
                        yield* Effect.annotateCurrentSpan("ai.model.name", modelId);

                        // Get model from the provider
                        const models = yield* providerClient.getModels().pipe(
                            Effect.provide(ModelService.Default)
                        );
                        const matchingModel = models.find((m) => m.modelId === modelId);
                        if (!matchingModel) {
                            return yield* Effect.fail(new TranscriptionModelError({
                                description: `Model ${modelId} not found`,
                                module: "TranscriptionService",
                                method: "transcribe"
                            }));
                        }
                        const model = matchingModel;

                        // Transcribe the audio using the provider's transcribe method
                        let inputBuffer: ArrayBuffer;
                        if (typeof options.audioData === "string") {
                            inputBuffer = Buffer.from(options.audioData, "base64").buffer;
                        } else if (options.audioData instanceof Uint8Array) {
                            // Ensure we get a true ArrayBuffer, not SharedArrayBuffer
                            if (options.audioData.buffer instanceof ArrayBuffer) {
                                inputBuffer = options.audioData.buffer.slice(
                                    options.audioData.byteOffset,
                                    options.audioData.byteOffset + options.audioData.byteLength
                                );
                            } else {
                                inputBuffer = new Uint8Array(options.audioData).buffer;
                            }
                        } else {
                            inputBuffer = options.audioData as ArrayBuffer;
                        }

                        const response: EffectiveResponse<TranscriptionResult> = yield* Effect.tryPromise({
                            try: async () => {
                                return await Effect.runPromise(providerClient.transcribe(
                                    inputBuffer,
                                    {
                                        modelId: modelId,
                                        ...options.parameters
                                    }
                                ));
                            },
                            catch: (error) => new TranscriptionError({
                                description: "Transcription failed",
                                module: "TranscriptionService",
                                method: "transcribe",
                                cause: error
                            })
                        });

                        // Return the result directly
                        return {
                            data: response.data,
                            metadata: response.metadata
                        };
                    }).pipe(
                        Effect.withSpan("TranscriptionService.transcribe")
                    )
            };
        }),
        dependencies: [ModelService.Default, ProviderService.Default]
    }
) { }