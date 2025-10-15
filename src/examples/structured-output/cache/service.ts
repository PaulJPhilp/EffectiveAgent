/**
 * @file Service implementation for CacheService
 * @module ea/pipelines/structured-output/cache/service
 */

import { createHash } from "node:crypto";
import { Effect, Layer, type Schema as S } from "effect";
import { CacheService, type CacheServiceApi } from "./contract.js";

/**
 * Creates an in-memory implementation of the CacheServiceApi.
 */
export function makeInMemoryCacheServiceImpl(): CacheServiceApi {
    const cache = new Map<string, unknown>();

    return {
        get: (key: string): Effect.Effect<unknown | undefined> =>
            Effect.sync(() => cache.get(key)),

        set: <T>(key: string, value: T): Effect.Effect<void> =>
            Effect.sync(() => {
                cache.set(key, value);
            }),

        generateKey: <T>(prompt: string, schema: S.Schema<T>): Effect.Effect<string> =>
            Effect.sync(() => {
                const hash = createHash("sha256");
                hash.update(prompt);
                hash.update(JSON.stringify(schema.ast));
                return hash.digest("hex");
            }),

        clear: (): Effect.Effect<void> =>
            Effect.sync(() => {
                cache.clear();
            }),

        invalidate: (key: string): Effect.Effect<void> =>
            Effect.sync(() => {
                cache.delete(key);
            }),
    };
}

const makeInMemoryCacheServiceEffect = Effect.succeed(makeInMemoryCacheServiceImpl());

/**
 * Live Layer for CacheService (using in-memory implementation).
 */
export const CacheServiceLiveLayer = Layer.effect(CacheService, makeInMemoryCacheServiceEffect);

/**
 * Test Layer for CacheService (also using in-memory implementation for this example).
 * For more complex scenarios, a more controlled mock might be needed.
 */
export const CacheServiceTestLayer = Layer.effect(CacheService, makeInMemoryCacheServiceEffect); 