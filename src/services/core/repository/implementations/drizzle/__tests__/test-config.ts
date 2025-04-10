/**
 * @file Test configuration and helpers for drizzle repository tests
 * @module services/core/repository/implementations/drizzle/__tests__/test-config
 */

import { Config, Effect, Layer } from "effect";
import { DatabaseConfig, DatabaseConfigSchema, DrizzleClient, DrizzleClientLive } from "../config.js";

/**
 * Test database configuration
 * Uses environment variables with test-specific defaults
 */
export const TestDatabaseConfig = Config.all({
    host: Config.succeed("localhost"),
    port: Config.succeed(5432),
    database: Config.succeed("test_db"),
    user: Config.succeed("postgres"),
    password: Config.succeed("postgres"),
    ssl: Config.succeed(false)
});

/**
 * Layer that provides test database configuration
 */
export const TestConfigLayer = Layer.succeed(
    DatabaseConfig,
    {
        host: "localhost",
        port: 5432,
        database: "test_db",
        user: "postgres",
        password: "postgres",
        ssl: false
    } as DatabaseConfigSchema
);

/**
 * Layer that provides a configured DrizzleClient for tests
 */
export const TestDrizzleLayer = DrizzleClientLive.pipe(
    Layer.provide(TestConfigLayer)
);

/**
 * Helper to run a test effect with the test database layer
 */
export function runTestEffect<E, A>(effect: Effect.Effect<A, E, DrizzleClient>) {
    return Effect.runPromise(
        Effect.provide(effect, TestDrizzleLayer)
    );
}

/**
 * Helper to run a test effect that is expected to fail
 */
export function runFailTestEffect<E, A>(effect: Effect.Effect<A, E, DrizzleClient>) {
    return Effect.runPromise(
        Effect.provide(effect.pipe(Effect.flip), TestDrizzleLayer)
    );
} 