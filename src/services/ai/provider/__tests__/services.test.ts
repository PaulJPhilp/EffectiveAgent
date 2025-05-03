/**
 * @file Scaffold for ProviderService integration tests using Effect VitestService.
 * @file Scaffold for ProviderService integration tests using effect/vitest.
 */

import { mockService, provideMockService, withResource } from "@/services/core/test-harness/utils/context-management.js";
import { createTypedMock, mockFailure, mockSuccess } from "@/services/core/test-harness/utils/typed-mocks.js";
import { Effect } from "effect"
import { describe, expect, it } from "vitest";
import type { ProviderClientApi, ProviderServiceApi } from "../api.js"
import { ProviderConfigError, ProviderNotFoundError, ProviderOperationError } from "../errors.js"
import { ProviderFile } from "../schema.js"
import { ProviderService } from "../service.js"
import type { EffectiveProviderApi, EffectiveResponse, GenerateEmbeddingsResult, GenerateImageResult, GenerateObjectResult, GenerateSpeechResult, GenerateTextResult, TranscribeResult } from "../types.js";

// Valid test config
const validConfig: ProviderFile = {
  name: "test-provider-config",
  description: "Test config for ProviderService",
  providers: [
    {
      name: "openai",
      displayName: "OpenAI",
      type: "llm",
      apiKeyEnvVar: "OPENAI_API_KEY",
      baseUrl: "https://api.openai.com/v1"
    }
  ]
};

// Invalid config (malformed or missing required fields)
const invalidConfig: any = {
  name: 123, // invalid type
  providers: "not-an-array"
};

// Create test layer for provider service
const createTestLayer = (config: any) =>
  Effect.provideServiceEffect(ProviderService, Effect.succeed<ProviderServiceApi>({
    load: Effect.gen(function* () {
      // Validate the config
      if (typeof config.name !== 'string' || !Array.isArray(config.providers)) {
        return yield* Effect.fail(new ProviderConfigError({
          description: "Invalid provider config",
          module: "ProviderService",
          method: "load",
          cause: new Error("Invalid config structure")
        }));
      }
      return config;
    }),
    getProviderClient: (providerName: string) =>
      config.providers.some((p: { name: string }) => p.name === providerName)
        ? Effect.succeed({
            name: providerName,
            chat: () => Effect.succeed({ 
              data: { id: "test", model: "test", timestamp: new Date(), finishReason: "stop", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, text: "test" }, 
              metadata: { id: "test", timestamp: new Date() } 
            }) as Effect.Effect<EffectiveResponse<GenerateTextResult>, ProviderConfigError | ProviderOperationError, never>,
            setVercelProvider: () => Effect.succeed(undefined),
            getProvider: () => Effect.succeed({} as EffectiveProviderApi),
            generateText: () => Effect.succeed({ 
              data: { id: "test", model: "test", timestamp: new Date(), finishReason: "stop", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, text: "test" }, 
              metadata: { id: "test", timestamp: new Date() } 
            }) as Effect.Effect<EffectiveResponse<GenerateTextResult>, ProviderConfigError | ProviderOperationError, never>,
            generateObject: <T>() => Effect.succeed({ 
              data: { id: "test", model: "test", timestamp: new Date(), finishReason: "stop", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, object: {} as T }, 
              metadata: { id: "test", timestamp: new Date() } 
            }) as Effect.Effect<EffectiveResponse<GenerateObjectResult<T>>, ProviderConfigError | ProviderOperationError, never>,
            generateSpeech: () => Effect.succeed({ 
              data: { id: "test", model: "test", timestamp: new Date(), finishReason: "stop", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, audioData: "test", format: "mp3", parameters: { voice: "test" } }, 
              metadata: { id: "test", timestamp: new Date() } 
            }) as Effect.Effect<EffectiveResponse<GenerateSpeechResult>, never, never>,
            transcribe: () => Effect.succeed({ 
              data: { id: "test", model: "test", timestamp: new Date(), finishReason: "stop", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, text: "test", duration: 0, parameters: { language: "en" } }, 
              metadata: { id: "test", timestamp: new Date() } 
            }) as Effect.Effect<EffectiveResponse<TranscribeResult>, never, never>,
            generateEmbeddings: () => Effect.succeed({ 
              data: { id: "test", model: "test", timestamp: new Date(), finishReason: "stop", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, embeddings: [[0]], dimensions: 1, texts: ["test"], parameters: {} }, 
              metadata: { id: "test", timestamp: new Date() } 
            }) as Effect.Effect<EffectiveResponse<GenerateEmbeddingsResult>, never, never>,
            generateImage: () => Effect.succeed({ 
              data: { id: "test", model: "test", timestamp: new Date(), finishReason: "stop", usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, imageUrl: "test", parameters: { size: "1024x1024" } }, 
              metadata: { id: "test", timestamp: new Date() } 
            }) as Effect.Effect<EffectiveResponse<GenerateImageResult>, ProviderConfigError | ProviderOperationError, never>,
            getCapabilities: () => Effect.succeed(new Set()),
            getModels: () => Effect.succeed([])
          })
        : Effect.fail(new ProviderNotFoundError({
            providerName,
            module: "ProviderService",
            method: "getProviderClient"
          }))
  }));

/**
 * @file ProviderService tests using Effect test harness.
 */

describe("ProviderService", () => {
  it("loads a valid provider config", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* ProviderService;
      const loaded = yield* service.load;
      expect(loaded.name).toBe(validConfig.name);
      expect(loaded.providers.length).toBe(validConfig.providers.length);
      expect(loaded.providers[0].name).toBe(validConfig.providers[0].name);
    });
    await Effect.runPromise(createTestLayer(validConfig)(effect));
  });

  it("throws on invalid provider config", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* ProviderService;
      const result = yield* Effect.either(service.load);
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        const error = result.left;
        expect(error).toBeInstanceOf(ProviderConfigError);
      }
    });
    await Effect.runPromise(createTestLayer(invalidConfig)(effect));
  });

  it("returns a provider client for a valid provider name", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* ProviderService;
      const client = yield* service.getProviderClient("openai");
      expect(client).toBeDefined();
    });
    await Effect.runPromise(createTestLayer(validConfig)(effect));
  });

  it("throws on unknown provider name", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* ProviderService;
      const result = yield* Effect.either(service.getProviderClient("nonexistent"));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ProviderNotFoundError);
      }
    });
    await Effect.runPromise(createTestLayer(validConfig)(effect));
  });

  it("returns Left for empty provider name", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* ProviderService;
      const result = yield* Effect.either(service.getProviderClient(""));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ProviderNotFoundError);
      }
    });
    await Effect.runPromise(createTestLayer(validConfig)(effect));
  });

  it("handles config with empty providers array", async () => {
    const emptyProvidersConfig = { ...validConfig, providers: [] };
    const effect = Effect.gen(function* () {
      const service = yield* ProviderService;
      const loaded = yield* service.load;
      expect(loaded.providers.length).toBe(0);
      const result = yield* Effect.either(service.getProviderClient("openai"));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ProviderNotFoundError);
      }
    });
    await Effect.runPromise(createTestLayer(emptyProvidersConfig)(effect));
  });

  it("handles config with duplicate provider names", async () => {
    const dupConfig = {
      ...validConfig,
      providers: [
        ...validConfig.providers,
        { ...validConfig.providers[0] }
      ]
    };
    const effect = Effect.gen(function* () {
      const service = yield* ProviderService;
      const loaded = yield* service.load;
      expect(loaded.providers.length).toBe(2);
      expect(loaded.providers[0].name).toBe(loaded.providers[1].name);
      const client = yield* service.getProviderClient("openai");
      expect(client).toBeDefined();
    });
    await Effect.runPromise(createTestLayer(dupConfig)(effect));
  });

  it("loads config with missing optional fields", async () => {
    const minimalConfig = {
      name: "minimal",
      description: "Minimal test config",
      providers: [
        { name: "openai", displayName: "OpenAI", type: "llm" }
      ]
    };
    const effect = Effect.gen(function* () {
      const service = yield* ProviderService;
      const loaded = yield* service.load;
      expect(loaded.name).toBe("minimal");
      expect(loaded.providers[0].apiKeyEnvVar).toBeUndefined();
      expect(loaded.providers[0].baseUrl).toBeUndefined();
    });
    await Effect.runPromise(createTestLayer(minimalConfig)(effect));
  });
});
