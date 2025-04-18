import {
    LanguageModelV1,
    ProviderV1
} from '@ai-sdk/provider';
import { Effect } from 'effect';
import { ModelConfigError } from './errors.js';

export interface ModelClientApi {
    generateText: (model: LanguageModelV1, prompt: string) => ProviderV1["languageModel"] | ModelConfigError;
    streamText: (model: LanguageModelV1, prompt: string) => ProviderV1["languageModel"] | ModelConfigError;
    generateObject: (model: LanguageModelV1, prompt: string) => ProviderV1["textEmbeddingModel"] | ModelConfigError;
    generateSpeech: (model: LanguageModelV1, prompt: string) => ProviderV1["speechModel"] | ModelConfigError;
    transcribe: (model: LanguageModelV1, prompt: string) => ProviderV1["transcriptionModel"] | ModelConfigError;
    image: (model: LanguageModelV1, prompt: string) => ProviderV1["imageModel"] | ModelConfigError;
    embedding: (model: LanguageModelV1, prompt: string) => ProviderV1["textEmbeddingModel"] | ModelConfigError;
    completion: (model: LanguageModelV1, prompt: string) => ProviderV1["languageModel"] | ModelConfigError;
    chat: (model: LanguageModelV1, prompt: string) => ProviderV1["languageModel"] | ModelConfigError;
}

// Explicitly type as Tag<ProviderClientApi>
export const ModelClient = Effect.Service<ModelClientApi>();