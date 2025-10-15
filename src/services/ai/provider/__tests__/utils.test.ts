import path from "node:path";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Either } from 'effect';
import { describe, expect, it } from 'vitest';
import { ProviderOperationError } from "@/services/ai/provider/errors.js";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { ProviderService } from "../service.js";

describe('ProviderService Config Loading', () => {
  it('initializes successfully with valid config', () =>
    Effect.gen(function* () {
      const service = yield* ProviderService;
      const result = yield* Effect.either(service.getProviderClient('openai'));
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(ProviderOperationError);
      }
    }).pipe(
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
    ));

  it('fails with ProviderOperationError when config file is missing', () =>
    Effect.gen(function* () {
      process.env.PROVIDERS_CONFIG_PATH = path.resolve(__dirname, 'nonexistent.json');
      const service = yield* ProviderService;

      const result = yield* Effect.either(service.getProviderClient('openai'));
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(ProviderOperationError);
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
      const service = yield* ProviderService;

      const result = yield* Effect.either(service.getProviderClient('openai'));
      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(ProviderOperationError);
      }

      // Clean up temp file
      yield* fs.remove(tempPath);
    }).pipe(
      Effect.provide(ProviderService.Default),
      Effect.provide(ConfigurationService.Default),
      Effect.provide(NodeFileSystem.layer)
    ));
});
