import { Effect, Layer, Context } from "effect";
import { anthropic } from "@ai-sdk/anthropic";
import {type ProviderClientApi } from "../client.js"
import { ProviderNotFoundError } from "../errors.js";

export const ProviderClientApiTag = Context.Tag("ProviderClientApi");

function callAnthropicLanguageModel() {
    if (anthropic.languageModel === undefined) {
        return new ProviderNotFoundError("Language model not found");
    }
    return anthropic.languageModel;
}
function callAnthropicTextEmbeddingModel() {
    if (anthropic.textEmbeddingModel === undefined) {
        return new ProviderNotFoundError("Text embedding model not found");
    }
    return anthropic.textEmbeddingModel;
}
function callAnthropicTranscriptionModel() {
    if (anthropic.transcriptionModel === undefined) {
        return new ProviderNotFoundError("Transcription model not found");
    }
    return anthropic.transcriptionModel;
}
function callAnthropicImageModel() {
    if (anthropic.imageModel === undefined) {
        return new ProviderNotFoundError("Image model not found");
    }
    // Replace "image-model-id" with the actual ID of the image model you want to use
    return anthropic.imageModel;
}  

export const OpenAIProviderApi: ProviderClientApi = {
    languageModel: () => callAnthropicLanguageModel(),
    textEmbeddingModel: () => callAnthropicTextEmbeddingModel(),
    speechModel: () => new ProviderNotFoundError("Speech model not found"), // OpenAI does not implement this
    transcriptionModel: () => callAnthropicTranscriptionModel(),
    imageModel: () => callAnthropicImageModel(),
};

const program = Effect.sync(() => OpenAIProviderApi.languageModel())
