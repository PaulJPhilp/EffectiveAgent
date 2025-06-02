/**
 * @file Integration tests for model and provider services
 * @module tests/integration/model-provider-integration
 */

import path from "path";
import { fileURLToPath } from "url";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderNotFoundError } from "@/services/ai/provider/errors.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect } from "effect";
import { beforeAll, describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up test configuration paths
beforeAll(() => {
    process.env.PROVIDERS_CONFIG_PATH = path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../config/providers.json"
    );
    process.env.MODELS_CONFIG_PATH = path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../config/models.json"
    );
});

// Test suite for ModelService
describe("ModelService", () => {
    it("should load model configurations", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* ModelService;
            const result = yield* service.load();
            expect(result).toBeDefined();
            expect(Array.isArray(result.models)).toBe(true);
        });

        await Effect.runPromise(
            effect.pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)

            )
        );
    });

    it("should validate models from configured providers", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* ModelService;
            const result = yield* service.validateModel("gpt-4o");
            expect(result).toBe(true);
        });

        await Effect.runPromise(
            effect.pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            )
        );
    });

    it("should return provider name for a model", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* ModelService;
            const result = yield* service.getProviderName("gpt-4o");
            expect(result).toBeDefined();
        });

        await Effect.runPromise(
            effect.pipe(
                Effect.provide(ModelService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            )
        );
    });
});

// Test suite for ProviderService
describe("ProviderService", () => {
    it("should load provider configurations", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* ProviderService;
            const result = yield* service.load();
            expect(result).toBeDefined();
            expect(Array.isArray(result.providers)).toBe(true);
        });

        await Effect.runPromise(
            effect.pipe(
                Effect.provide(ProviderService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            )
        );
    });

    it("should return a provider client by name", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* ProviderService;
            const client = yield* service.getProviderClient("openai");
            expect(client).toBeDefined();
        });

        await Effect.runPromise(
            effect.pipe(
                Effect.provide(ProviderService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            )
        );
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

        await Effect.runPromise(
            effect.pipe(
                Effect.provide(ProviderService.Default),
                Effect.provide(ConfigurationService.Default),
                Effect.provide(NodeFileSystem.layer)
            )
        );
    });
});