import { ModelCapability } from "@/schema.js";
import { ModelServiceApi } from "@/services/ai/model/service.js";
import type { EffectiveInput } from "@/types.js";
import { LanguageModelV1 } from "ai";
import { Cause, Effect, Option } from "effect";
import { describe, expect, it } from "vitest";
import type { ProviderClientApi } from "../../api.js";
import { ProviderClient } from "../../client.js";
import { ProviderConfigError, ProviderMissingCapabilityError, ProviderOperationError } from "../../errors.js";
import type { EffectiveProviderApi, EffectiveResponse, GenerateEmbeddingsResult, GenerateObjectResult, GenerateSpeechResult, GenerateTextResult, ProviderGenerateEmbeddingsOptions, ProviderGenerateObjectOptions, ProviderGenerateSpeechOptions, ProviderGenerateTextOptions, ProviderTranscribeOptions, TranscribeResult } from "../../types.js";
import * as Anthropic from "../anthropic-provider-client.js";
import * as Deepseek from "../deepseek-provider-client.js";
import * as Google from "../google-provider-client.js";
import * as Groq from "../groq-provider-client.js";
import * as OpenAI from "../openai-provider-client.js";
import * as Perplexity from "../perplexity-provider-client.js";
import * as Xai from "../xai-provider-client.js";

const PROVIDER_CLIENTS: { name: string; make: () => Effect.Effect<ProviderClientApi> }[] = [
  { name: "openai", make: () => OpenAI.makeOpenAIProviderClient as Effect.Effect<ProviderClientApi> },
  { name: "anthropic", make: () => Anthropic.makeAnthropicProviderClient as Effect.Effect<ProviderClientApi> },
  { name: "google", make: () => Google.makeGoogleProviderClient as Effect.Effect<ProviderClientApi> },
  { name: "xai", make: () => Xai.makeXaiProviderClient as Effect.Effect<ProviderClientApi> },
  { name: "perplexity", make: () => Perplexity.makePerplexityProviderClient as Effect.Effect<ProviderClientApi> },
  { name: "groq", make: () => Groq.makeGroqProviderClient as Effect.Effect<ProviderClientApi> },
  { name: "deepseek", make: () => Deepseek.makeDeepseekProviderClient as Effect.Effect<ProviderClientApi> }
];

describe("ProviderClient Implementations", () => {
  for (const { name, make } of PROVIDER_CLIENTS) {
    describe(`${name} ProviderClient`, () => {
      const stubProviderClient: ProviderClientApi = {
        setVercelProvider: () => Effect.succeed(undefined),
        getProvider: () => Effect.succeed({
          name,
          provider: {} as any,
          capabilities: new Set(["text-generation"]),
        }),
        generateText: () => Effect.succeed({} as any),
        generateObject: <T>() => Effect.succeed({} as any),
        generateSpeech: () => Effect.succeed({} as any),
        transcribe: () => Effect.succeed({} as any),
        generateEmbeddings: () => Effect.succeed({} as any),
        getCapabilities: () => Effect.succeed(new Set(["text-generation"] as const)),
        getModels: () => Effect.succeed([]),
        chat: () => Effect.succeed({} as any),
        generateImage: () => Effect.succeed({} as any),
      };


      it("should setVercelProvider and getProvider correctly", async () => {
        // Provide the stub ProviderClient to the Effect context

        const fakeProvider: EffectiveProviderApi = {
          name,
          provider: {
            setVercelProvider: function (vercelProvider: EffectiveProviderApi): Effect.Effect<void, ProviderConfigError> {
              throw new Error("Function not implemented.");
            },
            getProvider: function (): Effect.Effect<EffectiveProviderApi, ProviderConfigError> {
              throw new Error("Function not implemented.");
            },
            generateText: function (input: EffectiveInput, options: ProviderGenerateTextOptions): Effect.Effect<EffectiveResponse<GenerateTextResult>, ProviderOperationError | ProviderConfigError | ProviderMissingCapabilityError> {
              throw new Error("Function not implemented.");
            },
            generateObject: function <T = unknown>(input: EffectiveInput, options: ProviderGenerateObjectOptions<T>): Effect.Effect<EffectiveResponse<GenerateObjectResult<T>>, ProviderOperationError | ProviderConfigError> {
              throw new Error("Function not implemented.");
            },
            generateSpeech: function (input: string, options: ProviderGenerateSpeechOptions): Effect.Effect<EffectiveResponse<GenerateSpeechResult>, ProviderOperationError | ProviderConfigError> {
              throw new Error("Function not implemented.");
            },
            transcribe: function (input: ArrayBuffer, options: ProviderTranscribeOptions): Effect.Effect<EffectiveResponse<TranscribeResult>, ProviderOperationError | ProviderConfigError> {
              throw new Error("Function not implemented.");
            },
            generateEmbeddings: function (input: string[], options: ProviderGenerateEmbeddingsOptions): Effect.Effect<EffectiveResponse<GenerateEmbeddingsResult>, ProviderOperationError | ProviderConfigError> {
              throw new Error("Function not implemented.");
            },
            getCapabilities: function (): Effect.Effect<Set<ModelCapability>, ProviderOperationError | ProviderConfigError> {
              throw new Error("Function not implemented.");
            },
            getModels: function (): Effect.Effect<LanguageModelV1[], ProviderConfigError, ModelServiceApi> {
              throw new Error("Function not implemented.");
            },
            chat: function (): Effect.Effect<any, any> {
              throw new Error("Function not implemented.");
            },
            generateImage: function (): Effect.Effect<any, any> {
              throw new Error("Function not implemented.");
            }
          },
          capabilities: new Set(["text-generation"])
        };
        const client: ProviderClientApi = await Effect.runPromise(
          Effect.provideService(make(), ProviderClient, stubProviderClient)
        );
        await Effect.runPromise(client.setVercelProvider(fakeProvider));
        const result: EffectiveProviderApi = await Effect.runPromise(client.getProvider());
        expect(result.name).toBe(name);
        expect(result.capabilities.size).toBe(1);
      });

      it("should delegate all methods to the base provider", async () => {
        // This test is mostly a type check, as the base provider is a stub.
        // Here we just check that methods exist and return Effects.
        const client: ProviderClientApi = await Effect.runPromise(
          Effect.provideService(make(), ProviderClient, stubProviderClient)
        );
        expect(typeof client.generateText).toBe("function");
        expect(typeof client.generateObject).toBe("function");
        expect(typeof client.generateSpeech).toBe("function");
        expect(typeof client.transcribe).toBe("function");
        expect(typeof client.generateEmbeddings).toBe("function");
        expect(typeof client.getCapabilities).toBe("function");
        expect(typeof client.getModels).toBe("function");
      });

      it("returns ProviderConfigError for invalid setVercelProvider input", async () => {
        const client: ProviderClientApi = await Effect.runPromise(
          Effect.provideService(make(), ProviderClient, stubProviderClient)
        );
        // @ts-expect-error: purposely invalid input
        const effect = client.setVercelProvider(undefined);
        const exit = await Effect.runPromiseExit(effect);

        expect(exit._tag).toBe("Failure");
        if (exit._tag === "Failure") {
          // Extract the error from the cause
          const error = Cause.failureOption(exit.cause);
          expect(Option.isSome(error)).toBe(true);

          if (Option.isSome(error)) {
            const errorValue = error.value;
            // Check if the error is an instance of ProviderConfigError
            expect(errorValue).toBeInstanceOf(ProviderConfigError);
            const msg = errorValue instanceof Error ? errorValue.message : String(errorValue);
            expect(msg).toMatch(/Invalid provider config/i);
          }
        }
      });
    });
  }
});
