import { Message, Model, TextPart, User } from "@/services/ai/input/schema.js"
import { Chunk, Effect, Option } from "effect"
import { describe, expect, it } from "vitest"
import { InputService } from "../service.js"

// Type guard for TextPart
function isTextPart(part: unknown): part is TextPart {
    return part instanceof TextPart
}

describe("InputService", () => {
    describe("addMessage", () => {
        it("should add a user message", () =>
            Effect.gen(function* () {
                const service = yield* InputService

                const message = new Message({
                    role: new User(),
                    parts: Chunk.make(new TextPart({ content: "Hello" }))
                })

                yield* service.addMessage(message)

                const messages = yield* service.getMessages()
                const firstMessage = Option.getOrUndefined(Chunk.head(messages))

                if (!firstMessage || Chunk.isEmpty(firstMessage.parts)) {
                    throw new Error("Message parts are empty")
                }

                const part = Option.getOrUndefined(Chunk.head(firstMessage.parts))
                if (!isTextPart(part)) {
                    throw new Error("Part is not a TextPart")
                }
                expect(part.content).toBe("Hello")
            }).pipe(Effect.provide(InputService.Default))
        )

        it("should add a model message", () =>
            Effect.gen(function* () {
                const service = yield* InputService

                const message = new Message({
                    role: new Model(),
                    parts: Chunk.make(new TextPart({ content: "Hello" }))
                })

                yield* service.addMessage(message)

                const messages = yield* service.getMessages()
                const firstMessage = Option.getOrUndefined(Chunk.head(messages))

                if (!firstMessage || Chunk.isEmpty(firstMessage.parts)) {
                    throw new Error("Message parts are empty")
                }

                const part = Option.getOrUndefined(Chunk.head(firstMessage.parts))
                if (!isTextPart(part)) {
                    throw new Error("Part is not a TextPart")
                }
                expect(part.content).toBe("Hello")
            }).pipe(Effect.provide(InputService.Default))
        )
    })
})