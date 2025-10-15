/**
 * @file Contract for CacheService
 * @module ea/pipelines/structured-output/cache/contract
 */

import { Effect, type Schema } from "effect";

/**
 * API for a caching service.
 */
export interface CacheServiceApi {
    readonly get: (key: string) => Effect.Effect< undefined | unknown>;
    readonly set: <T>(key: string, value: T) => Effect.Effect<void>;
    readonly generateKey: <T>(prompt: string, schema: Schema.Schema<T>) => Effect.Effect<string>;
    readonly clear: () => Effect.Effect<void>;
    readonly invalidate: (key: string) => Effect.Effect<void>;
}



export class CacheService extends Effect.Service<CacheServiceApi>()(
    "CacheService",
    {
        effect: Effect.gen(function* () {
            return {
                get: (_key: string) => Effect.succeed<undefined | unknown>(undefined),
                set: <T>(_key: string, _value: T) => Effect.succeed(void 0),
                generateKey: <T>(_prompt: string, _schema: Schema.Schema<T>) => Effect.succeed("default-key"),
                clear: () => Effect.succeed(void 0),
                invalidate: (_key: string) => Effect.succeed(void 0)
            }
        })
    }
) {}