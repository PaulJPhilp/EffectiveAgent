/**
 * @file Transcription Service implementation for AI audio transcription
 * @module services/pipeline/producers/transcription/service
 */
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { TranscribeResult } from "@/services/ai/provider/types.js";
import { Effect, Option, Ref } from "effect";
import type { TranscriptionGenerationOptions, TranscriptionServiceApi } from "./api.js";
import { TranscriptionInputError, TranscriptionModelError } from "./errors.js";

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
 * Transcription agent state
 */
export interface TranscriptionAgentState {
    readonly transcriptionCount: number
    readonly lastTranscription: Option.Option<TranscriptionResult>
    readonly lastUpdate: Option.Option<number>
    readonly transcriptionHistory: ReadonlyArray<{
        readonly timestamp: number
        readonly modelId: string
        readonly audioSize: number
        readonly transcriptionLength: number
        readonly duration?: number
        readonly language?: string
        readonly success: boolean
    }>
}



/**
 * TranscriptionService provides methods for transcribing audio using AI providers.
 * Simplified implementation without AgentRuntime dependency.
 */
class TranscriptionService extends Effect.Service<TranscriptionServiceApi>()(
    "TranscriptionService",
    {
        effect: Effect.gen(function* () {
            // Get services directly
            const modelService = yield* ModelService;
            const providerService = yield* ProviderService;

            const initialState: TranscriptionAgentState = {
                transcriptionCount: 0,
                lastTranscription: Option.none(),
                lastUpdate: Option.none(),
                transcriptionHistory: []
            };

            // Create internal state management
            const internalStateRef = yield* Ref.make<TranscriptionAgentState>(initialState);

            yield* Effect.log("TranscriptionService initialized");

            // Helper function to update internal state
            const updateState = (transcription: {
                readonly timestamp: number
                readonly modelId: string
                readonly audioLength: number
                readonly transcriptionLength: number
                readonly success: boolean
                readonly audioFormat: string
                readonly language?: string
            }) => Effect.gen(function* () {
                const currentState = yield* Ref.get(internalStateRef);

                const updatedHistory = [
                    ...currentState.transcriptionHistory,
                    transcription
                ].slice(-20); // Keep last 20 transcriptions

                const newState: TranscriptionAgentState = {
                    transcriptionCount: currentState.transcriptionCount + 1,
                    lastTranscription: currentState.lastTranscription,
                    lastUpdate: Option.some(Date.now()),
                    transcriptionHistory: updatedHistory
                };

                yield* Ref.set(internalStateRef, newState);

                yield* Effect.log("Updated transcription state", {
                    oldCount: currentState.transcriptionCount,
                    newCount: newState.transcriptionCount
                });
            });

            const service: TranscriptionServiceApi = {
                /**
                 * Transcribes audio data using the specified model
                 */
                transcribe: (options: TranscriptionGenerationOptions) => {
                    return Effect.gen(function* () {
                        // Log start of transcription
                        yield* Effect.log("Starting audio transcription", {
                            modelId: options.modelId,
                            audioLength: options.audioData.length,
                            audioFormat: options.audioFormat
                        });



                        // Validate input
                        if (!options.audioData || options.audioData.length === 0) {
                            yield* Effect.logError("No audio data provided");
                            return yield* Effect.fail(new TranscriptionInputError({
                                description: "Audio data is required for transcription",
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

                        // Get provider for the model
                        const providerName = yield* modelService.getProviderName(modelId);
                        const providerClient = yield* providerService.getProviderClient(providerName);

                        // Convert Uint8Array to Buffer for provider compatibility
                        const audioBuffer = Buffer.from(options.audioData);

                        // Call the real AI provider
                        const providerResult = yield* providerClient.transcribe(audioBuffer, {
                            modelId,
                            language: options.language,
                            prompt: options.prompt,
                            responseFormat: options.responseFormat,
                            temperature: options.temperature,
                            timestamp_granularities: options.timestamp_granularities
                        });

                        const result: TranscribeResult = {
                            text: providerResult.text,
                            language: providerResult.language,
                            duration: providerResult.duration,
                            segments: providerResult.segments,
                            words: providerResult.words,
                            usage: providerResult.usage,
                            model: modelId,
                            provider: providerName
                        };

                        yield* Effect.log("Audio transcription completed successfully");

                        // Update agent state with transcription results
                        yield* updateState({
                            timestamp: Date.now(),
                            modelId,
                            audioLength: options.audioData.length,
                            transcriptionLength: result.text.length,
                            success: true,
                            audioFormat: options.audioFormat,
                            language: result.language
                        });

                        return result;

                    }).pipe(
                        Effect.withSpan("TranscriptionService.transcribe"),
                        Effect.catchAll((error) => {
                            return Effect.gen(function* () {
                                yield* Effect.logError("Audio transcription failed", { error });

                                // Update state with failure
                                yield* updateState({
                                    timestamp: Date.now(),
                                    modelId: options.modelId || "unknown",
                                    audioLength: options.audioData?.length || 0,
                                    transcriptionLength: 0,
                                    success: false,
                                    audioFormat: options.audioFormat || "unknown"
                                });

                                return yield* Effect.fail(error);
                            });
                        })
                    );
                },

                /**
                 * Get the current agent state for monitoring/debugging
                 */
                getAgentState: () => Ref.get(internalStateRef),

                /**
                 * Get the runtime for direct access in tests
                 */
                getRuntime: () => Effect.succeed({
                    state: internalStateRef
                }),

                /**
                 * Terminate the service (no-op since we don't have external runtime)
                 */
                terminate: () => Effect.succeed(void 0)
            };

            return service;
        }),
        dependencies: [ModelService.Default, ProviderService.Default]
    }
) { }

export default TranscriptionService;
export { TranscriptionService };
