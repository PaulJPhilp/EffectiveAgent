/**
 * @file Base schema types for drizzle repository
 * @module services/core/repository/implementations/drizzle/schema
 */

import type { JsonObject } from "@/types.js";
import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

/**
 * Creates a base table schema for an entity type
 */
export const createBaseTable = <TData extends JsonObject>(tableName: string) => 
    pgTable(tableName, {
        id: text("id").primaryKey(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
        data: jsonb("data").notNull()
    });

/**
 * Base table type for drizzle repository
 */
export type BaseTable<TData extends JsonObject> = ReturnType<typeof createBaseTable<TData>>;

/**
 * Base model type for drizzle repository
 */
export type BaseModel<TData extends JsonObject> = {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    data: TData;
};
