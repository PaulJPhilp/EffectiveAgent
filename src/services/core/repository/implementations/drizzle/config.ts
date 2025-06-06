/**
 * @file Configuration for drizzle-orm database connection
 * @module services/core/repository/implementations/drizzle/config
 */

import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import { Context, Effect, Layer, Schema } from "effect";
import { Pool } from "pg";

/**
 * Schema for database configuration
 */
export const DatabaseConfigSchema = Schema.Struct({
    host: Schema.String,
    port: Schema.Number,
    database: Schema.String,
    user: Schema.String,
    password: Schema.String,
    ssl: Schema.Boolean
});

export type DatabaseConfigData = Schema.Schema.Type<typeof DatabaseConfigSchema>;

/**
 * Tag for the database configuration data.
 */
export const DatabaseConfig = Context.GenericTag<DatabaseConfigData>("DatabaseConfig");

/**
 * Service for database client
 */
export interface DrizzleClientApi {
    readonly getClient: () => Effect.Effect<NodePgDatabase>;
}

/**
 * Implementation of the DrizzleClient service
 */
export class DrizzleClient extends Effect.Service<DrizzleClientApi>()("DrizzleClient", {
    effect: Effect.gen(function* () {
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

        // Create the drizzle client
        const client = drizzle(pool);

        return {
            getClient: () => Effect.succeed(client)
        };
    })
}) { }

/**
 * Layer for providing the DatabaseConfig service with configuration
 */
export const DatabaseConfigLive = (config: DatabaseConfigData) =>
    Layer.succeed(DatabaseConfig, config);

/**
 * Layer for providing the DrizzleClient service
 */
export const DrizzleClientLive = DrizzleClient.Default; 