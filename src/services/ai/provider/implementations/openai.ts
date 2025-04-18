import { Effect, Layer, Context } from "effect";
import { openai } from "@ai-sdk/openai";
import { EmbeddingModelV1, ImageModelV1, LanguageModelV1, ProviderV1, TranscriptionModelV1 } from "@ai-sdk/provider";
import {ProviderClient, type ProviderClientApi } from "../client.js"
import { ProviderNotFoundError } from "../errors.js";

export const ProviderClientApiTag = Context.Tag("ProviderClientApi");
import { open } from "fs";
import { m } from "vitest/dist/reporters-w_64AS5f.js";

function callOpenAILanguageModel() {
    if (openai.languageModel === undefined) {
        return new ProviderNotFoundError("Language model not found");
    }
    return openai.languageModel;
}
function callOpenAITextEmbeddingModel() {
    if (openai.textEmbeddingModel === undefined) {
        return new ProviderNotFoundError("Text embedding model not found");
    }
    return openai.textEmbeddingModel;
}
function callOpenAITranscriptionModel() {
    if (openai.transcriptionModel === undefined) {
        return new ProviderNotFoundError("Transcription model not found");
    }
    return openai.transcriptionModel;
}
function callOpenAIImageModel() {
    if (openai.imageModel === undefined) {
        return new ProviderNotFoundError("Image model not found");
    }
    // Replace "image-model-id" with the actual ID of the image model you want to use
    return openai.imageModel;
}  

export const OpenAIProviderApi: ProviderClientApi = {
    languageModel: () => callOpenAILanguageModel(),
    textEmbeddingModel: () => callOpenAITextEmbeddingModel(),
    speechModel: () => new ProviderNotFoundError("Speech model not found"), // OpenAI does not implement this
    transcriptionModel: () => callOpenAITranscriptionModel(),
    imageModel: () => callOpenAIImageModel(),
};

const program = Effect.sync(() => OpenAIProviderApi.languageModel())
