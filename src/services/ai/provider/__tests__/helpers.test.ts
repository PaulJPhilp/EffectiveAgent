import { describe, it, expect } from 'vitest';
import { loadConfigString, parseConfigJson } from '../helpers.js';
import { ProviderConfigError } from '../errors.js';
import { Effect, ConfigProvider } from 'effect';

// Mocks
const mockConfigString = '{"providers": [{"name": "openai"}]}' as const;
const mockConfigProvider = ConfigProvider.fromMap(new Map([
  ["providersConfigJsonString", mockConfigString]
]));

// Deeply searches all nested properties for a ProviderConfigError instance
function deepFindProviderConfigError(err: unknown, maxDepth = 10): boolean {
  if (!err || typeof err !== 'object' || maxDepth <= 0) return false;
  if (err instanceof ProviderConfigError) return true;
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
      try {
        await Effect.runPromise(effect);
        throw new Error('Should have thrown');
      } catch (err: any) {

        expect(deepFindProviderConfigError(err)).toBe(true);
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
      try {
        await Effect.runPromise(effect);
        throw new Error('Should have thrown');
      } catch (err: any) {
        expect(deepFindProviderConfigError(err)).toBe(true);
      }
    });
  });
});
