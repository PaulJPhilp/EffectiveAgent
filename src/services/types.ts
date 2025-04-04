/**
 * @file Defines globally shared TypeScript types used across multiple services.
 */

import { Brand } from "effect"; // Optional: Use Brand for nominal typing if desired

// --- Basic Primitives ---

/** Represents a unique identifier, typically a string. */
export type Id = string;
// Example of branded type for stronger type checking (optional)
// export type ThreadId = Id & Brand.Brand<"ThreadId">;
// export type MessageId = Id & Brand.Brand<"MessageId">;
// export type FileId = Id & Brand.Brand<"FileId">;
// export type ArtifactId = Id & Brand.Brand<"ArtifactId">;

/** Represents common JSON-compatible types. */
export type Json =
    | string
    | number
    | boolean
    | null
    | readonly Json[]
    | { readonly [key: string]: Json | undefined };

/** Represents a JSON object. */
export type JsonObject = { readonly [key: string]: Json | undefined };

// --- Core Domain Types ---

/** Defines the possible roles in a chat conversation. */
export type ChatMessageRole = "user" | "assistant" | "system";
// Future roles: | "tool" | "function"

/**
 * Represents a single message within a conversation thread.
 * Designed to be extensible for future interactive components.
 */
export interface ChatMessage {
    /** Unique identifier for the message (consider if needed or generated on save). */
    readonly id: Id; // Or MessageId if using branding
    /** Identifier of the thread this message belongs to. */
    readonly threadId: Id; // Or ThreadId
    /** Timestamp of when the message was created or received. */
    readonly timestamp: number; // Using Unix timestamp (milliseconds) for simplicity
    /** The role of the entity that generated this message. */
    readonly role: ChatMessageRole;
    /** Text content of the message. Optional to allow for component-only messages later. */
    readonly content: string; // Keep simple for now, make optional later if needed

    // --- Placeholders for Future Extensions ---
    /** Optional: Structured data for rendering interactive UI components. */
    // readonly components?: ReadonlyArray<ComponentData>;
    /** Optional: Tool calls requested by the assistant. */
    // readonly toolCalls?: ReadonlyArray<ToolCall>;
    /** Optional: ID of the tool call this message is a result for (if role is 'tool'). */
    // readonly toolCallId?: Id;
    /** Optional: General-purpose metadata. */
    // readonly metadata?: JsonObject;
}

/** Placeholder for future interactive component data structure. */
// export interface ComponentData {
//   readonly componentType: string;
//   readonly data: JsonObject;
//   readonly componentId?: Id;
// }

/** Placeholder for future tool call structure. */
// export interface ToolCall {
//   readonly id: Id;
//   readonly type: "function"; // Currently only function calls common
//   readonly function: {
//     readonly name: string;
//     readonly arguments: string; // Usually a JSON string
//   };
// }
