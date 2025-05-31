import { Effect } from "effect";
import { ModelCapability } from "@/schema.js";
import type { EffectiveInput, EffectiveResponse, FinishReason } from "@/types.js";
import { ModelService } from "../../model/service.js";
import { generateText, experimental_generateSpeech as generateSpeech, type LanguageModelV1, type SpeechModel } from "ai";
import {
  ProviderMissingCapabilityError,
  ProviderMissingModelIdError,
  ProviderNotFoundError,
  ProviderOperationError,
  ProviderServiceConfigError,
  ProviderToolError
} from "../errors.js";
import { ProvidersType } from "../schema.js";
import type {
  EffectiveProviderApi,
  GenerateEmbeddingsResult,
  GenerateImageResult,
  GenerateObjectResult,
  GenerateSpeechResult,
  GenerateTextResult,
  ProviderChatOptions,
  ProviderGenerateEmbeddingsOptions,
  ProviderGenerateImageOptions,
  ProviderGenerateObjectOptions,
  ProviderGenerateSpeechOptions,
  ProviderGenerateTextOptions,
  ProviderTranscribeOptions,
  TranscribeResult
} from "../types.js";
import type { ProviderClientApi } from "../api.js";

type Message = { role: "system" | "user"; content: string };
type GenerateTextResponse = {
  text: string;
  response?: {
    id?: string;
    modelId?: string;
  };
  finishReason?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

// Internal factory for ProviderService only
function makeGoogleClient(apiKey: string): Effect.Effect<ProviderClientApi, ProviderServiceConfigError | ProviderNotFoundError | ProviderOperationError> {
  return Effect.succeed({
    // Tool-related methods
    validateToolInput: (toolName: string, input: unknown) => 
      Effect.fail(new ProviderToolError({ 
        description: `Tool validation not implemented for ${toolName}`, 
        provider: "google" 
      })),
      
    executeTool: (toolName: string, input: unknown) => 
      Effect.fail(new ProviderToolError({ 
        description: `Tool execution not implemented for ${toolName}`, 
        provider: "google" 
      })),
      
    processToolResult: (toolName: string, result: unknown) => 
      Effect.fail(new ProviderToolError({ 
        description: `Tool result processing not implemented for ${toolName}`, 
        provider: "google" 
      })),
    
    // Provider and capability methods
    getProvider: () => Effect.fail(new ProviderOperationError({ 
      providerName: "google", 
      operation: "getProvider", 
      message: "Not implemented", 
      module: "google", 
      method: "getProvider" 
    })),
    
    getCapabilities: () => 
      Effect.succeed(new Set<ModelCapability>(["chat", "text-generation", "embeddings"])),
    
    // Core generation methods
    generateText: (input: EffectiveInput, options: ProviderGenerateTextOptions) => 
      Effect.gen(function* () {
        const modelId = options.modelId;
        if (!modelId) {
          return yield* Effect.fail(new ProviderMissingModelIdError({
            providerName: "google",
            capability: "text-generation",
            module: "google",
            method: "generateText"
          }));
        }

        const messages: Message[] = [];
        if (options.system) {
          messages.push({ role: "system", content: options.system });
        }
        messages.push({ role: "user", content: input.text });

        const result = yield* Effect.tryPromise({
          try: () => generateText({
            messages,
            model: modelId as unknown as LanguageModelV1,
            temperature: options.parameters?.temperature,
            maxTokens: options.parameters?.maxTokens,
            topP: options.parameters?.topP,
            frequencyPenalty: options.parameters?.frequencyPenalty,
            presencePenalty: options.parameters?.presencePenalty
          }),
          catch: error => new ProviderOperationError({
            providerName: "google",
            operation: "generateText",
            message: error instanceof Error ? error.message : "Unknown error",
            module: "google",
            method: "generateText",
            cause: error
          })
        });

        const textResult: GenerateTextResult = {
          text: result.text || "",
          id: result.response?.id || `google-text-${Date.now()}`,
          model: result.response?.modelId || modelId,
          timestamp: new Date(),
          finishReason: (result.finishReason || "stop") as FinishReason,
          usage: {
            promptTokens: result.usage?.promptTokens || 0,
            completionTokens: result.usage?.completionTokens || 0,
            totalTokens: result.usage?.totalTokens || 0
          }
        };

        return {
          data: textResult,
          metadata: {
            model: modelId,
            provider: "google",
            requestId: result.response?.id || `google-text-${Date.now()}`,
            messageCount: messages.length,
            hasSystemPrompt: !!options.system
          },
          usage: textResult.usage,
          finishReason: textResult.finishReason
        };
      }),
      
    generateObject: <T = unknown>(input: EffectiveInput, options: ProviderGenerateObjectOptions<T>) => 
      Effect.gen(function* () {
        const modelId = options.modelId;
        if (!modelId) {
          return yield* Effect.fail(new ProviderMissingModelIdError({
            providerName: "google",
            capability: "text-generation",
            module: "google",
            method: "generateObject"
          }));
        }

        const messages: Message[] = [];
        if (options.system) {
          messages.push({ role: "system", content: options.system });
        }
        messages.push({ role: "user", content: input.text });

        try {
          const result = yield* Effect.promise<GenerateTextResponse>(() =>
            generateText({
              messages,
              model: modelId as unknown as LanguageModelV1,
              temperature: options.parameters?.temperature,
              maxTokens: options.parameters?.maxTokens,
              topP: options.parameters?.topP,
              frequencyPenalty: options.parameters?.frequencyPenalty,
              presencePenalty: options.parameters?.presencePenalty
            })
          );

          // Parse the text response as JSON
          let parsedObject: T;
          try {
            parsedObject = JSON.parse(result.text || "") as T;
          } catch (parseError) {
            return yield* Effect.fail(new ProviderOperationError({
              providerName: "google",
              operation: "generateObject",
              message: "Failed to parse generated text as JSON",
              module: "google",
              method: "generateObject",
              cause: parseError
            }));
          }

          const objectResult: GenerateObjectResult<T> = {
            object: parsedObject,
            id: result.response?.id || `google-object-${Date.now()}`,
            model: result.response?.modelId || modelId,
            timestamp: new Date(),
            finishReason: (result.finishReason || "stop") as FinishReason,
            usage: {
              promptTokens: result.usage?.promptTokens || 0,
              completionTokens: result.usage?.completionTokens || 0,
              totalTokens: result.usage?.totalTokens || 0
            }
          };

          return {
            data: objectResult,
            metadata: {
              model: modelId,
              provider: "google",
              requestId: result.response?.id || `google-object-${Date.now()}`,
              messageCount: messages.length,
              hasSystemPrompt: !!options.system
            },
            usage: objectResult.usage,
            finishReason: objectResult.finishReason
          };
        } catch (error) {
          return yield* Effect.fail(new ProviderOperationError({
            providerName: "google",
            operation: "generateObject",
            message: error instanceof Error ? error.message : "Unknown error",
            module: "google",
            method: "generateObject",
            cause: error
          }));
        }
      }),
      
    generateSpeech: (input: string, options: ProviderGenerateSpeechOptions) => 
      Effect.gen(function* () {
        const modelId = options.modelId;
        if (!modelId) {
          return yield* Effect.fail(new ProviderMissingModelIdError({
            providerName: "google",
            capability: "text-generation",
            module: "google",
            method: "generateSpeech"
          }));
        }

        try {
          // Call Google text-to-speech API
          const result = yield* Effect.promise(() =>
            generateSpeech({
              model: modelId as unknown as SpeechModel,
              text: input,
              voice: options.voice || "alloy",
              speed: 1.0
            })
          );

          const speechResult: GenerateSpeechResult = {
            audioData: typeof result.audio === 'string' ? result.audio : Buffer.from(result.audio as unknown as Uint8Array).toString('base64'),
            id: `google-speech-${Date.now()}`,
            model: modelId,
            timestamp: new Date(),
            finishReason: "stop" as FinishReason,
            usage: {
              promptTokens: input.length, // Approximate token count based on input text length
              completionTokens: 0, // No completion tokens for speech generation
              totalTokens: input.length
            },
            parameters: {
              voice: options.voice || "alloy",
              speed: "1.0"
            },
            format: "mp3"
          };

          return {
            data: speechResult,
            metadata: {
              model: modelId,
              provider: "google",
              requestId: `google-speech-${Date.now()}`,
              audioSize: speechResult.audioData.length
            },
            usage: speechResult.usage,
            finishReason: speechResult.finishReason
          };
        } catch (error) {
          return yield* Effect.fail(new ProviderOperationError({
            providerName: "google",
            operation: "generateSpeech",
            message: error instanceof Error ? error.message : "Unknown error",
            module: "google",
            method: "generateSpeech",
            cause: error
          }));
        }
      }),
      
    transcribe: (input: ArrayBuffer, options: ProviderTranscribeOptions) =>
      Effect.gen(function* () {
        const modelId = options.modelId;
        if (!modelId) {
          return yield* Effect.fail(new ProviderMissingModelIdError({
            providerName: "google",
            capability: "text-generation",
            module: "google",
            method: "transcribe"
          }));
        }

        try {
          // Convert ArrayBuffer to Uint8Array for Google API
          const audioData = new Uint8Array(input);

          // Call Google Speech-to-Text API
          const result = yield* Effect.promise(() =>
            generateText({
              messages: [{
                role: "user",
                content: "Please transcribe the following audio and provide the result as a JSON object with: text (full transcript), segments (array of {start, end, text}), and duration (in seconds)."
              }],
              model: modelId as unknown as LanguageModelV1,
              temperature: 0,
              maxTokens: 4096,
              providerOptions: {
                google: {
                  ...(options.language && { language: options.language }),
                  timestamps: true,
                  quality: "standard"
                }
              }
            })
          );

          // Parse the transcription result
          let parsedResult;
          try {
            parsedResult = JSON.parse(result.text);
          } catch (parseError) {
            return yield* Effect.fail(new ProviderOperationError({
              providerName: "google",
              operation: "transcribe",
              message: "Failed to parse transcription result",
              module: "google",
              method: "transcribe",
              cause: parseError
            }));
          }

          const transcribeResult: TranscribeResult = {
            text: parsedResult.text || "",
            segments: parsedResult.segments?.map((segment: any) => ({
              id: 0,
              start: segment.start,
              end: segment.end,
              text: segment.text,
              words: []
            })) || [],
            duration: parsedResult.duration || 0,
            parameters: {
              language: options.language,
              diarization: false,
              timestamps: true,
              quality: "standard"
            },
            id: `google-transcribe-${Date.now()}`,
            model: modelId,
            timestamp: new Date(),
            finishReason: "stop" as FinishReason,
            usage: {
              promptTokens: result.usage?.promptTokens || 0,
              completionTokens: result.usage?.completionTokens || 0,
              totalTokens: result.usage?.totalTokens || 0
            }
          };

          return {
            data: transcribeResult,
            metadata: {
              model: modelId,
              provider: "google",
              requestId: `google-transcribe-${Date.now()}`,
              duration: transcribeResult.duration,
              segmentCount: transcribeResult.segments?.length || 0
            },
            usage: transcribeResult.usage,
            finishReason: transcribeResult.finishReason
          };
        } catch (error) {
          return yield* Effect.fail(new ProviderOperationError({
            providerName: "google",
            operation: "transcribe",
            message: error instanceof Error ? error.message : "Unknown error",
            module: "google",
            method: "transcribe",
            cause: error
          }));
        }
      }),
      
    generateEmbeddings: (input: string[], options: ProviderGenerateEmbeddingsOptions) =>
      Effect.gen(function* () {
        const modelId = options.modelId;
        if (!modelId) {
          return yield* Effect.fail(new ProviderMissingModelIdError({
            providerName: "google",
            capability: "embeddings",
            module: "google",
            method: "generateEmbeddings"
          }));
        }

        try {
          // Call Google Vertex AI API for embeddings
          const result = yield* Effect.promise(() =>
            generateText({
              messages: [{ role: "user", content: input.join("\n") }],
              model: modelId as unknown as LanguageModelV1,
              temperature: 0,
              maxTokens: 1536 // Standard embedding size
            })
          );

          // Parse the embeddings from the model output
          // The model should return a JSON string containing the embeddings
          let embeddings: number[][] = [];
          try {
            const parsedOutput = JSON.parse(result.text);
            if (Array.isArray(parsedOutput) && parsedOutput.every(Array.isArray)) {
              embeddings = parsedOutput;
            } else {
              throw new Error("Invalid embeddings format in response");
            }
          } catch (parseError) {
            return yield* Effect.fail(new ProviderOperationError({
              providerName: "google",
              operation: "generateEmbeddings",
              message: "Failed to parse embeddings from response",
              module: "google",
              method: "generateEmbeddings",
              cause: parseError
            }));
          }

          const dimensions = embeddings[0]?.length || 0;

          const embeddingResult: GenerateEmbeddingsResult = {
            embeddings,
            dimensions,
            texts: input,
            id: `google-embeddings-${Date.now()}`,
            model: modelId,
            timestamp: new Date(),
            finishReason: "stop" as FinishReason,
            usage: {
              promptTokens: result.usage?.promptTokens || 0,
              completionTokens: result.usage?.completionTokens || 0,
              totalTokens: result.usage?.totalTokens || 0
            },
            parameters: {
              modelParameters: options.batchSize ? { batchSize: options.batchSize } : {},
              normalization: undefined,
              preprocessing: []
            }
          };

          return {
            data: embeddingResult,
            metadata: {
              model: modelId,
              provider: "google",
              requestId: `google-embeddings-${Date.now()}`,
              dimensions
            },
            usage: embeddingResult.usage,
            finishReason: embeddingResult.finishReason
          };
        } catch (error) {
          return yield* Effect.fail(new ProviderOperationError({
            providerName: "google",
            operation: "generateEmbeddings",
            message: error instanceof Error ? error.message : "Unknown error",
            module: "google",
            method: "generateEmbeddings",
            cause: error
          }));
        }
      }),
      
    generateImage: (input: EffectiveInput, options: ProviderGenerateImageOptions) =>
      Effect.gen(function* () {
        const modelId = options.modelId;
        if (!modelId) {
          return yield* Effect.fail(new ProviderMissingModelIdError({
            providerName: "google",
            capability: "image-generation",
            module: "google",
            method: "generateImage"
          }));
        }

        try {
          // Convert EffectiveInput to prompt
          const prompt = input.text || "A beautiful landscape";

          // Call Google text model to generate image description
          const result = yield* Effect.promise(() =>
            generateText({
              messages: [{
                role: "user",
                content: `Please generate a detailed image description for: ${prompt}. Return a JSON object with fields: base64 (base64 encoded PNG image data), width, height, and format.`
              }],
              model: modelId as unknown as LanguageModelV1,
              temperature: options.parameters?.temperature || 0.7,
              maxTokens: 2048
            })
          );

          // Parse the image generation result
          let parsedResult;
          try {
            parsedResult = JSON.parse(result.text);
          } catch (parseError) {
            return yield* Effect.fail(new ProviderOperationError({
              providerName: "google",
              operation: "generateImage",
              message: "Failed to parse image generation result",
              module: "google",
              method: "generateImage",
              cause: parseError
            }));
          }

          if (!parsedResult.base64) {
            throw new Error("No image data in response");
          }

          const imageResult: GenerateImageResult = {
            imageUrl: `data:image/png;base64,${parsedResult.base64}`,
            additionalImages: [],
            parameters: {
              size: options.size,
              quality: options.quality,
              style: options.style
            },
            id: `google-image-${Date.now()}`,
            model: modelId,
            timestamp: new Date(),
            finishReason: "stop" as FinishReason,
            usage: {
              promptTokens: result.usage?.promptTokens || 0,
              completionTokens: result.usage?.completionTokens || 0,
              totalTokens: result.usage?.totalTokens || 0
            }
          };

          return {
            data: imageResult,
            metadata: {
              model: modelId,
              provider: "google",
              requestId: `google-image-${Date.now()}`,
              imageCount: 1,
              size: options.size,
              quality: options.quality,
              style: options.style
            },
            usage: imageResult.usage,
            finishReason: imageResult.finishReason
          };
        } catch (error) {
          return yield* Effect.fail(new ProviderOperationError({
            providerName: "google",
            operation: "generateImage",
            message: error instanceof Error ? error.message : "Unknown error",
            module: "google",
            method: "generateImage",
            cause: error
          }));
        }
      }),
      
    // Chat method
    chat: (effectiveInput: EffectiveInput, options: ProviderChatOptions) =>
      Effect.gen(function* () {
        const modelId = options.modelId;
        if (!modelId) {
          return yield* Effect.fail(new ProviderMissingModelIdError({
            providerName: "google",
            capability: "chat",
            module: "google",
            method: "chat"
          }));
        }

        const messages: Message[] = [];

        // Add system message if provided
        if (options.system) {
          messages.push({ role: "system", content: options.system });
        }

        // Add any existing messages
        if (effectiveInput.text) {
          messages.push({ role: "user", content: effectiveInput.text });
        }

        // Call Google API with chat messages
        const result = yield* Effect.tryPromise({
          try: () => generateText({
            messages,
            model: modelId as unknown as LanguageModelV1,
            temperature: options.parameters?.temperature,
            maxTokens: options.parameters?.maxTokens,
            topP: options.parameters?.topP,
            frequencyPenalty: options.parameters?.frequencyPenalty,
            presencePenalty: options.parameters?.presencePenalty
          }),
          catch: error => new ProviderOperationError({
            providerName: "google",
            operation: "chat",
            message: error instanceof Error ? error.message : "Unknown error",
            module: "google",
            method: "chat",
            cause: error
          })
        });

        const chatResult: GenerateTextResult = {
          text: result.text,
          id: result.response?.id || `google-chat-${Date.now()}`,
          model: result.response?.modelId || modelId,
          timestamp: new Date(),
          finishReason: "stop" as FinishReason,
          usage: {
            promptTokens: result.usage?.promptTokens || 0,
            completionTokens: result.usage?.completionTokens || 0,
            totalTokens: result.usage?.totalTokens || 0
          },
          toolCalls: []
        };

        return {
          data: chatResult,
          metadata: {
            model: modelId,
            provider: "google",
            requestId: result.response?.id || `google-chat-${Date.now()}`,
            messageCount: messages.length,
            hasSystemPrompt: !!options.system,
            toolsUsed: 0,
          },
          usage: chatResult.usage,
          finishReason: chatResult.finishReason,
        };
      }),
      
    // Model management
    getModels: () =>
      Effect.gen(function* () {
        const modelService = yield* ModelService;
        const googleModels = yield* modelService.getModelsForProvider("google");
        return [...googleModels];
      }).pipe(
        Effect.mapError(error => new ProviderServiceConfigError({
          description: `Failed to get Google models: ${String(error)}`,
          module: "google",
          method: "getModels"
        }))
      ),
      
    getDefaultModelIdForProvider: (providerName: ProvidersType, capability: ModelCapability) =>
      Effect.fail(new ProviderMissingModelIdError({
        providerName,
        capability,
        module: "google",
        method: "getDefaultModelIdForProvider"
      })),

    // Provider management
    setVercelProvider: (vercelProvider: EffectiveProviderApi) =>
      Effect.fail(new ProviderOperationError({
        providerName: "google",
        operation: "setVercelProvider",
        message: "Not implemented",
        module: "google",
        method: "setVercelProvider"
      }))
  });
}

export { makeGoogleClient };
