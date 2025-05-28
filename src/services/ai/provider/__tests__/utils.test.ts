import { ProviderServiceConfigError } from "@/services/ai/provider/errors.js";
import { loadConfigString, parseConfigJson } from "@/services/ai/provider/utils.js";
import { ConfigurationServiceApi } from "@/services/core/configuration/api.js";
import { ConfigParseError, ConfigReadError, ConfigValidationError } from "@/services/core/configuration/errors.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { Effect, Layer } from 'effect';
import { describe, expect, it } from 'vitest';
import { ProviderService } from "../service.js";

import { ProviderServiceApi } from "../api.js";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import path from "node:path";

// Mocks
const mockConfigString = '{"providers": [{"name": "openai"}]}' as const;
const mockConfigService: ConfigurationServiceApi = {
  loadConfig: <T>() => Effect.fail(new ConfigReadError({ filePath: "test.json" })) as Effect.Effect<T, ConfigReadError, never>,
  readFile: (filePath: string) =>
    filePath === "./config/providers.json"
      ? Effect.succeed(mockConfigString)
      : Effect.fail(new ConfigReadError({ filePath })),
  parseJson: () => Effect.fail(new ConfigParseError({ filePath: "test.json" })),
  validateWithSchema: () => Effect.fail(new ConfigValidationError({ filePath: "test.json", validationError: {} as any })),
  loadProviderConfig: () => Effect.fail(new ConfigReadError({ filePath: "test.json" })),
  loadModelConfig: () => Effect.fail(new ConfigReadError({ filePath: "test.json" })),
  loadPolicyConfig: () => Effect.fail(new ConfigReadError({ filePath: "test.json" })),
};

// Deeply searches all nested properties for a ProviderServiceConfigError instance
function deepFindProviderConfigError(err: unknown, maxDepth = 10): boolean {
  if (!err || typeof err !== 'object' || maxDepth <= 0) return false;
  if (err instanceof ProviderServiceConfigError) return true;
  // Handle Effect errors which have a 'cause' property
  if ('cause' in err && err.cause) {
    if (deepFindProviderConfigError(err.cause, maxDepth - 1)) return true;
  }
  // Handle Effect errors which have a 'left' property (Either type)
  if ('left' in err && err.left) {
    if (deepFindProviderConfigError(err.left, maxDepth - 1)) return true;
  }
  // Handle Effect errors which have an 'error' property
  if ('error' in err && err.error) {
    if (deepFindProviderConfigError(err.error, maxDepth - 1)) return true;
  }
  // Check all string keys
  for (const key of Object.keys(err)) {
    // @ts-ignore
    if (deepFindProviderConfigError(err[key], maxDepth - 1)) return true;
  }
  // Check all symbol keys
  for (const sym of Object.getOwnPropertySymbols(err)) {
    // @ts-ignore
    if (deepFindProviderConfigError(err[sym], maxDepth - 1)) return true;
  }
  return false;
}

describe('ProviderService Config Loading', () => {
  const createTestService = () => Effect.gen(function* () {
    const service = yield* ProviderService;
    return service;
  });

  it('initializes successfully with valid config', () =>
    Effect.gen(function* () {
      const service = yield* createTestService();
      const client = yield* service.getProviderClient('openai');
      expect(client).toBeDefined();
    }).pipe(
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
    ));

  it('fails with ProviderServiceConfigError when config file is missing', () =>
    Effect.gen(function* () {
      process.env.PROVIDERS_CONFIG_PATH = path.resolve(__dirname, 'nonexistent.json');
      const service = yield* createTestService();
      
      try {
        yield* service.getProviderClient('openai');
        throw new Error('Expected error');
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderServiceConfigError);
      }
    }).pipe(
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
    ));

  it('fails with ProviderServiceConfigError when config is invalid JSON', () =>
    Effect.gen(function* () {
      // Create a temporary file with invalid JSON
      const tempPath = path.resolve(__dirname, 'invalid.json');
      const fs = yield* FileSystem.FileSystem;
      yield* fs.writeFile(tempPath, new TextEncoder().encode('not-json'));

      process.env.PROVIDERS_CONFIG_PATH = tempPath;
      const service = yield* createTestService();
      
      try {
        yield* service.getProviderClient('openai');
        throw new Error('Expected error');
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderServiceConfigError);
      } finally {
        // Clean up temp file
        yield* fs.remove(tempPath);
      }
    }).pipe(
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
    ));
});
