/**
 * @file Configuration for drizzle-orm database connection
 * @module services/core/repository/implementations/drizzle/config
 */

import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import { Config, Context, Effect, Layer } from "effect";
import { Pool } from "pg";

/**
 * Database configuration schema
 */
export interface DatabaseConfigSchema {
    readonly host: string;
    readonly port: number;
    readonly database: string;
    readonly user: string;
    readonly password: string;
    readonly ssl: boolean;
}

/**
 * Tag for database configuration
 */
export class DatabaseConfig extends Context.Tag("DatabaseConfig")<
    DatabaseConfig,
    DatabaseConfigSchema
>() { }

/**
 * Default database configuration
 */
export const DatabaseConfigLive = Layer.effect(
    DatabaseConfig,
    Effect.gen(function* () {
        return yield* Config.all({
            host: Config.string("DB_HOST"),
            port: Config.number("DB_PORT"),
            database: Config.string("DB_NAME"),
            user: Config.string("DB_USER"),
            password: Config.string("DB_PASSWORD"),
            ssl: Config.boolean("DB_SSL")
        });
    })
);

/**
 * Tag for the database client
 */
export class DrizzleClient extends Context.Tag("DrizzleClient")<
    DrizzleClient,
    NodePgDatabase
>() { }

/**
 * Creates a Layer that provides a configured DrizzleClient
 */
export const DrizzleClientLive = Layer.effect(
    DrizzleClient,
    Effect.gen(function* () {
        const config = yield* DatabaseConfig;

        // Create the connection pool
        const pool = new Pool({
            host: config.host,
            port: config.port,
            database: config.database,
            user: config.user,
            password: config.password,
            ssl: config.ssl
        });

        // Create and return the drizzle client
        return drizzle(pool);
    })
); 