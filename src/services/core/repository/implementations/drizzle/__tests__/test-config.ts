import { Effect } from "effect";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import type { JsonObject, JsonValue } from "@/types.js";
import { DrizzleClient, type DrizzleClientApi } from "../config.js";

/* ---------------------------------------------------------------------------
 * Connection configuration (Docker local Postgres)
 * --------------------------------------------------------------------------*/

const testConfig = {
  host: "localhost",
  port: 5432,
  database: "pg-test",
  user: "postgres",
  password: "postgres",
  ssl: false
};

/* ---------------------------------------------------------------------------
 * Ensure database exists (one-off at module load)
 * --------------------------------------------------------------------------*/

await (async () => {
  const admin = new Pool({ ...testConfig, database: "postgres" });
  const { rowCount } = await admin.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [testConfig.database]
  );
  if (rowCount === 0) {
    await admin.query(`CREATE DATABASE "${testConfig.database}"`);
  }
  await admin.end();
})();

/* ---------------------------------------------------------------------------
 * Drizzle client wired for tests
 * --------------------------------------------------------------------------*/

const testDb = drizzle(new Pool(testConfig));

const testClient: DrizzleClientApi = {
  getClient: () => Effect.succeed(testDb)
};

/* ---------------------------------------------------------------------------
 * Helper to inject DrizzleClient into any Effect under test
 * --------------------------------------------------------------------------*/

export const withTestDatabase = <E, A>(
  eff: Effect.Effect<A, E, DrizzleClientApi>
): Effect.Effect<A, E> => eff.pipe(Effect.provideService(DrizzleClient, testClient));

/* ---------------------------------------------------------------------------
 * Test table schema
 * --------------------------------------------------------------------------*/

export const testTable = pgTable("test_entities", {
  id: text("id").primaryKey(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull()
});

/* ---------------------------------------------------------------------------
 * Lifecycle helpers for the test table
 * --------------------------------------------------------------------------*/

export const createTestTable = (tableName: string) =>
  Effect.gen(function* () {
    const client = yield* DrizzleClient;
    const db = yield* client.getClient();
    yield* Effect.tryPromise(() =>
      db.execute(sql`
        CREATE TABLE IF NOT EXISTS ${sql.identifier(tableName)} (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )`)
    );
  });

export const cleanTestTable = (tableName: string) =>
  Effect.gen(function* () {
    const client = yield* DrizzleClient;
    const db = yield* client.getClient();
    yield* Effect.tryPromise(() => db.execute(sql`TRUNCATE TABLE ${sql.identifier(tableName)}`));
  });

export const dropTestTable = (tableName: string) =>
  Effect.gen(function* () {
    const client = yield* DrizzleClient;
    const db = yield* client.getClient();
    yield* Effect.tryPromise(() =>
      db.execute(sql`DROP TABLE IF EXISTS ${sql.identifier(tableName)}`)
    );
  });

/* ---------------------------------------------------------------------------
 * Test entity data type
 * --------------------------------------------------------------------------*/

export interface TestEntityData extends JsonObject {
  name: string;
  value: number;
  [key: string]: JsonValue;
}
