/**
 * @file Utility functions for the completion service
 * @module services/ai/producers/chat/utils
 */
import { TextPart } from "@/schema.js";
import { Chunk, Effect } from "effect";
/**
 * Extracts text content from a message's parts.
 * @param msg The message to extract text from
 * @returns The concatenated text content
 */
export function extractTextFromMessage(msg) {
    return Chunk.reduce(msg.parts, "", (acc, part) => {
        if (part instanceof TextPart) {
            return acc + part.content;
        }
        return acc;
    });
}
/**
 * Maps a message to a core message format.
 * @param msg The message to map
 * @returns The mapped core message
 */
export function mapMessageToCoreMessage(msg) {
    return Effect.gen(function* () {
        let textContent = "";
        if (msg.parts && Chunk.isChunk(msg.parts)) {
            textContent = Chunk.reduce(msg.parts, "", (acc, part) => {
                if (part instanceof TextPart) {
                    return acc + part.content;
                }
                return acc;
            });
        }
        else {
            yield* Effect.logWarning("Message parts are missing or not a Chunk");
        }
        if (msg.role === "user") {
            return { role: "user", content: textContent };
        }
        if (msg.role === "model" || msg.role === "assistant") {
            return { role: "assistant", content: textContent };
        }
        yield* Effect.logWarning(`Unsupported message role for CoreMessage mapping: ${String(msg.role)}`);
        return null;
    });
}
/**
 * Maps an array of Effect messages to client core messages.
 * @param messages The messages to map
 * @returns The mapped core messages
 */
export function mapEffectMessagesToClientCoreMessages(messages) {
    return Effect.gen(function* () {
        const mappedMessages = [];
        for (const msg of Chunk.toReadonlyArray(messages)) {
            const mapped = yield* mapMessageToCoreMessage(msg);
            if (mapped) {
                mappedMessages.push(mapped);
            }
        }
        return mappedMessages;
    });
}
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
export function spreadArray(to, from, pack) {
    const result = [...to];
    if (pack || arguments.length === 2) {
        const fromArray = Array.from(from);
        return result.concat(fromArray);
    }
    return result.concat(from);
}
//# sourceMappingURL=utils.js.map