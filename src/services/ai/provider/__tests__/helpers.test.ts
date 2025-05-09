import { ProviderConfigError } from "@ai/provider/errors.js";
import { loadConfigString, parseConfigJson } from "@ai/provider/helpers.js";
import { ConfigProvider, Effect } from 'effect';
import { describe, expect, it } from 'vitest';

// Mocks
const mockConfigString = '{"providers": [{"name": "openai"}]}' as const;
const mockConfigProvider = ConfigProvider.fromMap(new Map([
  ["providersConfigJsonString", mockConfigString]
]));

// Deeply searches all nested properties for a ProviderConfigError instance
function deepFindProviderConfigError(err: unknown, maxDepth = 10): boolean {
  if (!err || typeof err !== 'object' || maxDepth <= 0) return false;
  if (err instanceof ProviderConfigError) return true;
  // Handle Effect errors which have a 'cause' property
  if ('cause' in err && err.cause) {
    if (deepFindProviderConfigError(err.cause, maxDepth - 1)) return true;
  }
  // Handle Effect errors which have a 'left' property (Either type)
  if ('left' in err && err.left) {
    if (deepFindProviderConfigError(err.left, maxDepth - 1)) return true;
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

describe('helpers.ts', () => {
  describe('loadConfigString', () => {
    it('loads config string successfully', async () => {
      const effect = loadConfigString(mockConfigProvider, 'testMethod');
      const result = await Effect.runPromise(effect);
      expect(result).toBe(mockConfigString);
    });

    it('returns ProviderConfigError if config is missing', async () => {
      // Use an empty provider with no config string
      const emptyProvider = ConfigProvider.fromMap(new Map());
      const effect = loadConfigString(emptyProvider, 'testMethod');
      const result = await Effect.runPromiseExit(effect);
      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        expect(result.cause._tag).toBe('Fail');
        if (result.cause._tag === 'Fail') {
          expect(result.cause.error).toBeInstanceOf(ProviderConfigError);
        }
      }
    });
  });

  describe('parseConfigJson', () => {
    it('parses valid JSON', async () => {
      const effect = parseConfigJson('{"foo":123}', 'testMethod');
      const result = await Effect.runPromise(effect);
      expect(result).toEqual({ foo: 123 });
    });

    it('returns ProviderConfigError on invalid JSON', async () => {
      const effect = parseConfigJson('not-json', 'testMethod');
      const exit = await Effect.runPromiseExit(effect);

      expect(exit._tag).toBe('Failure');
      if (exit._tag === 'Failure') {
        // deepFindProviderConfigError can inspect the Cause object directly
        expect(deepFindProviderConfigError(exit.cause)).toBe(true);
      }
    });
  });
});
