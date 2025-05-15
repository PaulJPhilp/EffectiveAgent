/**
 * @file Contract for CacheService
 * @module ea/pipelines/structured-output/cache/contract
 */

import * as S from "@effect/schema/Schema";
import { Effect } from "effect";

/**
 * API for a caching service.
 */
export interface CacheServiceApi {
    readonly get: (key: string) => Effect.Effect<unknown | undefined>; // Allow undefined if not found
    readonly set: <T>(key: string, value: T) => Effect.Effect<void>;
    readonly generateKey: <T>(prompt: string, schema: S.Schema<T>) => Effect.Effect<string>;
    readonly clear: () => Effect.Effect<void>;
    readonly invalidate: (key: string) => Effect.Effect<void>;
}

/**
 * CacheService Effect Service.
 */
export abstract class CacheService extends Effect.Service<CacheServiceApi>()(
    "CacheService",
    {
        // Minimal default implementation
        get: (key: string) => Effect.succeed(undefined),
        set: <T>(key: string, value: T) => Effect.void,
        generateKey: <T>(prompt: string, schema: S.Schema<T>) => Effect.succeed("default-key"),
        clear: () => Effect.void,
        invalidate: (key: string) => Effect.void,
    }
) { } 