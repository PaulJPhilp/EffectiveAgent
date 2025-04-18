import {
    EmbeddingModelV1,
    ImageModelV1,
    LanguageModelV1,
    ProviderV1,
    SpeechModelV1,
    TranscriptionModelV1,
} from '@ai-sdk/provider';
import { Context, Effect, Layer, Ref } from 'effect';
import { ProviderNotFoundError } from './errors.js';

export interface ProviderClientApi {
    languageModel: () => ProviderV1["languageModel"] | ProviderNotFoundError;
    textEmbeddingModel: () => ProviderV1["textEmbeddingModel"] | ProviderNotFoundError;
    speechModel: () => ProviderV1["speechModel"] | ProviderNotFoundError;
    transcriptionModel: () => ProviderV1["transcriptionModel"] | ProviderNotFoundError;
    imageModel: () => ProviderV1["imageModel"] | ProviderNotFoundError;
}

// Explicitly type as Tag<ProviderClientApi>
export const ProviderClient = Effect.Service<ProviderClientApi>();