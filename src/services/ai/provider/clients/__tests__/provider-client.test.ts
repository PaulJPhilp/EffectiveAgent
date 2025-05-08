import { ModelCapability } from "@/schema.js";
import type { ModelServiceApi } from "@/services/ai/model/api.js"; 
import { ModelService } from "@/services/ai/model/service.js"; 
import type { EffectiveInput as GlobalEffectiveInput } from "@/types.js"; 
import { LanguageModelV1 } from "ai";
import { Cause, Effect, Layer, Option } from "effect"; 
import { describe, expect, it } from "vitest";
import type { ProviderClientApi } from "../../api.js"; 
import { ProviderClient } from "../../client.js";
import { ProviderConfigError, ProviderMissingCapabilityError, ProviderOperationError, ProviderToolError } from "../../errors.js";
import type { EffectiveProviderApi, EffectiveResponse, GenerateEmbeddingsResult, GenerateObjectResult, GenerateSpeechResult, GenerateTextResult, ProviderChatOptions, ProviderGenerateEmbeddingsOptions, ProviderGenerateObjectOptions, ProviderGenerateSpeechOptions, ProviderGenerateTextOptions, ProviderTranscribeOptions, TranscribeResult } from "../../types.js";
import { ToolCallRequest, ToolDefinition } from "../../types.js"; 
import { ToolServiceApi } from "../../../tools/api.js"; 
import { vi } from 'vitest'; 

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
        setVercelProvider: vi.fn().mockReturnValue(Effect.succeed(undefined)),
        getProvider: vi.fn().mockReturnValue(Effect.succeed({
          name,
          provider: {} as any, 
          capabilities: new Set(["text-generation", "chat", "tool-use"] as const), 
        })),
        validateToolInput: vi.fn().mockReturnValue(Effect.succeed({} as any)),
        executeTool: vi.fn().mockReturnValue(Effect.succeed({} as any)),
        processToolResult: vi.fn().mockReturnValue(Effect.succeed({} as any)),
        chat: vi.fn().mockReturnValue(Effect.succeed({} as any)), 
        generateText: vi.fn().mockReturnValue(Effect.succeed({} as any)),
        generateObject: vi.fn().mockReturnValue(Effect.succeed({} as any)),
        generateSpeech: vi.fn().mockReturnValue(Effect.succeed({} as any)),
        transcribe: vi.fn().mockReturnValue(Effect.succeed({} as any)),
        generateEmbeddings: vi.fn().mockReturnValue(Effect.succeed({} as any)),
        getCapabilities: vi.fn().mockReturnValue(Effect.succeed(new Set(["text-generation", "chat", "tool-use"] as const))),
        getModels: vi.fn().mockReturnValue(Effect.succeed([])),
        getDefaultModelIdForProvider: vi.fn().mockReturnValue(Effect.succeed("mock-default-model-id")),
        generateImage: vi.fn().mockReturnValue(Effect.succeed({} as any)),
      };


      it("should setVercelProvider and getProvider correctly", async () => {
        const fakeProvider: EffectiveProviderApi = {
          name,
          provider: {
            ...stubProviderClient, // Use existing stubs for other methods
          } as unknown as ProviderClientApi,
          capabilities: new Set(["text-generation", "chat", "tool-use"] as const),
        };

        // Get the ProviderClient instance
        const client = await Effect.runPromise(
          Effect.gen(function*() { 
            return yield* ProviderClient; 
          }).pipe(Effect.provide(ProviderClient.Default))
        );

        // Set the provider
        await Effect.runPromise(client.setVercelProvider(fakeProvider));
        // Get the provider
        const result: EffectiveProviderApi = await Effect.runPromise(client.getProvider());

        expect(result.name).toBe(name);
        const capabilities = await Effect.runPromise(client.getCapabilities());
        expect(capabilities.has("text-generation")).toBe(true);
        expect(capabilities.has("chat")).toBe(true);
        expect(capabilities.has("tool-use")).toBe(true);
        expect(capabilities.size).toBe(3);
      });

      it("should handle tool calls in chat method", async () => {
        const mockToolDefs: ToolDefinition[] = [
          { name: "get_weather", description: "Get current weather", parameters: { type: "object", properties: { location: { type: "string" } } } }
        ];
        
        const stubModelService: ModelServiceApi = {
          exists: vi.fn().mockReturnValue(Effect.succeed(true)),
          getDefaultModelId: vi.fn().mockReturnValue(Effect.succeed("mock-default-model-id")),
          load: vi.fn(() => Effect.die(new Error("Mocked ModelService.load called unexpectedly"))),
          getProviderName: vi.fn(() => Effect.die(new Error("Mocked ModelService.getProviderName called unexpectedly"))),
          findModelsByCapability: vi.fn(() => Effect.die(new Error("Mocked ModelService.findModelsByCapability called unexpectedly"))),
          findModelsByCapabilities: vi.fn(() => Effect.die(new Error("Mocked ModelService.findModelsByCapabilities called unexpectedly"))),
          getModelsForProvider: vi.fn(() => Effect.die(new Error("Mocked ModelService.getModelsForProvider called unexpectedly"))),
          validateModel: vi.fn().mockReturnValue(Effect.succeed(true))
        };

        const mockToolService: ToolServiceApi = {
          run: vi.fn().mockReturnValue(Effect.succeed("mock tool output")) 
        };

        const mockToolCallRequest: ToolCallRequest = {
          id: "tool_call_123",
          type: "tool_call",
          function: {
            name: "get_weather",
            arguments: JSON.stringify({ location: "London" })
          }
        };

        const mockGenerateTextResultContent: GenerateTextResult = {
          id: "gen_text_res_id_123",
          model: "test-model-for-gen-text",
          timestamp: new Date(),
          finishReason: "tool-calls",
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          text: "", 
          toolCalls: [mockToolCallRequest]
        };

        const mockProviderResponse: EffectiveResponse<GenerateTextResult> = {
          data: mockGenerateTextResultContent,
          metadata: {
            id: "eff_resp_id_abc",
            model: "test-model-for-eff-resp", 
            timestamp: new Date(), 
            finishReason: "tool-calls", 
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } 
          }
        };

        const mockUnderlyingProviderChat = vi.fn().mockReturnValue(Effect.succeed(mockProviderResponse));

        const localFakeProvider: EffectiveProviderApi = {
          name,
          provider: {
            ...stubProviderClient, 
            chat: mockUnderlyingProviderChat 
          } as unknown as ProviderClientApi, 
          capabilities: new Set(["chat", "text-generation", "tool-use"] as const), 
        };

        const client = await Effect.runPromise(
          Effect.gen(function*() { 
            return yield* ProviderClient; 
          }).pipe(Effect.provide(ProviderClient.Default))
        );
        
        await Effect.runPromise(client.setVercelProvider(localFakeProvider));

        const chatInput: GlobalEffectiveInput = { text: "What's the weather in London?" };
        const chatOptions: ProviderChatOptions = {
          modelId: "test-model", 
          toolService: mockToolService,
          tools: mockToolDefs
        };

        const result = await Effect.runPromise(
          client.chat(chatInput, chatOptions).pipe(
            Effect.provide(Layer.succeed(ModelService, stubModelService))
          )
        );

        expect(mockUnderlyingProviderChat).toHaveBeenCalled();
        expect(result.data.toolCalls).toEqual([mockToolCallRequest]);
        expect(result.metadata.finishReason).toBe("tool-calls");
        expect(result.data.text).toBe("");
      });

      it("should delegate all methods to the base provider", async () => {
        const client: ProviderClientApi = await Effect.runPromise(
          Effect.gen(function*() { 
            return yield* ProviderClient; 
          }).pipe(Effect.provide(ProviderClient.Default))
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
        const client = await Effect.runPromise(
          Effect.gen(function*() { 
            return yield* ProviderClient; 
          }).pipe(Effect.provide(ProviderClient.Default))
        );
        // @ts-expect-error: purposely invalid input
        const effect = client.setVercelProvider(undefined);
        const exit = await Effect.runPromiseExit(effect);

        expect(exit._tag).toBe("Failure");
        if (exit._tag === "Failure") {
          const error = Cause.failureOption(exit.cause);
          expect(Option.isSome(error)).toBe(true);

          if (Option.isSome(error)) {
            const errorValue = error.value;
            expect(errorValue).toBeInstanceOf(ProviderConfigError);
            const msg = errorValue instanceof Error ? errorValue.message : String(errorValue);
            expect(msg).toMatch(/Invalid provider config/i);
          }
        }
      });
    });
  }
});
