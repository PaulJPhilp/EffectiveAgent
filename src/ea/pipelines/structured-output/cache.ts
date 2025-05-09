/**
 * @file Cache service for the StructuredOutputPipeline
 * @module ea/pipelines/structured-output/cache
 */

import { createHash } from "crypto";
import * as S from "@effect/schema/Schema";
import { Effect, Layer } from "effect";

/**
 * Cache service for storing and retrieving structured output results
 */
export interface CacheServiceApi {
    readonly _tag: "CacheService";
    readonly get: (key: string) => Effect.Effect<unknown>;
    readonly set: <T>(key: string, value: T) => Effect.Effect<void>;
    readonly generateKey: <T>(prompt: string, schema: S.Schema<T>) => Effect.Effect<string>;
    readonly clear: () => Effect.Effect<void>;
    readonly invalidate: (key: string) => Effect.Effect<void>;
}

/**
 * Tag for the CacheService
 */
export class CacheService extends Effect.Tag("CacheService")<
    CacheService,
    CacheServiceApi
>() { }

/**
 * In-memory implementation of the CacheService
 */
class InMemoryCacheService implements CacheServiceApi {
    readonly _tag = "CacheService";
    private readonly cache = new Map<string, unknown>();

    get = (key: string): Effect.Effect<unknown> =>
        Effect.sync(() => this.cache.get(key));

    set = <T>(key: string, value: T): Effect.Effect<void> =>
        Effect.sync(() => {
            this.cache.set(key, value);
        });

    generateKey = <T>(prompt: string, schema: S.Schema<T>): Effect.Effect<string> =>
        Effect.sync(() => {
            const hash = createHash("sha256");
            hash.update(prompt);
            hash.update(JSON.stringify(schema));
            return hash.digest("hex");
        });

    clear = (): Effect.Effect<void> =>
        Effect.sync(() => {
            this.cache.clear();
        });

    invalidate = (key: string): Effect.Effect<void> =>
        Effect.sync(() => {
            this.cache.delete(key);
        });
}

/**
 * Default in-memory implementation of the CacheService
 */
export const InMemoryCacheServiceLayer = Layer.succeed(
    CacheService,
    new InMemoryCacheService()
)