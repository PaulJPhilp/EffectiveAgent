import { mkdirSync, rmdirSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Either, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProviderNotFoundError, ProviderServiceConfigError } from "../errors.js";
import { ProviderService } from "../service.js";

describe("ProviderService", () => {
    it("should have .Default available", () => {
        expect(ProviderService.Default).toBeDefined();
    });

    // Create explicit dependency layers following centralized pattern
    const fileSystemLayer = NodeFileSystem.layer;
    const configurationLayer = Layer.provide(
        ConfigurationService.Default,
        fileSystemLayer
    );
    const providerServiceTestLayer = Layer.provide(
        ProviderService.Default,
        Layer.mergeAll(configurationLayer, fileSystemLayer)
    );

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
            Effect.gen(function* () {
                const service = yield* ProviderService;
                expect(service).toBeDefined();
                expect(typeof service.getProviderClient).toBe("function");
            }).pipe(
                Effect.provide(providerServiceTestLayer)
            )
        );
    });

    describe("getProviderClient", () => {
        it("should get a provider client for a valid provider (OpenAI)", () =>
            Effect.gen(function* () {
                const service = yield* ProviderService;
                const client = yield* service.getProviderClient("openai");
                expect(client).toBeDefined();
                expect(typeof client.chat).toBe("function");
            }).pipe(
                Effect.provide(providerServiceTestLayer)
            )
        );

        it("should fail with ProviderNotFoundError for unknown provider", () =>
            Effect.gen(function* () {
                const service = yield* ProviderService;
                const result = yield* Effect.either(service.getProviderClient("unknown"));
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ProviderNotFoundError);
                }
            }).pipe(
                Effect.provide(providerServiceTestLayer)
            )
        );

        it("should fail with ProviderServiceConfigError for missing API key", () => {
            // biome-ignore lint/performance/noDelete: <explanation>
            delete process.env.OPENAI_API_KEY;
            return Effect.gen(function* () {
                const service = yield* ProviderService;
                const result = yield* Effect.either(service.getProviderClient("openai"));
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ProviderServiceConfigError);
                    expect((result.left as ProviderServiceConfigError).description).toContain("API key not found in environment");
                }
            }).pipe(
                Effect.provide(providerServiceTestLayer)
            );
        });

        it("should fail when configuration file is missing", () => {
            process.env.PROVIDERS_CONFIG_PATH = "nonexistent.json";
            return Effect.gen(function* () {
                const service = yield* ProviderService;
                const result = yield* Effect.either(service.getProviderClient("openai"));
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ProviderServiceConfigError);
                }
            }).pipe(
                Effect.provide(providerServiceTestLayer)
            );
        });

        it("should handle empty providers array", () => {
            writeFileSync(validProvidersConfig, JSON.stringify({ providers: [] }));
            return Effect.gen(function* () {
                const service = yield* ProviderService;
                const result = yield* Effect.either(service.getProviderClient("openai"));
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ProviderNotFoundError);
                }
            }).pipe(
                Effect.provide(providerServiceTestLayer)
            );
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

            return Effect.gen(function* () {
                const service = yield* ProviderService;
                const openaiClient = yield* service.getProviderClient("openai");
                const anthropicClient = yield* service.getProviderClient("anthropic");

                expect(openaiClient).toBeDefined();
                expect(anthropicClient).toBeDefined();

                // Verify they're different instances
                expect(openaiClient).not.toBe(anthropicClient);
            }).pipe(
                Effect.provide(providerServiceTestLayer)
            );
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

            return Effect.gen(function* () {
                const service = yield* ProviderService;
                const result = yield* Effect.either(service.getProviderClient("openai"));
                expect(Either.isLeft(result)).toBe(true);
                if (Either.isLeft(result)) {
                    expect(result.left).toBeInstanceOf(ProviderServiceConfigError);
                    expect((result.left as ProviderServiceConfigError).description).toContain("API key environment variable not configured");
                }
            }).pipe(
                Effect.provide(providerServiceTestLayer)
            );
        });
    });
}); 