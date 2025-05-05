import { NoAudioFileError } from "@/services/pipeline/input/errors.js"
import type { EffectivePartType } from "@/services/pipeline/input/schema.js"
import { InputService } from "@/services/pipeline/input/service.js"
import { Message, TextPart } from "@effect/ai/AiInput"
import { Model, User } from "@effect/ai/AiRole"
import { Chunk, Effect } from "effect"
import { describe, expect, it } from "vitest"
import { FilePart, ReasoningPart, RedactedReasoningPart, ToolPart, ToolResultPart } from "../schema.js"

// Mock service implementation
const mockMessageService = {
    getMessages: () => Effect.succeed(Chunk.empty<Message>()),
    addMessage: (_message: Message) => Effect.succeed(undefined),
    addMessages: (_messages: ReadonlyArray<Message>) => Effect.succeed(undefined),
    addTextPart: (_text: string) => Effect.succeed(undefined),
    addPartOrMessage: (_input: EffectivePartType | Message) => Effect.succeed(undefined),
    extractTextsForEmbeddings: () => Effect.succeed([]),
    extractTextForSpeech: () => Effect.succeed(""),
    extractAudioForTranscription: () => Effect.fail(new NoAudioFileError())
};

describe("Input", () => {
    describe("message creation", () => {
        it("should create a user message", () =>
            Effect.gen(function* () {
                const service = yield* InputService
                const message = new Message({
                    role: new User(),
                    parts: Chunk.make(new TextPart({ content: "Hello" }))
                })

                yield* service.addMessage(message)
                const messages = yield* service.getMessages()
                const messageArray = Chunk.toReadonlyArray(messages) as Message[]

                expect(messageArray.length).toBe(1)
                expect(messageArray[0].role.kind).toBe("user")
                expect(Chunk.toReadonlyArray(messageArray[0].parts).length).toBe(1)

                const parts = Chunk.toReadonlyArray(messageArray[0].parts)
                expect(parts[0]).toBeInstanceOf(TextPart)
                expect((parts[0] as TextPart).content).toBe("Hello")
            }).pipe(
                Effect.provideService(InputService, mockMessageService)
            )
        )

        it("should create an assistant message", () =>
            Effect.gen(function* () {
                const service = yield* InputService
                const message = new Message({
                    role: new Model(),
                    parts: Chunk.make(new TextPart({ content: "Hello" }))
                })

                yield* service.addMessage(message)
                const messages = yield* service.getMessages()
                const messageArray = Chunk.toReadonlyArray(messages) as Message[]

                expect(messageArray.length).toBe(1)
                expect(messageArray[0].role.kind).toBe("model")
                expect(Chunk.toReadonlyArray(messageArray[0].parts).length).toBe(1)

                const parts = Chunk.toReadonlyArray(messageArray[0].parts)
                expect(parts[0]).toBeInstanceOf(TextPart)
                expect((parts[0] as TextPart).content).toBe("Hello")
            }).pipe(
                Effect.provideService(InputService, mockMessageService)
            )
        )

        it("should create a system message", () =>
            Effect.gen(function* () {
                const service = yield* InputService
                const systemMessage = yield* service.addTextPart("Hello", "system")
                const messages = yield* service.getMessages()
                const messageArray = Chunk.toReadonlyArray(messages) as Message[]

                expect(messageArray.length).toBe(1)
                expect(messageArray[0].role.kind).toBe("model")
                expect(Chunk.toReadonlyArray(messageArray[0].parts).length).toBe(1)

                const parts = Chunk.toReadonlyArray(messageArray[0].parts)
                expect(parts[0]).toBeInstanceOf(TextPart)
                expect((parts[0] as TextPart).content).toBe("Hello")
            }).pipe(
                Effect.provideService(InputService, mockMessageService)
            )
        )
    })

    describe("message parts", () => {
        it("should add a file part", () =>
            Effect.gen(function* () {
                const service = yield* InputService
                const filePart = new FilePart({
                    _tag: "FilePart",
                    fileName: "test.txt",
                    fileContent: new Uint8Array([1, 2, 3]),
                    fileType: "text/plain"
                })

                yield* service.addPartOrMessage(filePart)
                const messages = yield* service.getMessages()
                const messageArray = Chunk.toReadonlyArray(messages) as Message[]

                expect(messageArray.length).toBe(1)

                const parts = Chunk.toReadonlyArray(messageArray[0].parts)
                expect(parts.length).toBe(1)
                expect(parts[0]).toBeInstanceOf(TextPart)
                expect((parts[0] as TextPart).content).toContain("File: test.txt")
                expect((parts[0] as TextPart).content).toContain("Type: text/plain")
            }).pipe(
                Effect.provideService(InputService, mockMessageService)
            )
        )

        it("should add a reasoning part", () =>
            Effect.gen(function* () {
                const service = yield* InputService
                const reasoningPart = new ReasoningPart({
                    _tag: "ReasoningPart",
                    type: "reasoning",
                    text: "Let me think about this",
                    signature: "thinking"
                })

                yield* service.addPartOrMessage(reasoningPart)
                const messages = yield* service.getMessages()
                const messageArray = Chunk.toReadonlyArray(messages) as Message[]

                expect(messageArray.length).toBe(1)

                const parts = Chunk.toReadonlyArray(messageArray[0].parts)
                expect(parts.length).toBe(1)
                expect(parts[0]).toBeInstanceOf(TextPart)
                expect((parts[0] as TextPart).content).toBe("Let me think about this")
            }).pipe(
                Effect.provideService(InputService, mockMessageService)
            )
        )

        it("should add a redacted reasoning part", () =>
            Effect.gen(function* () {
                const service = yield* InputService;
                const redactedPart = new RedactedReasoningPart({
                    _tag: "RedactedReasoningPart",
                    type: "redacted-reasoning",
                    data: "Redacted content"
                });

                yield* service.addPartOrMessage(redactedPart);
                const messages = yield* service.getMessages();
                const messageArray = Chunk.toReadonlyArray(messages) as Message[];

                expect(messageArray.length).toBe(1);

                const parts = Chunk.toReadonlyArray(messageArray[0].parts);
                expect(parts.length).toBe(1);
                expect(parts[0]).toBeInstanceOf(TextPart);
                expect((parts[0] as TextPart).content).toBe("[REDACTED REASONING]");
            }).pipe(
                Effect.provideService(InputService, mockMessageService)
            )
        );

        it("should add a tool part", () =>
            Effect.gen(function* () {
                const service = yield* InputService
                const toolPart = new ToolPart({
                    _tag: "ToolPart",
                    type: "tool-call-part",
                    toolCallId: "123",
                    toolName: "calculator",
                    toolDescription: "Calculates numbers",
                    toolArguments: "1 + 1"
                })

                yield* service.addPartOrMessage(toolPart)
                const messages = yield* service.getMessages()
                const messageArray = Chunk.toReadonlyArray(messages) as Message[]

                expect(messageArray.length).toBe(1)

                const parts = Chunk.toReadonlyArray(messageArray[0].parts)
                expect(parts.length).toBe(1)
                expect(parts[0]).toBeInstanceOf(TextPart)
                expect((parts[0] as TextPart).content).toContain("Tool Call: calculator")
                expect((parts[0] as TextPart).content).toContain("Arguments: 1 + 1")
            }).pipe(
                Effect.provideService(InputService, mockMessageService)
            )
        )

        it("should add a tool result part", () =>
            Effect.gen(function* () {
                const service = yield* InputService
                const toolResultPart = new ToolResultPart({
                    _tag: "ToolResultPart",
                    type: "tool-result",
                    data: "2"
                })

                yield* service.addPartOrMessage(toolResultPart)
                const messages = yield* service.getMessages()
                const messageArray = Chunk.toReadonlyArray(messages) as Message[]

                expect(messageArray.length).toBe(1)

                const parts = Chunk.toReadonlyArray(messageArray[0].parts)
                expect(parts.length).toBe(1)
                expect(parts[0]).toBeInstanceOf(TextPart)
                expect((parts[0] as TextPart).content).toBe("2")
            }).pipe(
                Effect.provideService(InputService, mockMessageService)
            )
        )
    })

    describe("message management", () => {
        it("should maintain message order", () =>
            Effect.gen(function* () {
                const service = yield* InputService
                const msg1 = new Message({
                    role: new User(),
                    parts: Chunk.make(new TextPart({ content: "First" }))
                })
                yield* service.addMessage(msg1)

                const msg2 = new Message({
                    role: new Model(),
                    parts: Chunk.make(new TextPart({ content: "Second" }))
                })
                yield* service.addMessage(msg2)

                const msg3 = new Message({
                    role: new Model(),
                    parts: Chunk.make(new TextPart({ content: "Third" }))
                })
                yield* service.addMessage(msg3)

                const messages = yield* service.getMessages()
                const messageArray = Chunk.toReadonlyArray(messages) as Message[]

                expect(messageArray.length).toBe(3)

                const parts1 = Chunk.toReadonlyArray(messageArray[0].parts)
                const parts2 = Chunk.toReadonlyArray(messageArray[1].parts)
                const parts3 = Chunk.toReadonlyArray(messageArray[2].parts)

                expect((parts1[0] as TextPart).content).toBe("First")
                expect((parts2[0] as TextPart).content).toBe("Second")
                expect((parts3[0] as TextPart).content).toBe("Third")
            }).pipe(
                Effect.provideService(InputService, mockMessageService)
            )
        )

        it("should allow multiple parts per message through addPartOrMessage", () =>
            Effect.gen(function* () {
                const service = yield* InputService

                const textPart = new TextPart({ content: "Initial text" })
                yield* service.addPartOrMessage(textPart)

                const filePart = new FilePart({
                    _tag: "FilePart",
                    fileName: "test.txt",
                    fileContent: new Uint8Array([1, 2, 3]),
                    fileType: "text/plain"
                })
                yield* service.addPartOrMessage(filePart)

                const reasoningPart = new ReasoningPart({
                    _tag: "ReasoningPart",
                    type: "reasoning",
                    text: "Additional reasoning",
                    signature: "thinking"
                })
                yield* service.addPartOrMessage(reasoningPart)

                const messages = yield* service.getMessages()
                const messageArray = Chunk.toReadonlyArray(messages) as Message[]

                expect(messageArray.length).toBe(3)

                expect((Chunk.toReadonlyArray(messageArray[0].parts)[0] as TextPart).content).toBe("Initial text")
                expect((Chunk.toReadonlyArray(messageArray[1].parts)[0] as TextPart).content).toContain("File: test.txt")
                expect((Chunk.toReadonlyArray(messageArray[2].parts)[0] as TextPart).content).toBe("Additional reasoning")
            }).pipe(
                Effect.provideService(InputService, mockMessageService)
            )
        )
    })

    describe("role mapping", () => {
        it("should map user role correctly", () =>
            Effect.gen(function* () {
                const service = yield* InputService
                const textPart = new TextPart({ content: "Test" })
                const message = new Message({
                    role: new User(),
                    parts: Chunk.make(textPart)
                })

                yield* service.addMessage(message)
                const messages = yield* service.getMessages()
                const messageArray = Chunk.toReadonlyArray(messages) as Message[]

                expect(messageArray[0].role.kind).toBe("user")
            }).pipe(
                Effect.provideService(InputService, mockMessageService)
            )
        )

        it("should map assistant role correctly", () =>
            Effect.gen(function* () {
                const service = yield* InputService
                const textPart = new TextPart({ content: "Test" })
                const message = new Message({
                    role: new Model(),
                    parts: Chunk.make(textPart)
                })

                yield* service.addMessage(message)
                const messages = yield* service.getMessages()
                const messageArray = Chunk.toReadonlyArray(messages) as Message[]

                expect(messageArray[0].role.kind).toBe("model")
            }).pipe(
                Effect.provideService(InputService, mockMessageService)
            )
        )

        it("should map system role correctly", () =>
            Effect.gen(function* () {
                const service = yield* InputService
                const textContent = "Test"
                const systemMessage = yield* service.addTextPart(textContent, "system")
                const messages = yield* service.getMessages()
                const messageArray = Chunk.toReadonlyArray(messages) as Message[]

                expect(messageArray[0].role.kind).toBe("model")
            }).pipe(
                Effect.provideService(InputService, mockMessageService)
            )
        )
    })
})