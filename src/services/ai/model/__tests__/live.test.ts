/**
 * @file Tests for the ModelConfigLiveLayer.
 * @module services/ai/model/__tests__/live.test
 */

import { Cause, ConfigProvider, Effect, Exit, HashMap, Layer, Option } from "effect";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ModelConfigError } from "../errors.js";
import { ModelConfigLiveLayer } from "../live.js";
import { ModelConfigData, ModelConfigDataTag } from "../types.js";

describe("ModelConfigLiveLayer", () => {
    let tempDir: string;
    let modelsJsonPath: string;

    // Create a test models.json file before running tests
    beforeAll(async () => {
        // Create temp directory in __tests__ folder
        tempDir = path.join(__dirname, "temp");
        await fs.mkdir(tempDir, { recursive: true });
        modelsJsonPath = path.join(tempDir, "models.json");

        // Sample valid model config
        const validConfig = {
            name: "Test Config",
            version: "1.0.0",
            models: [{
                id: "test-model",
                name: "Test Model",
                version: "1.0.0",
                provider: "test-provider",
                modelName: "test-model-name",
                contextWindowSize: "medium",
                costPer1kInputTokens: 0.01,
                costPer1kOutputTokens: 0.02,
                capabilities: ["chat"]
            }]
        };

        // Write the config to the temp file
        await fs.writeFile(modelsJsonPath, JSON.stringify(validConfig, null, 2));
    });

    // Clean up after tests
    afterAll(async () => {
        if (tempDir) {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    });

    // Helper to create a test layer with file-based config
    const createTestLayer = () => {
        // Read the JSON file and provide it to the ConfigProvider
        return Effect.gen(function* () {
            const fileContent = yield* Effect.tryPromise(() =>
                fs.readFile(modelsJsonPath, 'utf-8')
            );
            const config = JSON.parse(fileContent);
            return Layer.provide(
                ModelConfigLiveLayer,
                Layer.succeed(ConfigProvider.ConfigProvider, ConfigProvider.fromJson({
                    models: JSON.stringify(config)
                }))
            );
        });
    };

    it("should load and provide valid model configuration", async () => {
        const testEffect = Effect.gen(function* () {
            // Build the layer dynamically
            const testLayer = yield* createTestLayer();

            // Create effect to access ModelConfigData
            const accessModelConfig = Effect.gen(function* () {
                const configData = yield* ModelConfigDataTag;
                expect(configData).toBeInstanceOf(ModelConfigData);
                const model = Option.getOrNull(HashMap.get(configData.models, "test-model"));
                expect(model?.name).toBe("Test Model");
                return configData;
            });

            // Run the test with the dynamically created layer
            return yield* Effect.provide(accessModelConfig, testLayer);
        });

        await Effect.runPromise(testEffect);
    });

    it("should fail with ModelConfigError if config is missing", async () => {
        const testEffect = Effect.gen(function* () {
            // Create layer with empty config
            const testLayer = Layer.provide(
                ModelConfigLiveLayer,
                Layer.succeed(ConfigProvider.ConfigProvider, ConfigProvider.fromJson({}))
            );

            // Try to access ModelConfigData
            const accessModelConfig = Effect.gen(function* () {
                return yield* ModelConfigDataTag;
            });

            // Run the test and expect it to fail
            return yield* Effect.provide(accessModelConfig, testLayer);
        });

        const result = await Effect.runPromiseExit(testEffect);
        Exit.match(result, {
            onFailure: (cause) => {
                const error = Cause.failureOption(cause);
                expect(Option.isSome(error)).toBe(true);
                if (Option.isSome(error)) {
                    expect(error.value).toBeInstanceOf(ModelConfigError);
                }
            },
            onSuccess: () => {
                throw new Error("Expected failure but got success");
            }
        });
    });

    it("should fail with ModelConfigError if config fails schema validation", async () => {
        const testEffect = Effect.gen(function* () {
            // Create layer with invalid config (missing required fields)
            const invalidConfig = {
                models: JSON.stringify({
                    name: "Test Config",
                    version: "1.0.0",
                    models: [{
                        // Missing required fields like id, provider, etc.
                        name: "Invalid Model"
                    }]
                })
            };

            const testLayer = Layer.provide(
                ModelConfigLiveLayer,
                Layer.succeed(ConfigProvider.ConfigProvider, ConfigProvider.fromJson(invalidConfig))
            );

            // Try to access ModelConfigData
            const accessModelConfig = Effect.gen(function* () {
                return yield* ModelConfigDataTag;
            });

            // Run the test and expect it to fail
            return yield* Effect.provide(accessModelConfig, testLayer);
        });

        const result = await Effect.runPromiseExit(testEffect);
        Exit.match(result, {
            onFailure: (cause) => {
                const error = Cause.failureOption(cause);
                expect(Option.isSome(error)).toBe(true);
                if (Option.isSome(error)) {
                    expect(error.value).toBeInstanceOf(ModelConfigError);
                    expect(error.value.message).toBe("Failed to validate model config");
                }
            },
            onSuccess: () => {
                throw new Error("Expected failure but got success");
            }
        });
    });

    it("findModelsByCapability should return models with the specified capability", async () => {
        const testEffect = Effect.gen(function* () {
            // Create layer with multiple models having different capabilities
            const config = {
                models: JSON.stringify({
                    name: "Test Config",
                    version: "1.0.0",
                    models: [
                        {
                            id: "chat-model",
                            name: "Chat Model",
                            version: "1.0.0",
                            provider: "test-provider",
                            modelName: "chat-model-name",
                            contextWindowSize: "medium",
                            costPer1kInputTokens: 0.01,
                            costPer1kOutputTokens: 0.02,
                            capabilities: ["chat", "function-calling"]
                        },
                        {
                            id: "code-model",
                            name: "Code Model",
                            version: "1.0.0",
                            provider: "test-provider",
                            modelName: "code-model-name",
                            contextWindowSize: "large",
                            costPer1kInputTokens: 0.03,
                            costPer1kOutputTokens: 0.04,
                            capabilities: ["code-generation"]
                        }
                    ]
                })
            };

            const testLayer = Layer.provide(
                ModelConfigLiveLayer,
                Layer.succeed(ConfigProvider.ConfigProvider, ConfigProvider.fromJson(config))
            );

            // Try to access ModelConfigData and find models by capability
            const accessModelConfig = Effect.gen(function* () {
                const configData = yield* ModelConfigDataTag;
                const chatModels = configData.findModelsByCapability("chat");
                expect(chatModels.length).toBe(1);
                expect(chatModels[0].id).toBe("chat-model");
                expect(chatModels[0].capabilities).toContain("chat");
                return configData;
            });

            // Run the test
            return yield* Effect.provide(accessModelConfig, testLayer);
        });

        await Effect.runPromise(testEffect);
    });

    it("findModelsByCapability should return an empty array if no models have the capability", async () => {
        const testEffect = Effect.gen(function* () {
            // Create layer with models that don't have the target capability
            const config = {
                models: JSON.stringify({
                    name: "Test Config",
                    version: "1.0.0",
                    models: [
                        {
                            id: "chat-model",
                            name: "Chat Model",
                            version: "1.0.0",
                            provider: "test-provider",
                            modelName: "chat-model-name",
                            contextWindowSize: "medium",
                            costPer1kInputTokens: 0.01,
                            costPer1kOutputTokens: 0.02,
                            capabilities: ["chat", "function-calling"]
                        },
                        {
                            id: "code-model",
                            name: "Code Model",
                            version: "1.0.0",
                            provider: "test-provider",
                            modelName: "code-model-name",
                            contextWindowSize: "large",
                            costPer1kInputTokens: 0.03,
                            costPer1kOutputTokens: 0.04,
                            capabilities: ["code-generation"]
                        }
                    ]
                })
            };

            const testLayer = Layer.provide(
                ModelConfigLiveLayer,
                Layer.succeed(ConfigProvider.ConfigProvider, ConfigProvider.fromJson(config))
            );

            // Try to access ModelConfigData and find models by non-existent capability
            const accessModelConfig = Effect.gen(function* () {
                const configData = yield* ModelConfigDataTag;
                const imageModels = configData.findModelsByCapability("image-generation");
                expect(imageModels).toHaveLength(0);
                expect(Array.isArray(imageModels)).toBe(true);
                return configData;
            });

            // Run the test
            return yield* Effect.provide(accessModelConfig, testLayer);
        });

        await Effect.runPromise(testEffect);
    });

    it("findModelsByCapabilities should return models with all specified capabilities", async () => {
        const testEffect = Effect.gen(function* () {
            // Create layer with models having different capability combinations
            const config = {
                models: JSON.stringify({
                    name: "Test Config",
                    version: "1.0.0",
                    models: [
                        {
                            id: "chat-model",
                            name: "Chat Model",
                            version: "1.0.0",
                            provider: "test-provider",
                            modelName: "chat-model-name",
                            contextWindowSize: "medium",
                            costPer1kInputTokens: 0.01,
                            costPer1kOutputTokens: 0.02,
                            capabilities: ["chat", "function-calling"]
                        },
                        {
                            id: "advanced-model",
                            name: "Advanced Model",
                            version: "1.0.0",
                            provider: "test-provider",
                            modelName: "advanced-model-name",
                            contextWindowSize: "large",
                            costPer1kInputTokens: 0.03,
                            costPer1kOutputTokens: 0.04,
                            capabilities: ["chat", "function-calling", "code-generation"]
                        },
                        {
                            id: "code-model",
                            name: "Code Model",
                            version: "1.0.0",
                            provider: "test-provider",
                            modelName: "code-model-name",
                            contextWindowSize: "large",
                            costPer1kInputTokens: 0.03,
                            costPer1kOutputTokens: 0.04,
                            capabilities: ["code-generation"]
                        }
                    ]
                })
            };

            const testLayer = Layer.provide(
                ModelConfigLiveLayer,
                Layer.succeed(ConfigProvider.ConfigProvider, ConfigProvider.fromJson(config))
            );

            // Try to access ModelConfigData and find models by multiple capabilities
            const accessModelConfig = Effect.gen(function* () {
                const configData = yield* ModelConfigDataTag;

                // Should find models with both chat and function-calling
                const chatAndFunctionModels = configData.findModelsByCapabilities(["chat", "function-calling"]);
                expect(chatAndFunctionModels).toHaveLength(2);
                expect(chatAndFunctionModels.map(m => m.id)).toContain("chat-model");
                expect(chatAndFunctionModels.map(m => m.id)).toContain("advanced-model");

                // Should find models with all three capabilities
                const allCapabilitiesModels = configData.findModelsByCapabilities(["chat", "function-calling", "code-generation"]);
                expect(allCapabilitiesModels).toHaveLength(1);
                expect(allCapabilitiesModels[0].id).toBe("advanced-model");

                // Should return empty array when no models have all capabilities
                const nonExistentCombo = configData.findModelsByCapabilities(["chat", "image-generation"]);
                expect(nonExistentCombo).toHaveLength(0);

                return configData;
            });

            // Run the test
            return yield* Effect.provide(accessModelConfig, testLayer);
        });

        await Effect.runPromise(testEffect);
    });

    it("validateModel should correctly validate model capabilities", async () => {
        const testEffect = Effect.gen(function* () {
            // Create layer with models having different capabilities
            const config = {
                models: JSON.stringify({
                    name: "Test Config",
                    version: "1.0.0",
                    models: [
                        {
                            id: "chat-model",
                            name: "Chat Model",
                            version: "1.0.0",
                            provider: "test-provider",
                            modelName: "chat-model-name",
                            contextWindowSize: "medium",
                            costPer1kInputTokens: 0.01,
                            costPer1kOutputTokens: 0.02,
                            capabilities: ["chat", "function-calling"]
                        },
                        {
                            id: "code-model",
                            name: "Code Model",
                            version: "1.0.0",
                            provider: "test-provider",
                            modelName: "code-model-name",
                            contextWindowSize: "large",
                            costPer1kInputTokens: 0.03,
                            costPer1kOutputTokens: 0.04,
                            capabilities: ["code-generation"]
                        }
                    ]
                })
            };

            const testLayer = Layer.provide(
                ModelConfigLiveLayer,
                Layer.succeed(ConfigProvider.ConfigProvider, ConfigProvider.fromJson(config))
            );

            // Try to access ModelConfigData and validate model capabilities
            const accessModelConfig = Effect.gen(function* () {
                const configData = yield* ModelConfigDataTag;

                // Test valid model with all capabilities
                expect(configData.validateModel("chat-model", ["chat", "function-calling"])).toBe(true);

                // Test valid model with subset of capabilities
                expect(configData.validateModel("chat-model", ["chat"])).toBe(true);

                // Test valid model with missing capability
                expect(configData.validateModel("chat-model", ["code-generation"])).toBe(false);

                // Test non-existent model
                expect(configData.validateModel("non-existent-model", ["chat"])).toBe(false);

                return configData;
            });

            // Run the test
            return yield* Effect.provide(accessModelConfig, testLayer);
        });

        await Effect.runPromise(testEffect);
    });
});
