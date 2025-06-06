/**
 * @file Migration helper script for drizzle-orm
 * @module services/core/repository/implementations/drizzle/migrate
 */

import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Effect } from "effect";
import { type DatabaseConfigData, DatabaseConfigLive, DrizzleClient, DrizzleClientLive } from "./config.js";

/**
 * Migration error type
 */
export class MigrationError extends Error {
    readonly _tag = "MigrationError";
    constructor(message: string, readonly cause?: unknown) {
        super(message);
        this.name = "MigrationError";
    }
}

/**
 * Runs all pending migrations
 */
export const runMigrations = Effect.gen(function* () {
    const client = yield* DrizzleClient;
    const dbClient = yield* client.getClient();

    yield* Effect.tryPromise({
        try: () => migrate(dbClient, {
            migrationsFolder: "./migrations"
        }),
        catch: (error) => new MigrationError("Failed to run migrations", error)
    });
}).pipe(
    Effect.catchAll((error) => Effect.fail(
        error instanceof MigrationError ? error : new MigrationError("Unexpected error during migration", error)
    ))
);

/**
 * Main migration program
 */
const program = Effect.gen(function* () {
    yield* Effect.log("Starting database migration...");

    yield* runMigrations;

    yield* Effect.log("Migration completed successfully");
}).pipe(
    Effect.provide(DrizzleClientLive),
    Effect.catchAll((error) =>
        Effect.gen(function* () {
            const message = error instanceof MigrationError
                ? error.message
                : "Unexpected error during migration";
            yield* Effect.logError(message);
            return yield* Effect.fail(error);
        })
    )
);

// Only run if this is the main module
if (import.meta.url === new URL(import.meta.url).href) {
    const config: DatabaseConfigData = {
        host: process.env["DB_HOST"] ?? "localhost",
        port: Number(process.env["DB_PORT"] ?? 5432),
        database: process.env["DB_NAME"] ?? "postgres",
        user: process.env["DB_USER"] ?? "postgres",
        password: process.env["DB_PASSWORD"] ?? "postgres",
        ssl: process.env["DB_SSL"] === "true"
    };

    Effect.runPromise(program.pipe(
        Effect.provide(DatabaseConfigLive(config)),
        Effect.catchAll((error) => Effect.sync(() => {
            console.error(error);
            process.exit(1);
        }))
    ));
} 