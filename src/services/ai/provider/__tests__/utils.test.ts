import path from "node:path";
import { ProviderServiceConfigError } from "@/services/ai/provider/errors.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { Effect } from 'effect';
import { describe, expect, it } from 'vitest';
import { ProviderService } from "../service.js";

describe('ProviderService Config Loading', () => {
  it('initializes successfully with valid config', () =>
    Effect.gen(function* () {
      const service = yield* ProviderService;
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
      const service = yield* ProviderService;

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
      const service = yield* ProviderService;

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
