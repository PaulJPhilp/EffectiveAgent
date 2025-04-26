/**
 * @file Scaffold for ProviderService integration tests using Effect VitestService.
 */

/**
 * @file Scaffold for ProviderService integration tests using effect/vitest.
 */

import { Effect } from "effect";
import { ProviderService } from "../service.js";
import { ProviderConfigError, ProviderNotFoundError } from "../errors.js";
import { ProviderFile } from "../schema.js";
import { createServiceTestHarness } from "@/services/core/test-utils/effect-test-harness.js";
import { expect, it, describe } from "@effect/vitest";

// Valid test config
const validConfig: ProviderFile = {
  name: "test-provider-config",
  description: "Test config for ProviderService",
  providers: [
    {
      name: "openai",
      displayName: "OpenAI",
      type: "llm",
      apiKeyEnvVar: "OPENAI_API_KEY",
      baseUrl: "https://api.openai.com/v1"
    }
  ]
};

// Invalid config (malformed or missing required fields)
const invalidConfig: any = {
  name: 123, // invalid type
  providers: "not-an-array"
};

// Test harness factories for ProviderService
const makeProviderService = (config: ProviderFile | any) =>
  Effect.succeed({
    load:
      typeof config.name !== "string" || !Array.isArray(config.providers)
        ? Effect.fail(
            new ProviderConfigError({
              description: "Invalid provider config",
              module: "ProviderService",
              method: "load"
            })
          )
        : Effect.succeed(config as ProviderFile),
    getProviderClient: (providerName: string) =>
      Array.isArray(config.providers) &&
      config.providers.some((p: any) => p.name === providerName)
        ? Effect.succeed({ name: providerName, client: {} })
        : Effect.fail(
            new ProviderNotFoundError({
              providerName,
              module: "ProviderService",
              method: "getProviderClient"
            })
          )
  });

// Test harness for valid config
const validHarness = createServiceTestHarness(
  ProviderService,
  () => makeProviderService(validConfig)
);

// Test harness for invalid config
const invalidHarness = createServiceTestHarness(
  ProviderService,
  () => makeProviderService(invalidConfig)
);

/**
 * @file Minimal working ProviderService test using @effect/vitest.
 */

describe("ProviderService", () => {
  it("loads a valid provider config", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* ProviderService;
      const loaded = yield* service.load;
      expect(loaded.name).toBe(validConfig.name);
      expect(loaded.providers.length).toBe(validConfig.providers.length);
      expect(loaded.providers[0].name).toBe(validConfig.providers[0].name);
    });
    await validHarness.runTest(effect);
  });

  it("throws on invalid provider config", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* ProviderService;
      const result = yield* Effect.either(service.load);
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        const error = result.left;
        expect(error).toBeInstanceOf(ProviderConfigError);
      }
    });
    await invalidHarness.runTest(effect);
  });

  it("returns a provider client for a valid provider name", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* ProviderService;
      const client = yield* service.getProviderClient("openai");
      expect(client).toBeDefined();
      // Optionally: check client properties or capabilities if needed
    });
    await validHarness.runTest(effect);
  });

  it("throws on unknown provider name", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* ProviderService;
      const result = yield* Effect.either(service.getProviderClient("nonexistent"));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        // Check for ProviderNotFoundError by class or name property
        expect(
          result.left.name === "ProviderNotFoundError" ||
          result.left.constructor.name === "ProviderNotFoundError"
        ).toBe(true);
      }
    });
    await validHarness.runTest(effect);
  });

  it("returns Left for empty provider name", async () => {
    const effect = Effect.gen(function* () {
      const service = yield* ProviderService;
      const result = yield* Effect.either(service.getProviderClient(""));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ProviderNotFoundError);
      }
    });
    await validHarness.runTest(effect);
  });

  it("handles config with empty providers array", async () => {
    const emptyProvidersConfig = { ...validConfig, providers: [] };
    const harness = createServiceTestHarness(
      ProviderService,
      () => makeProviderService(emptyProvidersConfig)
    );
    const effect = Effect.gen(function* () {
      const service = yield* ProviderService;
      const loaded = yield* service.load;
      expect(loaded.providers.length).toBe(0);
      const result = yield* Effect.either(service.getProviderClient("openai"));
      expect(result._tag).toBe("Left");
      if (result._tag === "Left") {
        expect(result.left).toBeInstanceOf(ProviderNotFoundError);
      }
    });
    await harness.runTest(effect);
  });

  it("handles config with duplicate provider names", async () => {
    const dupConfig = {
      ...validConfig,
      providers: [
        ...validConfig.providers,
        { ...validConfig.providers[0] }
      ]
    };
    const harness = createServiceTestHarness(
      ProviderService,
      () => makeProviderService(dupConfig)
    );
    const effect = Effect.gen(function* () {
      const service = yield* ProviderService;
      const loaded = yield* service.load;
      expect(loaded.providers.length).toBe(2);
      expect(loaded.providers[0].name).toBe(loaded.providers[1].name);
      const client = yield* service.getProviderClient("openai");
      expect(client).toBeDefined();
    });
    await harness.runTest(effect);
  });

  it("loads config with missing optional fields", async () => {
    const minimalConfig = {
      name: "minimal",
      providers: [
        { name: "openai", displayName: "OpenAI", type: "llm" }
      ]
    };
    const harness = createServiceTestHarness(
      ProviderService,
      () => makeProviderService(minimalConfig)
    );
    const effect = Effect.gen(function* () {
      const service = yield* ProviderService;
      const loaded = yield* service.load;
      expect(loaded.name).toBe("minimal");
      expect(loaded.providers[0].apiKeyEnvVar).toBeUndefined();
      expect(loaded.providers[0].baseUrl).toBeUndefined();
    });
    await harness.runTest(effect);
  });
});
