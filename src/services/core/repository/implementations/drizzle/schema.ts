/**
 * @file Defines the drizzle schema for the repository implementation
 * @module services/core/repository/implementations/drizzle/schema
 */

import type { ImportedType } from "@/types.js";
import { type PgTableWithColumns, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export interface BaseModel<TData extends JsonObject> {
    id: EntityId;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    data: TData;
}

export type BaseTable<TData extends JsonObject> = PgTableWithColumns<any>;

export function createBaseTableSchema<TData extends JsonObject>(tableName: string) {
    return pgTable(tableName, {
        id: text("id").primaryKey().$type<EntityId>(),
        createdAt: timestamp("created_at", { mode: "string" }).$type<Timestamp>().notNull(),
        updatedAt: timestamp("updated_at", { mode: "string" }).$type<Timestamp>().notNull(),
        data: jsonb("data").$type<TData>().notNull()
    });
}

export function createBaseMigrationSql(tableName: string): string {
    return `
        CREATE TABLE IF NOT EXISTS ${tableName} (
            id TEXT PRIMARY KEY,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL,
            data JSONB NOT NULL
        );
        
        -- Index on id for faster lookups
        CREATE INDEX IF NOT EXISTS idx_${tableName}_id ON ${tableName}(id);
        
        -- Index on timestamps for sorting/filtering
        CREATE INDEX IF NOT EXISTS idx_${tableName}_created_at ON ${tableName}(created_at);
        CREATE INDEX IF NOT EXISTS idx_${tableName}_updated_at ON ${tableName}(updated_at);
        
        -- GIN index on data for faster JSONB queries
        CREATE INDEX IF NOT EXISTS idx_${tableName}_data ON ${tableName} USING GIN (data);
    `;
} 