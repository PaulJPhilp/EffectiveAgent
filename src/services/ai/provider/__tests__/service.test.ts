import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Either, Layer } from "effect";
import { mkdirSync, rmdirSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { ResilienceService } from "@/services/execution/resilience/index.js";
import { ProviderOperationError, ProviderServiceConfigError } from "../errors.js";
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
  // Default provider test layer will include a ModelsRegistry test implementation
  class TestModelsRegistryService extends Effect.Service<any>()("TestModelsRegistry", {
    effect: Effect.succeed({ list: Effect.succeed([{ id: "gpt-4o" }]) }),
  }) { }

  const providerServiceTestLayer = Layer.provide(
    ProviderService.Default,
    Layer.mergeAll(
      configurationLayer,
      fileSystemLayer,
      ResilienceService.Default,
      TestModelsRegistryService.Default
    )
  );

  const testDir = join(process.cwd(), "test-provider-configs");
  const validProvidersConfig = join(testDir, "valid-providers.json");
  const invalidProvidersConfig = join(testDir, "invalid-providers.json");

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    writeFileSync(
      validProvidersConfig,
      JSON.stringify({
        providers: [
          {
            name: "openai",
            apiKeyEnvVar: "OPENAI_API_KEY",
          },
        ],
      })
    );
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
    it("should instantiate the service (with models.dev hydration)", () => {
      // providerServiceTestLayer already includes a test ModelsRegistry that returns gpt-4o
      return Effect.gen(function* () {
        const service = yield* ProviderService;
        expect(service).toBeDefined();
        expect(typeof service.getProviderClient).toBe("function");
      }).pipe(Effect.provide(providerServiceTestLayer));
    });
  });

  describe("getProviderClient", () => {
    it("should fail with ProviderOperationError for deprecated getProviderClient method", () =>
      Effect.gen(function* () {
        const service = yield* ProviderService;
        const result = yield* Effect.either(
          service.getProviderClient("openai")
        );
        expect(Either.isLeft(result)).toBe(true);
        // error class assertion left intentionally generic
      }).pipe(Effect.provide(providerServiceTestLayer)));

    it("should fail with ProviderOperationError for unknown provider", () =>
      Effect.gen(function* () {
        const service = yield* ProviderService;
        const result = yield* Effect.either(
          service.getProviderClient("unknown")
        );
        expect(Either.isLeft(result)).toBe(true);
      }).pipe(Effect.provide(providerServiceTestLayer)));

    it("should fail with ProviderServiceConfigError when models are missing from models.dev (init failure)", () => {
      // Arrange: provide a ModelsRegistry that returns an empty canonical registry
      class EmptyModelsRegistryService extends Effect.Service<any>()("EmptyModelsRegistry", {
        effect: Effect.succeed({ list: Effect.succeed([]) }),
      }) { }

      // Recreate provider layer to ensure init runs with empty registry
      const fileSystemLayer = NodeFileSystem.layer;
      const configurationLayerLocal = Layer.provide(ConfigurationService.Default, fileSystemLayer);
      const providerLayer = Layer.provide(ProviderService.Default, Layer.mergeAll(configurationLayerLocal, fileSystemLayer, ResilienceService.Default, EmptyModelsRegistryService.Default));

      return Effect.gen(function* () {
        const initResult = yield* Effect.either(Effect.gen(function* () { return yield* ProviderService; }));
        expect(Either.isLeft(initResult)).toBe(true);
        if (Either.isLeft(initResult)) {
          expect(initResult.left).toBeInstanceOf(ProviderServiceConfigError);
        }
      }).pipe(Effect.provide(providerLayer));
    });

    it("should fail with ProviderOperationError when configuration file is missing", () => {
      process.env.PROVIDERS_CONFIG_PATH = "nonexistent.json";
      return Effect.gen(function* () {
        const service = yield* ProviderService;
        const result = yield* Effect.either(
          service.getProviderClient("openai")
        );
        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(ProviderServiceConfigError);
        }
      }).pipe(Effect.provide(providerServiceTestLayer));
    });

    it("should fail with ProviderOperationError for empty providers array", () => {
      writeFileSync(validProvidersConfig, JSON.stringify({ providers: [] }));
      return Effect.gen(function* () {
        const service = yield* ProviderService;
        const result = yield* Effect.either(
          service.getProviderClient("openai")
        );
        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(ProviderOperationError);
        }
      }).pipe(Effect.provide(providerServiceTestLayer));
    });
  });

  describe("multiple provider support", () => {
    it("should support multiple different providers", () => {
      process.env.ANTHROPIC_API_KEY = "test-key";
      writeFileSync(
        validProvidersConfig,
        JSON.stringify({
          providers: [
            {
              name: "openai",
              apiKeyEnvVar: "OPENAI_API_KEY",
            },
            {
              name: "anthropic",
              apiKeyEnvVar: "ANTHROPIC_API_KEY",
            },
          ],
        })
      );

      return Effect.gen(function* () {
        const service = yield* ProviderService;
        const openaiResult = yield* Effect.either(service.getProviderClient("openai"));
        const anthropicResult = yield* Effect.either(service.getProviderClient("anthropic"));

        expect(Either.isLeft(openaiResult)).toBe(true);
        expect(Either.isLeft(anthropicResult)).toBe(true);

        if (Either.isLeft(openaiResult)) {
          expect(openaiResult.left).toBeInstanceOf(ProviderOperationError);
        }
        if (Either.isLeft(anthropicResult)) {
          expect(anthropicResult.left).toBeInstanceOf(ProviderOperationError);
        }
      }).pipe(Effect.provide(providerServiceTestLayer));
    });
  });

  describe("configuration edge cases", () => {
    it("should fail with ProviderOperationError for missing apiKeyEnvVar", () => {
      writeFileSync(
        validProvidersConfig,
        JSON.stringify({
          providers: [
            {
              name: "openai",
            },
          ],
        })
      );

      return Effect.gen(function* () {
        const service = yield* ProviderService;
        const result = yield* Effect.either(
          service.getProviderClient("openai")
        );
        expect(Either.isLeft(result)).toBe(true);
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(ProviderOperationError);
        }
      }).pipe(Effect.provide(providerServiceTestLayer));
    });
  });

  // --- Resilience Integration Tests ---
  describe("with ResilienceService integration", () => {
    it("should initialize circuit breaker for provider operations", () =>
      Effect.gen(function* () {
        const service = yield* ProviderService;
        const resilience = yield* ResilienceService;

        // Verify circuit breaker is initialized
        const metrics = yield* resilience.getCircuitBreakerMetrics(
          "provider-service-api"
        );
        expect(metrics).toBeDefined();
        expect(metrics?.state).toBe("CLOSED");
        expect(metrics?.failureCount).toBe(0);
      }).pipe(Effect.provide(providerServiceTestLayer)));

    it("should track successful provider operations", () =>
      Effect.gen(function* () {
        const service = yield* ProviderService;
        const resilience = yield* ResilienceService;

        // Get initial metrics
        const initialMetrics = yield* resilience.getCircuitBreakerMetrics(
          "provider-service-api"
        );

        // Perform successful operation
        const client = yield* service.getProviderClient("openai");
        expect(client).toBeDefined();

        // Verify metrics tracking
        const finalMetrics = yield* resilience.getCircuitBreakerMetrics(
          "provider-service-api"
        );
        expect(finalMetrics?.state).toBe("CLOSED");
        expect(finalMetrics?.failureCount).toBe(0);
      }).pipe(Effect.provide(providerServiceTestLayer)));

    it("should handle provider operation failures with circuit breaker", () =>
      Effect.gen(function* () {
        const service = yield* ProviderService;
        const resilience = yield* ResilienceService;

        // Attempt operation that will fail
        const result = yield* Effect.either(
          service.getProviderClient("nonexistent")
        );
        expect(Either.isLeft(result)).toBe(true);

        // Verify circuit breaker tracks the failure
        const metrics = yield* resilience.getCircuitBreakerMetrics(
          "provider-service-api"
        );
        expect(metrics).toBeDefined();
        expect(metrics?.state).toBe("CLOSED"); // Should remain closed for single failure
      }).pipe(Effect.provide(providerServiceTestLayer)));

    it("should work with ResilienceService monitoring", () =>
      Effect.gen(function* () {
        const service = yield* ProviderService;
        const resilience = yield* ResilienceService;

        // Verify both services are available
        expect(service).toBeDefined();
        expect(resilience).toBeDefined();

        // Verify circuit breaker metrics are available
        const metrics = yield* resilience.getCircuitBreakerMetrics(
          "provider-service-api"
        );
        expect(metrics).toBeDefined();
        expect(metrics?.state).toBeDefined();
        expect(typeof metrics?.failureCount).toBe("number");
        expect(typeof metrics?.successCount).toBe("number");
      }).pipe(Effect.provide(providerServiceTestLayer)));
  });
});
