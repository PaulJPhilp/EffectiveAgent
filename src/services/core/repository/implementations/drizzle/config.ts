/**
 * @file Configuration for drizzle-orm database connection
 * @module services/core/repository/implementations/drizzle/config
 */

import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import { Effect } from "effect";
import { Pool } from "pg";


// Environment variable names for database configuration
const {
    PG_HOST,
    PG_PORT,
    PG_DATABASE,
    PG_USER,
    PG_PASSWORD,
    PG_SSL
} = process.env as Record<string, string | undefined>;

// Utility to parse boolean safely
const toBoolean = (value: string | undefined): boolean => value === "true";



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
    // No external dependencies; configuration is read from environment variables at runtime.
    effect: Effect.sync(() => {
                // Build the connection pool from environment variables.
        const pool = new Pool({
            host: PG_HOST ?? "localhost",
            port: PG_PORT ? Number(PG_PORT) : 5432,
            database: PG_DATABASE ?? "postgres",
            user: PG_USER ?? "postgres",
            password: PG_PASSWORD ?? "postgres",
            ssl: toBoolean(PG_SSL)
        });

        // Create the drizzle client
        const client = drizzle(pool);

        return {
            getClient: () => Effect.succeed(client)
        };
    })
}) { }