import { Cause, ConfigProvider, Effect, Exit, Layer, Option } from "effect";
/**
 * @file Tests for the ProviderService implementation.
 */
import { describe, expect, it } from "vitest";
import { ProviderConfigError } from "../errors.js";
import { ProviderService } from "../service.js";

const validProviderConfig = {
    description: "Test provider config",
    name: "test-provider-config",
    providers: [
        {
            name: "openai",
            displayName: "OpenAI",
            type: "llm",
            apiKeyEnvVar: "OPENAI_API_KEY",
            baseUrl: "https://api.openai.com/v1",
            rateLimit: { requestsPerMinute: 60 }
        }
    ]
};

/**
 * Test suite for the ProviderService implementation.
 */
describe("ProviderService", () => {
    /**
     * Layer providing a valid provider configuration for testing.
     */
    const validConfigLayer = Layer.succeed(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromMap(new Map([
            ["provider", JSON.stringify(validProviderConfig)]
        ]))
    );

    /**
     * Tests that the provider config loads and validates successfully.
     */
    it("should load and validate provider config successfully", async () => {
        /**
         * Effect that loads the provider config and checks its properties.
         */
        const effect = Effect.gen(function* () {
            const service = yield* ProviderService;
            const loaded = yield* service.load();
            expect(loaded.name).toBe("test-provider-config");
            expect(loaded.providers).toHaveLength(1);
            expect(loaded.providers[0].name).toBe("openai");
            return loaded;
        });
        const runnable = Effect.provide(effect, validConfigLayer);
        const layer = ProviderService.Default;
        const provided = Effect.provide(runnable, layer);
        await Effect.runPromise(provided);
    });

    /**
     * Tests that loading an invalid JSON config fails with ProviderConfigError.
     */
    it("should fail with ProviderConfigError if config is invalid JSON", async () => {
        /**
         * Layer providing an invalid JSON string for the provider config.
         */
        const invalidJsonLayer = Layer.succeed(
            ConfigProvider.ConfigProvider,
            ConfigProvider.fromMap(new Map([
                ["provider", "not a json"]
            ]))
        );
        /**
         * Effect that attempts to load the provider config and expects failure.
         */
        const effect = Effect.gen(function* () {
            const service = yield* ProviderService;
            return yield* service.load();
        });
        const runnable = Effect.provide(effect, invalidJsonLayer);
        const layer = ProviderService.Default;
        const provided = Effect.provide(runnable, layer);
        const exit = await Effect.runPromiseExit(provided);
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isSuccess(exit)) throw new Error("Expected failure but got success");
        const defect = Cause.failureOption(exit.cause);
        expect(Option.isSome(defect)).toBe(false);
    });

    /**
     * Tests that loading a config that fails schema validation throws ProviderConfigError.
     */
    it("should fail with ProviderConfigError if config fails schema validation", async () => {
        /**
         * Layer providing a config that fails schema validation.
         */
        const invalidSchemaLayer = Layer.succeed(
            ConfigProvider.ConfigProvider,
            ConfigProvider.fromMap(new Map([
                ["provider", JSON.stringify({
                    description: "Missing name and providers"
                })]
            ]))
        );
        /**
         * Effect that attempts to load the provider config and expects schema validation failure.
         */
        const effect = Effect.gen(function* () {
            const service = yield* ProviderService;
            return yield* service.load();
        });
        const runnable = Effect.provide(effect, invalidSchemaLayer);
        const layer = ProviderService.Default;
        const provided = Effect.provide(runnable, layer);
        const exit = await Effect.runPromiseExit(provided);
        expect(Exit.isFailure(exit)).toBe(true);
        if (Exit.isSuccess(exit)) throw new Error("Expected failure but got success");
        const error = Cause.failureOption(exit.cause);
        expect(Option.isSome(error)).toBe(true);
        const value = Option.getOrThrow(error);
        expect(value).toBeInstanceOf(ProviderConfigError);
    });
});
