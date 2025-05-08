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
 * Base interface that all configuration types must extend.
 * Ensures consistent properties across all configurations.
 */
export interface BaseConfig {
    readonly name: string;
    readonly version: string;
}

/**
 * Base schema that all configuration schemas must extend.
 * Provides validation for the base configuration properties.
 */
export class BaseConfigSchema extends S.Class<BaseConfigSchema>("BaseConfigSchema")({
    name: S.String,
    version: S.String
}) { }