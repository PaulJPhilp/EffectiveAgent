/**
 * @file Test setup and teardown functions for drizzle repository tests
 * @module services/core/repository/implementations/drizzle/__tests__/setup
 */

import { sql } from "drizzle-orm";
import { Effect } from "effect";
import { DrizzleClient } from "../config.js";
import { createBaseMigrationSql } from "../schema.js";
import { runTestEffect } from "./test-config.js";

/**
 * Creates a test table for a given entity type
 */
export async function createTestTable(tableName: string) {
    const effect = Effect.gen(function* () {
        const client = yield* DrizzleClient;
        const migrationSql = createBaseMigrationSql(tableName);

        yield* Effect.tryPromise({
            try: () => client.execute(sql.raw(migrationSql)),
            catch: (error) => new Error(`Failed to create test table: ${error}`)
        });
    });

    await runTestEffect(effect);
}

/**
 * Drops a test table
 */
export async function dropTestTable(tableName: string) {
    const effect = Effect.gen(function* () {
        const client = yield* DrizzleClient;

        yield* Effect.tryPromise({
            try: () => client.execute(sql.raw(`DROP TABLE IF EXISTS ${tableName} CASCADE`)),
            catch: (error) => new Error(`Failed to drop test table: ${error}`)
        });
    });

    await runTestEffect(effect);
}

/**
 * Cleans all data from a test table without dropping it
 */
export async function cleanTestTable(tableName: string) {
    const effect = Effect.gen(function* () {
        const client = yield* DrizzleClient;

        yield* Effect.tryPromise({
            try: () => client.execute(sql.raw(`TRUNCATE TABLE ${tableName} CASCADE`)),
            catch: (error) => new Error(`Failed to clean test table: ${error}`)
        });
    });

    await runTestEffect(effect);
} 