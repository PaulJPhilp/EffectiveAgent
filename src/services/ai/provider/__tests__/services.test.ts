/**
 * @file Provider service integration tests
 */

import path from "path";
import { Effect, Either } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { FileSystem, Path } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import {
  ProviderNotFoundError,
  ProviderServiceConfigError
} from "../errors.js";
import { ProviderService } from "../service.js";

// Path to the main providers.json for most tests
const PROVIDERS_CONFIG_FILENAME = "providers.json";
let mainProvidersConfigPath: string;

beforeAll(() => {
  mainProvidersConfigPath = path.resolve(
    __dirname,
    "../../../../../config",
    PROVIDERS_CONFIG_FILENAME
  );
  process.env.PROVIDERS_CONFIG_PATH = mainProvidersConfigPath;
});

describe("ProviderService", () => {
  it("should load provider configuration successfully from default path", () =>
    Effect.gen(function* () {
      const service = yield* ProviderService;
      const client = yield* service.getProviderClient("openai");
      expect(client).toBeDefined();
      expect(typeof client.getCapabilities).toBe("function");
    }).pipe(
      Effect.provide(ProviderService.Default),
      Effect.provide(NodeFileSystem.layer)
    )
  );

  it("should get a provider client for a valid provider (OpenAI)", () =>
    Effect.gen(function* () {
      if (!process.env.OPENAI_API_KEY) {
        console.warn(
          "Skipping OpenAI client test: OPENAI_API_KEY not set. Please set this environment variable."
        );
        return;
      }

      const service = yield* ProviderService;
      const clientEither = yield* Effect.either(
        service.getProviderClient("openai")
      );

      if (Either.isLeft(clientEither)) {
        console.error("OpenAI client error:", clientEither.left);
        throw new Error(
          `Expected OpenAI client, got error: ${JSON.stringify(clientEither.left)}`
        );
      }

      const client = clientEither.right;
      expect(client).toBeDefined();
      const capabilities = yield* client.getCapabilities();
      expect(Array.from(capabilities)).toContain("chat");
    }).pipe(
      Effect.provide(ProviderService.Default),
      Effect.provide(NodeFileSystem.layer)
    )
  );

  it("should fail with ProviderNotFoundError for an unknown provider", () =>
    Effect.gen(function* () {
      const service = yield* ProviderService;
      const clientEither = yield* Effect.either(
        service.getProviderClient("nonexistent-provider")
      );

      expect(Either.isLeft(clientEither)).toBe(true);
      if (Either.isLeft(clientEither)) {
        expect(clientEither.left).toBeInstanceOf(ProviderNotFoundError);
      }
    }).pipe(
      Effect.provide(ProviderService.Default),
      Effect.provide(NodeFileSystem.layer)
    )
  );

  describe("API Key Configuration Tests", () => {
    const testProviderName = "test-missing-key-provider";
    const tempConfigDir = path.join(__dirname, "temp_provider_config_dir");
    const tempConfigPath = path.join(tempConfigDir, "temp-providers.json");
    let originalProvidersConfigPath: string | undefined;

    beforeAll(() => {
      originalProvidersConfigPath = process.env.PROVIDERS_CONFIG_PATH;
    });

    afterAll(() => {
      if (originalProvidersConfigPath) {
        process.env.PROVIDERS_CONFIG_PATH = originalProvidersConfigPath;
      } else {
        // biome-ignore lint/performance/noDelete: <explanation>
        delete process.env.PROVIDERS_CONFIG_PATH;
      }
    });

    it("should fail with ProviderServiceConfigError for a provider with unset API key env var", () => {
      const testConfigContent = {
        name: "Temporary Test Config for Missing Key",
        description: "Config for testing provider with unset API key env var",
        providers: [
          {
            name: testProviderName,
            displayName: "Test Missing Key Provider",
            type: "llm",
            apiKeyEnvVar: "THIS_API_KEY_SHOULD_NEVER_BE_SET_IN_ENV",
            baseUrl: "https://api.example.com/v1",
            capabilities: ["chat"]
          }
        ]
      };

      return Effect.gen(function* () {
        // Setup
        const fs = yield* FileSystem.FileSystem;
        const pathSvc = yield* Path.Path;
        yield* fs.makeDirectory(pathSvc.dirname(tempConfigPath), { recursive: true });
        yield* fs.writeFileString(tempConfigPath, JSON.stringify(testConfigContent, null, 2));

        yield* Effect.sync(() => {
          process.env.PROVIDERS_CONFIG_PATH = tempConfigPath;
        });

        // Test
        const service = yield* ProviderService;
        const clientEither = yield* Effect.either(
          service.getProviderClient(testProviderName)
        );

        // Assert
        expect(Either.isLeft(clientEither)).toBe(true);
        if (Either.isLeft(clientEither)) {
          expect(clientEither.left).toBeInstanceOf(ProviderServiceConfigError);
          const error = clientEither.left as ProviderServiceConfigError;
          expect(error.description).toContain("API key not found in environment");
        }

        // Cleanup
        yield* fs.remove(tempConfigPath).pipe(
          Effect.catchAll((error) => Effect.logDebug("Ignored cleanup error: " + JSON.stringify(error)))
        );
      }).pipe(
        Effect.provide(ProviderService.Default),
        Effect.provide(NodeFileSystem.layer)
      );
    });
  });
});
