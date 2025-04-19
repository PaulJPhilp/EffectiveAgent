import {
    LanguageModelV1,
    ProviderV1
} from '@ai-sdk/provider';
import { Effect } from "effect";
import { ModelConfigError } from './errors.js';

export interface ModelClientApi {
    generateText: (model: LanguageModelV1, prompt: string) => ProviderV1["languageModel"] | ModelConfigError;
    //streamText: (model: LanguageModelV1, prompt: string) => ProviderV1["languageModel"] | ModelConfigError;
    //generateObject: (model: LanguageModelV1, prompt: string) => ProviderV1["textEmbeddingModel"] | ModelConfigError;
    //streamObject: (model: LanguageModelV1, prompt: string) => ProviderV1["textEmbeddingModel"] | ModelConfigError;
    //generateSpeech: (model: LanguageModelV1, prompt: string) => ProviderV1["speechModel"] | ModelConfigError;
    //generateImage: (model: LanguageModelV1, prompt: string) => ProviderV1["imageModel"] | ModelConfigError;
    //transcribe: (model: LanguageModelV1, prompt: string) => ProviderV1["transcriptionModel"] | ModelConfigError;
    //embedding: (model: LanguageModelV1, prompt: string) => ProviderV1["textEmbeddingModel"] | ModelConfigError;
    //chat: (model: LanguageModelV1, prompt: string) => ProviderV1["languageModel"] | ModelConfigError;
}

export class ModelClient extends Effect.Service<ModelClientApi>()(
    "ModelClient",
    {
        effect: Effect.gen(function* () {

            return {
                generateText: (model: LanguageModelV1, prompt: string) => Effect.gen(function* () {

                })

            }
        })
    }
) { }