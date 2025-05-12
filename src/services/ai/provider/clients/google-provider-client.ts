import { Effect } from "effect";
import { ProviderClient } from "../client.js"
import { ProviderConfigError, ProviderMissingCapabilityError, ProviderOperationError } from "../errors.js"
import type {
  EffectiveProviderApi,
  GenerateImageResult,
  GenerateTextResult,
  ProviderChatOptions,
  ProviderGenerateEmbeddingsOptions,
  ProviderGenerateImageOptions,
  ProviderGenerateObjectOptions,
  ProviderGenerateSpeechOptions,
  ProviderGenerateTextOptions,
  ProviderTranscribeOptions
} from "../types.js";
import type { EffectiveInput, EffectiveResponse } from "@/types.js";
import { ProviderToolError } from "../errors/tool.js";
import { makeProvider } from "./make-provider.js";

/**
 * Returns a ProviderClientApi instance pre-configured for Google.
 */
export const makeGoogleProviderClient = makeProvider("google", [
  "chat", "text-generation", "function-calling", "image-generation",
  "embeddings"
]);

export default makeGoogleProviderClient;
