/**
 * @file Tests for the ProviderConfigLiveLayer.
 * @module services/ai/provider/__tests__/live.test
 */

import { Cause, ConfigProvider, Effect, Exit, HashMap, Layer, Option } from "effect";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ProviderConfigError } from "../errors.js";
import { ProviderConfigLiveLayer } from "../live.js";
import { ProviderConfigData, ProviderConfigDataTag } from "../types.js";

describe("ProviderConfigLiveLayer", () => {
    let tempDir: string;
    let providersJsonPath: string;

    // Create test files before running tests
    beforeAll(async () => {
        tempDir = path.join(__dirname, "temp");
        await fs.mkdir(tempDir, { recursive: true });
        providersJsonPath = path.join(tempDir, "providers.json");

        // Sample valid provider config
        const validConfig = {
            providers: [{
                name: "test-provider",
                displayName: "Test Provider",
                type: "test",
                apiKeyEnvVar: "TEST_API_KEY",
                baseUrl: "https://api.test.com",
                rateLimit: {
                    requestsPerMinute: 60,
                    tokensPerMinute: 10000
                }
            }],
            defaultProviderName: "test-provider"
        };

        await fs.writeFile(providersJsonPath, JSON.stringify(validConfig, null, 2));
    });

    // Clean up after tests
    afterAll(async () => {
        if (tempDir) {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    });

    // Helper to create test layer with file-based config
    const createTestLayer = () => {
        return Effect.gen(function* () {
            const fileContent = yield* Effect.tryPromise(() =>
                fs.readFile(providersJsonPath, 'utf-8')
            );
            const config = JSON.parse(fileContent);
            return Layer.provide(
                ProviderConfigLiveLayer,
                Layer.succeed(ConfigProvider.ConfigProvider, ConfigProvider.fromJson({
                    providers: JSON.stringify(config)
                }))
            );
        });
    };

    it("should load and provide valid provider configuration", async () => {
        const testEffect = Effect.gen(function* () {
            const testLayer = yield* createTestLayer();
            const accessProviderConfig = Effect.gen(function* () {
                const configData = yield* ProviderConfigDataTag;
                expect(configData).toBeInstanceOf(ProviderConfigData);
                const provider = Option.getOrNull(HashMap.get(configData.providers, "test-provider"));
                expect(provider?.displayName).toBe("Test Provider");
                expect(provider?.type).toBe("test");
                expect(configData.defaultProviderName).toBe("test-provider");
                return configData;
            });
            return yield* Effect.provide(accessProviderConfig, testLayer);
        });

        await Effect.runPromise(testEffect);
    });

    it("should fail with ProviderConfigError if config is missing", async () => {
        const testEffect = Effect.gen(function* () {
            const testLayer = Layer.provide(
                ProviderConfigLiveLayer,
                Layer.succeed(ConfigProvider.ConfigProvider, ConfigProvider.fromJson({}))
            );
            const accessConfig = Effect.gen(function* () {
                return yield* ProviderConfigDataTag;
            });
            return yield* Effect.provide(accessConfig, testLayer);
        });

        const result = await Effect.runPromiseExit(testEffect);
        Exit.match(result, {
            onFailure: (cause) => {
                const error = Cause.failureOption(cause);
                expect(Option.isSome(error)).toBe(true);
                if (Option.isSome(error)) {
                    expect(error.value).toBeInstanceOf(ProviderConfigError);
                    expect(error.value.message).toBe("Failed to load provider config");
                }
            },
            onSuccess: () => {
                throw new Error("Expected failure but got success");
            }
        });
    });

    it("should fail with ProviderConfigError if config fails schema validation", async () => {
        const testEffect = Effect.gen(function* () {
            // Create layer with invalid config (missing required fields)
            const invalidConfig = {
                providers: JSON.stringify({
                    providers: [{
                        // Missing required fields
                        name: "invalid-provider"
                    }],
                    defaultProviderName: "invalid-provider"
                })
            };

            const testLayer = Layer.provide(
                ProviderConfigLiveLayer,
                Layer.succeed(ConfigProvider.ConfigProvider, ConfigProvider.fromJson(invalidConfig))
            );

            const accessConfig = Effect.gen(function* () {
                return yield* ProviderConfigDataTag;
            });

            return yield* Effect.provide(accessConfig, testLayer);
        });

        const result = await Effect.runPromiseExit(testEffect);
        Exit.match(result, {
            onFailure: (cause) => {
                const error = Cause.failureOption(cause);
                expect(Option.isSome(error)).toBe(true);
                if (Option.isSome(error)) {
                    expect(error.value).toBeInstanceOf(ProviderConfigError);
                    expect(error.value.message).toBe("Failed to validate provider config");
                }
            },
            onSuccess: () => {
                throw new Error("Expected failure but got success");
            }
        });
    });

    it("should validate defaultProviderName exists in providers", async () => {
        const testEffect = Effect.gen(function* () {
            // Create layer with mismatched defaultProviderName
            const invalidConfig = {
                providers: JSON.stringify({
                    providers: [{
                        name: "test-provider",
                        displayName: "Test Provider",
                        type: "test"
                    }],
                    defaultProviderName: "non-existent-provider"
                })
            };

            const testLayer = Layer.provide(
                ProviderConfigLiveLayer,
                Layer.succeed(ConfigProvider.ConfigProvider, ConfigProvider.fromJson(invalidConfig))
            );

            const accessConfig = Effect.gen(function* () {
                return yield* ProviderConfigDataTag;
            });

            return yield* Effect.provide(accessConfig, testLayer);
        });

        const result = await Effect.runPromiseExit(testEffect);
        Exit.match(result, {
            onFailure: (cause) => {
                const error = Cause.failureOption(cause);
                expect(Option.isSome(error)).toBe(true);
                if (Option.isSome(error)) {
                    expect(error.value).toBeInstanceOf(ProviderConfigError);
                    expect(error.value.message).toBe("Failed to validate provider config");
                }
            },
            onSuccess: () => {
                throw new Error("Expected failure but got success");
            }
        });
    });
});
