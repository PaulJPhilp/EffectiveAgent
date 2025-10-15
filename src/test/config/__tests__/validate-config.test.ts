import { join } from "node:path";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { ConfigurationService } from "@/services/core/configuration/index.js";

describe("Test Configuration Validation", () => {
    // Create explicit dependency layers following centralized pattern
    const fileSystemLayer = NodeFileSystem.layer;
    const configurationLayer = Layer.provide(
        ConfigurationService.Default,
        fileSystemLayer
    );

    const testConfigDir = join(process.cwd(), "src/e2e/config");
    const providersConfig = join(testConfigDir, "providers.json");
    const modelsConfig = join(testConfigDir, "models.json");

    it("should validate providers configuration", () =>
        Effect.gen(function* () {
            const service = yield* ConfigurationService;
            const config = yield* service.loadProviderConfig(providersConfig);

            expect(config).toBeDefined();
            expect(config.providers).toHaveLength(3);

            // Validate Google provider
            const googleProvider = config.providers.find(p => p.name === "google");
            expect(googleProvider).toBeDefined();
            expect(googleProvider?.displayName).toBe("Google");
            expect(googleProvider?.description).toBeDefined();
            expect(googleProvider?.type).toBe("llm");
            expect(googleProvider?.apiKeyEnvVar).toBe("GOOGLE_GENERATIVE_AI_API_KEY");

            // Validate OpenAI provider
            const openaiProvider = config.providers.find(p => p.name === "openai");
            expect(openaiProvider).toBeDefined();
            expect(openaiProvider?.displayName).toBe("OpenAI");
            expect(openaiProvider?.description).toBeDefined();
            expect(openaiProvider?.type).toBe("llm");
            expect(openaiProvider?.apiKeyEnvVar).toBe("OPENAI_API_KEY");

            // Validate Anthropic provider
            const anthropicProvider = config.providers.find(p => p.name === "anthropic");
            expect(anthropicProvider).toBeDefined();
            expect(anthropicProvider?.displayName).toBe("Anthropic");
            expect(anthropicProvider?.description).toBeDefined();
            expect(anthropicProvider?.type).toBe("llm");
            expect(anthropicProvider?.apiKeyEnvVar).toBe("ANTHROPIC_API_KEY");
        }).pipe(
            Effect.provide(configurationLayer)
        )
    );

    it("should validate models configuration", () =>
        Effect.gen(function* () {
            const service = yield* ConfigurationService;
            const config = yield* service.loadModelConfig(modelsConfig);

            expect(config).toBeDefined();
            expect(config.models).toHaveLength(3);

            // Validate Google model
            const googleModel = config.models.find(m => m.id === "gemini-2.0-flash");
            expect(googleModel).toBeDefined();
            expect(googleModel?.name).toBe("Gemini 2.0 Flash");
            expect(googleModel?.provider).toBe("google");
            expect(googleModel?.enabled).toBe(true);
            expect(googleModel?.contextWindow).toBe(32768);

            // Validate OpenAI model
            const openaiModel = config.models.find(m => m.id === "gpt-4-turbo");
            expect(openaiModel).toBeDefined();
            expect(openaiModel?.name).toBe("GPT-4 Turbo");
            expect(openaiModel?.provider).toBe("openai");
            expect(openaiModel?.enabled).toBe(true);
            expect(openaiModel?.contextWindow).toBe(128000);

            // Validate Anthropic model
            const anthropicModel = config.models.find(m => m.id === "claude-3-opus");
            expect(anthropicModel).toBeDefined();
            expect(anthropicModel?.name).toBe("Claude 3 Opus");
            expect(anthropicModel?.provider).toBe("anthropic");
            expect(anthropicModel?.enabled).toBe(true);
            expect(anthropicModel?.contextWindow).toBe(200000);
        }).pipe(
            Effect.provide(configurationLayer)
        )
    );
});
