import { Effect, Layer, Context } from "effect";
import { google } from "@ai-sdk/Google";
import { EmbeddingModelV1, ImageModelV1, LanguageModelV1, ProviderV1, TranscriptionModelV1 } from "@ai-sdk/provider";
import {ProviderClient, type ProviderClientApi } from "../client.js"
import { ProviderNotFoundError } from "../errors.js";

function callGoogleLanguageModel() {
    if (google.languageModel === undefined) {
        return new ProviderNotFoundError("Language model not found");
    }
    return google.languageModel;
}
function callGoogleTextEmbeddingModel() {
    if (google.textEmbeddingModel === undefined) {
        return new ProviderNotFoundError("Text embedding model not found");
    }
    return google.textEmbeddingModel;
}
function callGoogleTranscriptionModel() {
    if (google.transcriptionModel === undefined) {
        return new ProviderNotFoundError("Transcription model not found");
    }
    return google.transcriptionModel;
}
function callGoogleImageModel() {
    if (google.imageModel === undefined) {
        return new ProviderNotFoundError("Image model not found");
    }
    // Replace "image-model-id" with the actual ID of the image model you want to use
    return google.imageModel;
}  

export const GoogleProviderApi: ProviderClientApi = {
    languageModel: () => callGoogleLanguageModel(),
    textEmbeddingModel: () => callGoogleTextEmbeddingModel(),
    speechModel: () => new ProviderNotFoundError("Speech model not found"), // Google does not implement this
    transcriptionModel: () => callGoogleTranscriptionModel(),
    imageModel: () => callGoogleImageModel(),
};

const program = Effect.sync(() => GoogleProviderApi.languageModel())
