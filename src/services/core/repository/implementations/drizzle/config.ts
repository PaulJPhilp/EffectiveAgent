/**
 * @file Configuration for drizzle-orm database connection
 * @module services/core/repository/implementations/drizzle/config
 */

import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import { Effect, Layer } from "effect";
import { Pool } from "pg";
import type { DatabaseConfigSchema } from "./schema.js";

/**
 * Service for database configuration
 */
export interface DatabaseConfigApi {
    readonly getConfig: () => Effect.Effect<DatabaseConfigSchema>;
}

/**
 * Implementation of the DatabaseConfig service
 */
export class DatabaseConfig extends Effect.Service<DatabaseConfigApi>() {
    static readonly Tag = DatabaseConfig.Tag;
}

/**
 * Factory function for creating DatabaseConfig service instances
 */
export const make = (config: DatabaseConfigSchema): Effect.Effect<DatabaseConfigApi> =>
    Effect.gen(function* () {
        return {
            getConfig: () => Effect.succeed(config)
        };
    });

/**
 * Layer for providing the DatabaseConfig service
 */
export const DatabaseConfigLive = (config: DatabaseConfigSchema) =>
    Layer.effect(
        DatabaseConfig,
        make(config)
    );

/**
 * Service for database client
 */
export interface DrizzleClientApi {
    readonly getClient: () => Effect.Effect<NodePgDatabase>;
}

/**
 * Implementation of the DrizzleClient service
 */
export class DrizzleClient extends Effect.Service<DrizzleClientApi>() {
    static readonly Tag = DrizzleClient.Tag;
}

/**
 * Factory function for creating DrizzleClient service instances
 */
export const makeClient = Effect.gen(function* () {
    const dbConfig = yield* DatabaseConfig;
    const config = yield* dbConfig.getConfig();

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
});

/**
 * Layer for providing the DrizzleClient service
 */
export const DrizzleClientLive = Layer.effect(
    DrizzleClient,
    makeClient
); 