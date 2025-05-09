/**
 * @file Utility functions for working with schemas in the ObjectService
 * @module services/ai/producers/object/schema-utils
 */

import { Schema as S } from "effect"

// Define base schemas first
export class Product extends S.Class<Product>("Product")({
    name: S.String,
    description: S.String,
    price: S.Number,
    inStock: S.Boolean
}) { }

export class Person extends S.Class<Person>("Person")({
    name: S.String,
    age: S.Number,
    email: S.optional(S.String)
}) { }

export class Metadata extends S.Class<Metadata>("Metadata")({
    key: S.String,
    value: S.Union(S.String, S.Number, S.Boolean, S.Null)
}) { }

export class Task extends S.Class<Task>("Task")({
    title: S.String,
    description: S.String,
    status: S.Literal("todo", "in-progress", "done"),
    priority: S.Literal("low", "medium", "high"),
    dueDate: S.optional(S.String),
    assignee: S.optional(S.String),
    tags: S.Array(S.String)
}) { }

export class ChatMessage extends S.Class<ChatMessage>("ChatMessage")({
    role: S.Literal("user", "assistant", "system"),
    content: S.String,
    timestamp: S.optional(S.String),
    id: S.optional(S.String)
}) { }

export class Address extends S.Class<Address>("Address")({
    street: S.String,
    city: S.String,
    state: S.String,
    zipCode: S.String,
    country: S.String
}) { }

// Define the Message schema using S.Class
export class MessageSchema extends S.Class<MessageSchema>("MessageSchema")({
    role: S.Literal("user", "assistant", "system"),
    content: S.String,
    timestamp: S.optional(S.String),
    id: S.optional(S.String)
}) { }

/**
 * Creates a schema for a list of items
 * @param itemSchema The schema for each item in the list
 * @returns A schema for a list of items
 */
export function createListSchema<T>(itemSchema: S.Schema<T>): S.Schema<ReadonlyArray<T>> {
    return S.Array(itemSchema)
}

/**
 * Creates a simple product schema with name, description, and price
 * @returns A schema for a product
 */
export function createProductSchema() {
    return Product
}

/**
 * Creates a person schema with name, age, and optional email
 * @returns A schema for a person
 */
export function createPersonSchema() {
    return Person
}

/**
 * Creates a schema for a metadata object with arbitrary key-value pairs
 * @returns A schema for metadata
 */
export function createMetadataSchema() {
    return Metadata
}

/**
 * Creates a schema for task data with title, description, status, and priority
 * @returns A schema for task data
 */
export function createTaskSchema() {
    return Task
}

/**
 * Creates a schema for a chat message
 * @returns A schema for a chat message
 */
export function createChatMessageSchema() {
    return ChatMessage
}

/**
 * Creates a schema for an address
 * @returns A schema for an address
 */
export function createAddressSchema() {
    return Address
}