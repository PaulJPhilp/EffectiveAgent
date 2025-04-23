/**
 * @file Utility functions for working with schemas in the ObjectService
 * @module services/ai/producers/object/schema-utils
 */

import { Schema as S } from "effect";

/**
 * Creates a schema for a list of items
 * @param itemSchema The schema for each item in the list
 * @returns A schema for a list of items
 */
export function createListSchema<T>(itemSchema: S.Schema<T>): S.Schema<ReadonlyArray<T>> {
    return S.Array(itemSchema);
}

/**
 * Creates a simple product schema with name, description, and price
 * @returns A schema for a product
 */
export function createProductSchema() {
    return S.Struct({
        name: S.String,
        description: S.String,
        price: S.Number,
        inStock: S.Boolean
    });
}

/**
 * Creates a person schema with name, age, and optional email
 * @returns A schema for a person
 */
export function createPersonSchema() {
    return S.Struct({
        name: S.String,
        age: S.Number,
        email: S.String.pipe(S.optional)
    });
}

/**
 * Creates a schema for a metadata object with arbitrary key-value pairs
 * @returns A schema for metadata
 */
export function createMetadataSchema() {
    return S.Record({ key: S.String, value: S.Union(S.String, S.Number, S.Boolean, S.Null) });
}

/**
 * Creates a schema for task data with title, description, status, and priority
 * @returns A schema for task data
 */
export function createTaskSchema() {
    const TaskStatusSchema = S.Literal("todo", "in-progress", "done");
    const TaskPrioritySchema = S.Literal("low", "medium", "high");

    return S.Struct({
        title: S.String,
        description: S.String,
        status: TaskStatusSchema,
        priority: TaskPrioritySchema,
        dueDate: S.optional(S.String),
        assignee: S.optional(S.String),
        tags: S.Array(S.String)
    });
}

/**
 * Creates a schema for a chat message
 * @returns A schema for a chat message
 */
export function createChatMessageSchema() {
    const RoleSchema = S.Literal("user", "assistant", "system");

    return S.Struct({
        role: RoleSchema,
        content: S.String,
        timestamp: S.optional(S.String),
        id: S.optional(S.String)
    });
}

/**
 * Creates a schema for an address
 * @returns A schema for an address
 */
export function createAddressSchema() {
    return S.Struct({
        street: S.String,
        city: S.String,
        state: S.String,
        zipCode: S.String,
        country: S.String
    });
}