import { ConfigurationService } from "@/services/core/configuration/service.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Either, Layer } from "effect";
import { mkdirSync, rmdirSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProviderNotFoundError, ProviderServiceConfigError } from "../errors.js";
import { ProviderService } from "../service.js";

const withLayers = <E, A>(effect: Effect.Effect<A, E, any>) =>
    effect.pipe(
        Effect.provide(Layer.mergeAll(
            NodeFileSystem.layer,
            ConfigurationService.Default,
            ProviderService.Default
        ))
    );

describe("ProviderService", () => {
    const testDir = join(process.cwd(), "test-provider-configs");
    const validProvidersConfig = join(testDir, "valid-providers.json");
    const invalidProvidersConfig = join(testDir, "invalid-providers.json");

    beforeEach(() => {
        mkdirSync(testDir, { recursive: true });
        writeFileSync(validProvidersConfig, JSON.stringify({
            providers: [
                {
                    name: "openai",
                    apiKeyEnvVar: "OPENAI_API_KEY"
                }
            ]
        }));
        process.env.OPENAI_API_KEY = "test-key";
        process.env.PROVIDERS_CONFIG_PATH = validProvidersConfig;
    });

    afterEach(() => {
        try {
            unlinkSync(validProvidersConfig);
            unlinkSync(invalidProvidersConfig);
            rmdirSync(testDir);
        } catch (error) {
            // Ignore cleanup errors
        }
        // biome-ignore lint/performance/noDelete: <explanation>
        delete process.env.OPENAI_API_KEY;
        // biome-ignore lint/performance/noDelete: <explanation>
        delete process.env.PROVIDERS_CONFIG_PATH;
    });

    describe("service instantiation", () => {
        it("should instantiate the service", () =>
            withLayers(Effect.gen(function* () {
                const service = yield* ProviderService;
                expect(service).toBeDefined();
                expect(typeof service.getProviderClient).toBe("function");
            }))
        );
    });

    describe("getProviderClient", () => {
        it("should get a provider client for a valid provider (OpenAI)", () =>
            withLayers(Effect.gen(function* () {
                const service = yield* ProviderService;
                const client = yield* service.getProviderClient("openai");
                expect(client).toBeDefined();
                expect(typeof client.chat).toBe("function");
            }))
        );

        it("should fail with ProviderNotFoundError for unknown provider", () =>
            withLayers(Effect.gen(function* () {
                const service = yield* ProviderService;
                const result = yield* Effect.either(service.getProviderClient("unknown"));
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ProviderNotFoundError);
                }
            }))
        );

        it("should fail with ProviderServiceConfigError for missing API key", () => {
            // biome-ignore lint/performance/noDelete: <explanation>
            delete process.env.OPENAI_API_KEY;
            return withLayers(Effect.gen(function* () {
                const service = yield* ProviderService;
                const result = yield* Effect.either(service.getProviderClient("openai"));
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ProviderServiceConfigError);
                    expect((result.left as ProviderServiceConfigError).description).toContain("API key not found in environment");
                }
            }));
        });

        it("should fail when configuration file is missing", () => {
            process.env.PROVIDERS_CONFIG_PATH = "nonexistent.json";
            return withLayers(Effect.gen(function* () {
                const service = yield* ProviderService;
                const result = yield* Effect.either(service.getProviderClient("openai"));
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ProviderServiceConfigError);
                }
            }));
        });

        it("should handle empty providers array", () => {
            writeFileSync(validProvidersConfig, JSON.stringify({ providers: [] }));
            return withLayers(Effect.gen(function* () {
                const service = yield* ProviderService;
                const result = yield* Effect.either(service.getProviderClient("openai"));
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ProviderNotFoundError);
                }
            }));
        });
    });

    describe("multiple provider support", () => {
        it("should support multiple different providers", () => {
            process.env.ANTHROPIC_API_KEY = "test-key";
            writeFileSync(validProvidersConfig, JSON.stringify({
                providers: [
                    {
                        name: "openai",
                        apiKeyEnvVar: "OPENAI_API_KEY"
                    },
                    {
                        name: "anthropic",
                        apiKeyEnvVar: "ANTHROPIC_API_KEY"
                    }
                ]
            }));

            return withLayers(Effect.gen(function* () {
                const service = yield* ProviderService;
                const openaiClient = yield* service.getProviderClient("openai");
                const anthropicClient = yield* service.getProviderClient("anthropic");

                expect(openaiClient).toBeDefined();
                expect(anthropicClient).toBeDefined();

                // Verify they're different instances
                expect(openaiClient).not.toBe(anthropicClient);
            }));
        });
    });

    describe("configuration edge cases", () => {
        it("should fail with ProviderServiceConfigError for missing apiKeyEnvVar", () => {
            writeFileSync(validProvidersConfig, JSON.stringify({
                providers: [
                    {
                        name: "openai"
                    }
                ]
            }));

            return withLayers(Effect.gen(function* () {
                const service = yield* ProviderService;
                const result = yield* Effect.either(service.getProviderClient("openai"));
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ProviderServiceConfigError);
                    expect((result.left as ProviderServiceConfigError).description).toContain("API key environment variable not configured");
                }
            }));
        });
    });
}); 