/**
 * @file Utility functions for the completion service
 * @module services/ai/producers/chat/utils
 */

import { Message } from "@effect/ai/AiInput"
import { CoreMessage } from "ai"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"

/**
 * Maps Effect messages to CoreMessages for provider compatibility
 */
export function mapEffectMessagesToClientCoreMessages(
    messages: Chunk.Chunk<Message>
): CoreMessage[] {
    const messageArray = Chunk.toArray(messages)

    const coreMessages = messageArray.map(msg => {
        let textContent = ""

        if (msg.parts && Chunk.isChunk(msg.parts)) {
            // Handle parts as a Chunk
            textContent = Chunk.reduce(
                msg.parts,
                "",
                (acc, part) => {
                    if (part._tag === "TextPart") {
                        return acc + part.content;
                    }
                    return acc;
                }
            );
        } else {
            Effect.logWarning("Message parts are missing or not a Chunk");
        }

        switch (msg.role.kind) {
            case "user":
                return { role: "user", content: textContent } as CoreMessage
            case "model":
                return { role: "assistant", content: textContent } as CoreMessage
            case "system":
                return { role: "system", content: textContent } as CoreMessage
            default:
                Effect.logWarning(`Unsupported message role for CoreMessage mapping: ${String(msg.role.kind)}`)
                return null
        }
    }).filter((msg): msg is CoreMessage => msg !== null)

    return coreMessages
} 