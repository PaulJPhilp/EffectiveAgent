/**
 * @file Utility functions for the completion service
 * @module services/ai/producers/chat/utils
 */

import { Message, Model, TextPart, User, UserWithName } from "@/services/ai/input/schema.js"
import { Chunk, Effect } from "effect"

/** Core message format for chat interactions */
export interface CoreMessage {
    role: "user" | "assistant"
    content: string
}

/**
 * Extracts text content from a message's parts.
 * @param msg The message to extract text from
 * @returns The concatenated text content
 */
export function extractTextFromMessage(msg: Message): string {
    return Chunk.reduce(msg.parts, "", (acc, part) => {
        if (part instanceof TextPart) {
            return acc + part.content
        }
        return acc
    })
}

/**
 * Maps a message to a core message format.
 * @param msg The message to map
 * @returns The mapped core message
 */
export function mapMessageToCoreMessage(msg: Message): Effect.Effect<CoreMessage | null> {
    return Effect.gen(function* () {
        let textContent = ""

        if (msg.parts && Chunk.isChunk(msg.parts)) {
            textContent = Chunk.reduce(
                msg.parts,
                "",
                (acc: string, part) => {
                    if (part instanceof TextPart) {
                        return acc + part.content
                    }
                    return acc
                }
            )
        } else {
            yield* Effect.logWarning("Message parts are missing or not a Chunk")
        }

        if (msg.role instanceof User || msg.role instanceof UserWithName) {
            return { role: "user", content: textContent } as CoreMessage
        }
        if (msg.role instanceof Model) {
            return { role: "assistant", content: textContent } as CoreMessage
        }
        yield* Effect.logWarning(`Unsupported message role for CoreMessage mapping: ${String(msg.role)}`)
        return null
    })
}

/**
 * Maps an array of Effect messages to client core messages.
 * @param messages The messages to map
 * @returns The mapped core messages
 */
export function mapEffectMessagesToClientCoreMessages(
    messages: Chunk.Chunk<Message>
): Effect.Effect<CoreMessage[]> {
    return Effect.gen(function* () {
        const mappedMessages: CoreMessage[] = []
        for (const msg of Chunk.toReadonlyArray(messages)) {
            const mapped = yield* mapMessageToCoreMessage(msg)
            if (mapped) {
                mappedMessages.push(mapped)
            }
        }
        return mappedMessages
    })
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
export function spreadArray<T>(to: readonly T[], from: readonly T[], pack?: boolean): T[] {
    const result = [...to]

    if (pack || arguments.length === 2) {
        const fromArray = Array.from(from)
        return result.concat(fromArray)
    }

    return result.concat(from)
}