/**
 * @file Test schema for drizzle repository tests
 * @module services/core/repository/implementations/drizzle/test-schema
 */

import { BaseEntity } from "@/services/core/repository/types.js";
import type { ImportedType } from "@/types.js";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export interface TestEntityData extends JsonObject {
    name: string;
    value: number;
}

export type TestEntity = BaseEntity<TestEntityData>;

export const testTable = pgTable("test_entities", {
    id: text("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    data: jsonb("data").notNull()
});

export type TestModel = typeof testTable.$inferSelect; 