/**
 * @file Utility functions for the completion service
 * @module services/ai/producers/chat/utils
 */
import { Message } from "@/schema.js";
import { Chunk, Effect } from "effect";
/** Core message format for chat interactions */
export interface CoreMessage {
    role: "user" | "assistant";
    content: string;
}
/**
 * Extracts text content from a message's parts.
 * @param msg The message to extract text from
 * @returns The concatenated text content
 */
export declare function extractTextFromMessage(msg: Message): string;
/**
 * Maps a message to a core message format.
 * @param msg The message to map
 * @returns The mapped core message
 */
export declare function mapMessageToCoreMessage(msg: Message): Effect.Effect<CoreMessage | null>;
/**
 * Maps an array of Effect messages to client core messages.
 * @param messages The messages to map
 * @returns The mapped core messages
 */
export declare function mapEffectMessagesToClientCoreMessages(messages: Chunk.Chunk<Message>): Effect.Effect<CoreMessage[]>;
/**
 * Utility functions for chat producer service
 */
/**
 * Spreads array elements into a new array with type safety
 * @param to Target array
 * @param from Source array
 * @param pack Whether to pack sparse arrays
 * @returns New array with spread elements
 */
export declare function spreadArray<T>(to: readonly T[], from: readonly T[], pack?: boolean): T[];
//# sourceMappingURL=utils.d.ts.map