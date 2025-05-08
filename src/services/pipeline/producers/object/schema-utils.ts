/**
 * @file Utility functions for working with schemas in the ObjectService
 * @module services/ai/producers/object/schema-utils
 */

import { Schema } from "effect";

/**
 * Creates a schema for a list of items
 * @param itemSchema The schema for each item in the list
 * @returns A schema for a list of items
 */
export function createListSchema<T>(itemSchema: Schema<T>): Schema<ReadonlyArray<T>> {
    return Schema.Array(itemSchema);
}

/**
 * Creates a simple product schema with name, description, and price
 * @returns A schema for a product
 */
export function createProductSchema() {
    return Schema.Class<Product>("Product")({
        name: Schema.String,
        description: Schema.String,
        price: Schema.Number,
        inStock: Schema.Boolean
    });
}

/**
 * Creates a person schema with name, age, and optional email
 * @returns A schema for a person
 */
export function createPersonSchema() {
    return Schema.Class<Person>("Person")({
        name: Schema.String,
        age: Schema.Number,
        email: Schema.String.pipe(Schema.optional)
    });
}

/**
 * Creates a schema for a metadata object with arbitrary key-value pairs
 * @returns A schema for metadata
 */
export function createMetadataSchema() {
    return Schema.Class<Metadata>("Metadata")({
        key: Schema.String,
        value: Schema.Union(Schema.String, Schema.Number, Schema.Boolean, Schema.Null)
    });
}

/**
 * Creates a schema for task data with title, description, status, and priority
 * @returns A schema for task data
 */
export function createTaskSchema() {
    const TaskStatus = Schema.Literal("todo", "in-progress", "done");
    const TaskPriority = Schema.Literal("low", "medium", "high");

    return Schema.Class<Task>("Task")({
        title: Schema.String,
        description: Schema.String,
        status: TaskStatus,
        priority: TaskPriority,
        dueDate: Schema.String.pipe(Schema.optional),
        assignee: Schema.String.pipe(Schema.optional),
        tags: Schema.Array(Schema.String)
    });
}

/**
 * Creates a schema for a chat message
 * @returns A schema for a chat message
 */
export function createChatMessageSchema() {
    const Role = Schema.Literal("user", "assistant", "system");

    return Schema.Class<ChatMessage>("ChatMessage")({
        role: Role,
        content: Schema.String,
        timestamp: Schema.String.pipe(Schema.optional),
        id: Schema.String.pipe(Schema.optional)
    });
}

/**
 * Creates a schema for an address
 * @returns A schema for an address
 */
export function createAddressSchema() {
    return Schema.Class<Address>("Address")({
        street: Schema.String,
        city: Schema.String,
        state: Schema.String,
        zipCode: Schema.String,
        country: Schema.String
    });
}