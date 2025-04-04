import { type SQLiteTableWithColumns, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Base row type for entities
 */
export type DrizzleRow = {
    id: string;
    data: string;
    createdAt: string;
    updatedAt: string;
};

/**
 * Base table type for storing entities
 */
export type DrizzleTable = ReturnType<typeof createEntityTable>;

/**
 * Creates a SQLite table for storing entities
 */
export const createEntityTable = (tableName: string) => sqliteTable(tableName, {
    id: text("id").primaryKey(),
    data: text("data").notNull(),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull()
});
