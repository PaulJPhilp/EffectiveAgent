import { Effect, Layer } from "effect";
import { ProviderClient } from "../client.js";
import { ProviderConfigError, ProviderMissingCapabilityError, ProviderOperationError } from "../errors.js";
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
 * Returns a ProviderClientApi instance pre-configured for Anthropic.
 */
export const makeAnthropicProviderClient = makeProvider("anthropic", [
  "chat", "text-generation", "function-calling"
]);

export default makeAnthropicProviderClient;

export const AnthropicProviderClientLayer = Layer.effect(
  ProviderClient,
  Effect.map(makeAnthropicProviderClient, (client) => ({
    ...client,
    getDefaultModelIdForProvider: () => Effect.succeed("claude-3-opus-20240229")
  }))
);
