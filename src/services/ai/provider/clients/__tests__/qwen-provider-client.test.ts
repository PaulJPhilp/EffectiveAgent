import { Message, TextPart } from "@/schema.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ToolRegistryService } from "@/services/ai/tool-registry/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { EffectiveInput } from "@/types.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Chunk, Effect, Layer } from "effect";
import { beforeEach, describe, expect, it } from "vitest";
import { makeQwenClient } from "../qwen-provider-client.js";

describe("Qwen Provider Client", () => {
    beforeEach(() => {
        process.env.MASTER_CONFIG_PATH = "./configuration/config-master/test.json";
    });

    const withLayers = <R, E, A>(effect: Effect.Effect<A, E, R>) =>
        effect.pipe(
            Effect.provide(Layer.mergeAll(
                NodeFileSystem.layer,
                ConfigurationService.Default,
                ModelService.Default,
                ToolRegistryService.Default
            ))
        );

    it("should generate text", () =>
        withLayers(Effect.gen(function* () {
            const client = yield* makeQwenClient("test-api-key");
            const result = yield* client.generateText(new EffectiveInput("Hello, how are you?", Chunk.empty()), {
                modelId: "qwen-max",
                parameters: {
                    maxTokens: 100
                }
            });

            expect(result.data.text).toBeDefined();
            expect(result.data.finishReason).toBeDefined();
            expect(result.data.usage).toBeDefined();
            return result;
        }))
    );

    it("should handle chat messages", () =>
        withLayers(Effect.gen(function* () {
            const client = yield* makeQwenClient("test-api-key");
            const messages = [
                new Message({
                    role: "user",
                    parts: Chunk.fromIterable([new TextPart({ _tag: "Text", content: "Hi" })])
                })
            ];

            const result = yield* client.chat({ text: "Hi", messages: Chunk.fromIterable(messages) }, {
                modelId: "qwen-max",
                parameters: {
                    maxTokens: 100
                }
            });

            expect(result.data.messages).toBeDefined();
            expect(result.data.finishReason).toBeDefined();
            expect(result.data.usage).toBeDefined();
            return result;
        }))
    );

    it("should generate embeddings", () =>
        withLayers(Effect.gen(function* () {
            const client = yield* makeQwenClient("test-api-key");
            const result = yield* client.generateEmbeddings(["test text"], {
                modelId: "text-embedding-v3"
            });

            expect(result.data.embeddings).toBeDefined();
            expect(result.data.dimensions).toBe(1024);
            expect(result.data.usage).toBeDefined();
            return result;
        }))
    );

    it("should throw error for unsupported capability", () =>
        withLayers(Effect.gen(function* () {
            const client = yield* makeQwenClient("test-api-key");
            try {
                yield* client.generateImage(new EffectiveInput("test prompt", Chunk.empty()), {
                    modelId: "qwen-max"
                });
                throw new Error("Expected error to be thrown");
            } catch (error: unknown) {
                expect((error as { message: string }).message).toBe("Provider qwen does not support image");
            }
        }))
    );
});