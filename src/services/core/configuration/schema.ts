/**
 * @file Core configuration schemas used across services
 */

import { Schema as S } from "effect";

/**
 * Schema for environment configuration
 */
export class EnvironmentConfig extends S.Class<EnvironmentConfig>("EnvironmentConfig")({
    nodeEnv: S.Union(
        S.Literal("development"),
        S.Literal("test"),
        S.Literal("production")
    ).pipe(S.optional),
    logLevel: S.Union(
        S.Literal("debug"),
        S.Literal("info"),
        S.Literal("warn"),
        S.Literal("error")
    ).pipe(S.optional),
    isDebug: S.Boolean.pipe(S.optional)
}) { }

/**
 * Base configuration schema.
 * All config files must extend this base schema.
 */
export class BaseConfig extends S.Class<BaseConfig>("BaseConfig")({
    name: S.String.pipe(S.minLength(1)),
    description: S.String.pipe(S.optional),
    version: S.String.pipe(S.minLength(1)),
    tags: S.Array(S.String).pipe(S.withDefault([]))
}) { }