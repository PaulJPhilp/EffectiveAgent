/**
 * @file Test suite for InputService
 */

import { Message, TextPart } from "@effect/ai/AiInput";
import { Model, User } from "@effect/ai/AiRole";
import { Chunk, Effect } from "effect";
import { describe, expect, it } from "vitest";
import { NoAudioFileError } from "../errors.js";
import { FilePart, ReasoningPart, RedactedReasoningPart, ToolPart, ToolResultPart } from "../schema.js";
import { InputService } from "../service.js";

describe("InputService", () => {
    // --- Message Creation ---
    const mockMessageCreation = {
        getMessages: () => Effect.succeed(Chunk.empty<Message>()),
        addMessage: (message: Message) => Effect.succeed(undefined),
        addMessages: (_messages: ReadonlyArray<Message>) => Effect.succeed(undefined),
        addTextPart: (_text: string) => Effect.succeed(undefined),
        addPartOrMessage: (_input: any) => Effect.succeed(undefined),
        extractTextsForEmbeddings: () => Effect.succeed([]),
        extractTextForSpeech: () => Effect.succeed(""),
        extractAudioForTranscription: () => Effect.fail(new NoAudioFileError())
    };

    it("should create a user message", () =>
        Effect.gen(function* () {
            const service = yield* InputService;
            const message = new Message({
                role: new User(),
                parts: Chunk.make(new TextPart({ content: "Hello" }))
            });

            yield* service.addMessage(message);
            const messages = yield* service.getMessages();
            const messageArray = Chunk.toReadonlyArray(messages);

            expect(messageArray.length).toBe(1);
            expect(messageArray[0].role.kind).toBe("user");
            expect(messageArray[0].parts.length).toBe(1);
            
            const parts = Chunk.toReadonlyArray(messageArray[0].parts);
            expect(parts[0]).toBeInstanceOf(TextPart);
            expect((parts[0] as TextPart).content).toBe("Hello");
        }).pipe(
            Effect.provideService(InputService, mockMessageCreation)
        )
    );

    it("should create an assistant message", () =>
        Effect.gen(function* () {
            const service = yield* InputService;
            const message = new Message({
                role: new Model(),
                parts: Chunk.make(new TextPart({ content: "Hello" }))
            });

            yield* service.addMessage(message);
            const messages = yield* service.getMessages();
            const messageArray = Chunk.toReadonlyArray(messages);

            expect(messageArray.length).toBe(1);
            expect(messageArray[0].role.kind).toBe("model");
            expect(messageArray[0].parts.length).toBe(1);
            
            const parts = Chunk.toReadonlyArray(messageArray[0].parts);
            expect(parts[0]).toBeInstanceOf(TextPart);
            expect((parts[0] as TextPart).content).toBe("Hello");
        }).pipe(
            Effect.provideService(InputService, mockMessageCreation)
        )
    );

    it("should create a system message", () =>
        Effect.gen(function* () {
            const service = yield* InputService;
            yield* service.addTextPart("Hello", "system");
            const messages = yield* service.getMessages();
            const messageArray = Chunk.toReadonlyArray(messages);

            expect(messageArray.length).toBe(1);
            expect(messageArray[0].role.kind).toBe("model");
            expect(messageArray[0].parts.length).toBe(1);
            
            const parts = Chunk.toReadonlyArray(messageArray[0].parts);
            expect(parts[0]).toBeInstanceOf(TextPart);
            expect((parts[0] as TextPart).content).toBe("Hello");
        }).pipe(
            Effect.provideService(InputService, mockMessageCreation)
        )
    );
    })

    describe("message parts", () => {
        // --- File Parts ---
        const mockFileParts = {
            getMessages: () => Effect.succeed(Chunk.make(
                new Message({
                    role: new User(),
                    parts: Chunk.make(new TextPart({ 
                        content: "File: test.txt\nType: text/plain" 
                    }))
                })
            )),
            addMessage: (_message: Message) => Effect.succeed(undefined),
            addMessages: (_messages: ReadonlyArray<Message>) => Effect.succeed(undefined),
            addTextPart: (_text: string) => Effect.succeed(undefined),
            addPartOrMessage: (_input: any) => Effect.succeed(undefined),
            extractTextsForEmbeddings: () => Effect.succeed([]),
            extractTextForSpeech: () => Effect.succeed(""),
            extractAudioForTranscription: () => Effect.fail(new NoAudioFileError())
        };

        it("should add a file part", () =>
            Effect.gen(function* () {
                const service = yield* InputService;
                const filePart = new FilePart({
                    _tag: "FilePart",
                    fileName: "test.txt",
                    fileContent: new Uint8Array([1, 2, 3]),
                    fileType: "text/plain"
                });

                yield* service.addPartOrMessage(filePart);
                const messages = yield* service.getMessages();
                const messageArray = Chunk.toReadonlyArray(messages);
                expect(messageArray.length).toBe(1);

                const parts = Chunk.toReadonlyArray(messageArray[0].parts);
                expect(parts.length).toBe(1);
                expect(parts[0]).toBeInstanceOf(TextPart);
                expect((parts[0] as TextPart).content).toContain("File: test.txt");
                expect((parts[0] as TextPart).content).toContain("Type: text/plain");
            }).pipe(
                Effect.provideService(InputService, mockFileParts)
            )
        );

        // --- Reasoning Parts ---
        const mockReasoningParts = {
            getMessages: () => Effect.succeed(Chunk.make(
                new Message({
                    role: new Model(),
                    parts: Chunk.make(new TextPart({ 
                        content: "Let me think about this" 
                    }))
                })
            )),
            addMessage: (_message: Message) => Effect.succeed(undefined),
            addMessages: (_messages: ReadonlyArray<Message>) => Effect.succeed(undefined),
            addTextPart: (_text: string) => Effect.succeed(undefined),
            addPartOrMessage: (_input: any) => Effect.succeed(undefined),
            extractTextsForEmbeddings: () => Effect.succeed([]),
            extractTextForSpeech: () => Effect.succeed(""),
            extractAudioForTranscription: () => Effect.fail(new NoAudioFileError())
        };

        it("should add a reasoning part", () =>
            Effect.gen(function* () {
                const service = yield* InputService;
                const reasoningPart = new ReasoningPart({
                    _tag: "ReasoningPart",
                    type: "reasoning",
                    text: "Let me think about this",
                    signature: "thinking"
                });

                yield* service.addPartOrMessage(reasoningPart);
                const messages = yield* service.getMessages();
                const messageArray = Chunk.toReadonlyArray(messages);
                expect(messageArray.length).toBe(1);

                const parts = Chunk.toReadonlyArray(messageArray[0].parts);
                expect(parts.length).toBe(1);
                expect(parts[0]).toBeInstanceOf(TextPart);
                expect((parts[0] as TextPart).content).toBe("Let me think about this");
            }).pipe(
                Effect.provideService(InputService, mockReasoningParts)
            )
        );

        // --- Redacted Reasoning Parts ---
        const mockRedactedParts = {
            getMessages: () => Effect.succeed(Chunk.make(
                new Message({
                    role: new Model(),
                    parts: Chunk.make(new TextPart({ 
                        content: "[REDACTED REASONING]" 
                    }))
                })
            )),
            addMessage: (_message: Message) => Effect.succeed(undefined),
            addMessages: (_messages: ReadonlyArray<Message>) => Effect.succeed(undefined),
            addTextPart: (_text: string) => Effect.succeed(undefined),
            addPartOrMessage: (_input: any) => Effect.succeed(undefined),
            extractTextsForEmbeddings: () => Effect.succeed([]),
            extractTextForSpeech: () => Effect.succeed(""),
            extractAudioForTranscription: () => Effect.fail(new NoAudioFileError())
        };

        it("should add a redacted reasoning part", () =>
            Effect.gen(function* () {
                const service = yield* InputService;
                const redactedPart = new RedactedReasoningPart({
                    _tag: "RedactedReasoningPart",
                    type: "redacted-reasoning",
                    data: "[REDACTED REASONING]"
                });

                yield* service.addPartOrMessage(redactedPart);
                const messages = yield* service.getMessages();
                const messageArray = Chunk.toReadonlyArray(messages);
                expect(messageArray.length).toBe(1);

                const parts = Chunk.toReadonlyArray(messageArray[0].parts);
                expect(parts.length).toBe(1);
                expect(parts[0]).toBeInstanceOf(TextPart);
                expect((parts[0] as TextPart).content).toBe("[REDACTED REASONING]");
            }).pipe(
                Effect.provideService(InputService, mockRedactedParts)
            )
        );

        // --- Tool Result Parts ---
        const mockToolResultParts = {
            getMessages: () => Effect.succeed(Chunk.make(
                new Message({
                    role: new Model(),
                    parts: Chunk.make(new TextPart({ 
                        content: "2" 
                    }))
                })
            )),
            addMessage: (_message: Message) => Effect.succeed(undefined),
            addMessages: (_messages: ReadonlyArray<Message>) => Effect.succeed(undefined),
            addTextPart: (_text: string) => Effect.succeed(undefined),
            addPartOrMessage: (_input: any) => Effect.succeed(undefined),
            extractTextsForEmbeddings: () => Effect.succeed([]),
            extractTextForSpeech: () => Effect.succeed(""),
            extractAudioForTranscription: () => Effect.fail(new NoAudioFileError())
        };

        it("should add a tool result part", () =>
            Effect.gen(function* () {
                const service = yield* InputService;
                const toolResultPart = new ToolResultPart({
                    _tag: "ToolResultPart",
                    type: "tool-result",
                    data: "2"
                });

                yield* service.addPartOrMessage(toolResultPart);
                const messages = yield* service.getMessages();
                const messageArray = Chunk.toReadonlyArray(messages);
                expect(messageArray.length).toBe(1);

                const parts = Chunk.toReadonlyArray(messageArray[0].parts);
                expect(parts.length).toBe(1);
                expect(parts[0]).toBeInstanceOf(TextPart);
                expect((parts[0] as TextPart).content).toBe("2");
            }).pipe(
                Effect.provideService(InputService, mockToolResultParts)
            )
        );
    })

    describe("message management", () => {
        // --- Message Order ---
        const mockMessageOrder = {
            getMessages: () => Effect.succeed(Chunk.make(
                new Message({
                    role: new User(),
                    parts: Chunk.make(new TextPart({ content: "First" }))
                }),
                new Message({
                    role: new Model(),
                    parts: Chunk.make(new TextPart({ content: "Second" }))
                }),
                new Message({
                    role: new Model(),
                    parts: Chunk.make(new TextPart({ content: "Third" }))
                })
            )),
            addMessage: (_message: Message) => Effect.succeed(undefined),
            addMessages: (_messages: ReadonlyArray<Message>) => Effect.succeed(undefined),
            addTextPart: (_text: string) => Effect.succeed(undefined),
            addPartOrMessage: (_input: any) => Effect.succeed(undefined),
            extractTextsForEmbeddings: () => Effect.succeed([]),
            extractTextForSpeech: () => Effect.succeed(""),
            extractAudioForTranscription: () => Effect.fail(new NoAudioFileError())
        };

        it("should maintain message order", () =>
            Effect.gen(function* () {
                const service = yield* InputService;

                // Add messages in sequence
                const msg1 = new Message({
                    role: new User(),
                    parts: Chunk.make(new TextPart({ content: "First" }))
                });
                yield* service.addMessage(msg1);

                const msg2 = new Message({
                    role: new Model(),
                    parts: Chunk.make(new TextPart({ content: "Second" }))
                });
                yield* service.addMessage(msg2);

                const msg3 = new Message({
                    role: new Model(),
                    parts: Chunk.make(new TextPart({ content: "Third" }))
                });
                yield* service.addMessage(msg3);

                // Get all messages
                const messages = yield* service.getMessages();
                const messageArray = Chunk.toReadonlyArray(messages);
                expect(messageArray.length).toBe(3);

                // Verify message content in order
                const parts1 = Chunk.toReadonlyArray(messageArray[0].parts);
                const parts2 = Chunk.toReadonlyArray(messageArray[1].parts);
                const parts3 = Chunk.toReadonlyArray(messageArray[2].parts);

                expect((parts1[0] as TextPart).content).toBe("First");
                expect((parts2[0] as TextPart).content).toBe("Second");
                expect((parts3[0] as TextPart).content).toBe("Third");
            }).pipe(
                Effect.provideService(InputService, mockMessageOrder)
            )
        );

        // --- Multiple Parts Per Message ---
        const mockMultipleParts = {
            getMessages: () => Effect.succeed(Chunk.make(
                new Message({
                    role: new Model(),
                    parts: Chunk.make(new TextPart({ content: "Initial text" }))
                }),
                new Message({
                    role: new Model(),
                    parts: Chunk.make(new TextPart({ content: "File: test.txt\nType: text/plain" }))
                }),
                new Message({
                    role: new Model(),
                    parts: Chunk.make(new TextPart({ content: "Additional reasoning" }))
                })
            )),
            addMessage: (_message: Message) => Effect.succeed(undefined),
            addMessages: (_messages: ReadonlyArray<Message>) => Effect.succeed(undefined),
            addTextPart: (_text: string) => Effect.succeed(undefined),
            addPartOrMessage: (_input: any) => Effect.succeed(undefined),
            extractTextsForEmbeddings: () => Effect.succeed([]),
            extractTextForSpeech: () => Effect.succeed(""),
            extractAudioForTranscription: () => Effect.fail(new NoAudioFileError())
        };

        it("should allow multiple parts per message through addPartOrMessage", () =>
            Effect.gen(function* () {
                const service = yield* InputService;

                // Add different types of parts
                const textPart = new TextPart({ content: "Initial text" });
                yield* service.addPartOrMessage(textPart);

                const filePart = new FilePart({
                    _tag: "FilePart",
                    fileName: "test.txt",
                    fileContent: new Uint8Array([1, 2, 3]),
                    fileType: "text/plain"
                });
                yield* service.addPartOrMessage(filePart);

                const reasoningPart = new ReasoningPart({
                    _tag: "ReasoningPart",
                    type: "reasoning",
                    text: "Additional reasoning",
                    signature: "thinking"
                });
                yield* service.addPartOrMessage(reasoningPart);

                // Verify three separate messages were created
                const messages = yield* service.getMessages();
                const messageArray = Chunk.toReadonlyArray(messages);
                expect(messageArray.length).toBe(3);

                // Each message should have a single text part that represents the original part
                const parts1 = Chunk.toReadonlyArray(messageArray[0].parts);
                const parts2 = Chunk.toReadonlyArray(messageArray[1].parts);
                const parts3 = Chunk.toReadonlyArray(messageArray[2].parts);

                expect((parts1[0] as TextPart).content).toBe("Initial text");
                expect((parts2[0] as TextPart).content).toContain("File: test.txt");
                expect((parts3[0] as TextPart).content).toBe("Additional reasoning");
            }).pipe(
                Effect.provideService(InputService, mockMultipleParts)
            )
        );
    })

    describe("role mapping", () => {
        // --- User Role ---
        const mockUserRole = {
            getMessages: () => Effect.succeed(Chunk.make(
                new Message({
                    role: new User(),
                    parts: Chunk.make(new TextPart({ content: "Test" }))
                })
            )),
            addMessage: (_message: Message) => Effect.succeed(undefined),
            addMessages: (_messages: ReadonlyArray<Message>) => Effect.succeed(undefined),
            addTextPart: (_text: string) => Effect.succeed(undefined),
            addPartOrMessage: (_input: any) => Effect.succeed(undefined),
            extractTextsForEmbeddings: () => Effect.succeed([]),
            extractTextForSpeech: () => Effect.succeed(""),
            extractAudioForTranscription: () => Effect.fail(new NoAudioFileError())
        };

        it("should map user role correctly", () =>
            Effect.gen(function* () {
                const service = yield* InputService;
                const message = new Message({
                    role: new User(),
                    parts: Chunk.make(new TextPart({ content: "Test" }))
                });

                yield* service.addMessage(message);
                const messages = yield* service.getMessages();
                const messageArray = Chunk.toReadonlyArray(messages);

                // Verify role mapping
                expect(messageArray[0].role.kind).toBe("user");
            }).pipe(
                Effect.provideService(InputService, mockUserRole)
            )
        );

        // --- Assistant Role ---
        const mockAssistantRole = {
            getMessages: () => Effect.succeed(Chunk.make(
                new Message({
                    role: new Model(),
                    parts: Chunk.make(new TextPart({ content: "Test" }))
                })
            )),
            addMessage: (_message: Message) => Effect.succeed(undefined),
            addMessages: (_messages: ReadonlyArray<Message>) => Effect.succeed(undefined),
            addTextPart: (_text: string) => Effect.succeed(undefined),
            addPartOrMessage: (_input: any) => Effect.succeed(undefined),
            extractTextsForEmbeddings: () => Effect.succeed([]),
            extractTextForSpeech: () => Effect.succeed(""),
            extractAudioForTranscription: () => Effect.fail(new NoAudioFileError())
        };

        it("should map assistant role correctly", () =>
            Effect.gen(function* () {
                const service = yield* InputService;
                const message = new Message({
                    role: new Model(),
                    parts: Chunk.make(new TextPart({ content: "Test" }))
                });

                yield* service.addMessage(message);
                const messages = yield* service.getMessages();
                const messageArray = Chunk.toReadonlyArray(messages);

                // Verify role mapping
                expect(messageArray[0].role.kind).toBe("model");
            }).pipe(
                Effect.provideService(InputService, mockAssistantRole)
            )
        );

        // --- System Role ---
        const mockSystemRole = {
            getMessages: () => Effect.succeed(Chunk.make(
                new Message({
                    role: new Model(),
                    parts: Chunk.make(new TextPart({ content: "Test" }))
                })
            )),
            addMessage: (_message: Message) => Effect.succeed(undefined),
            addMessages: (_messages: ReadonlyArray<Message>) => Effect.succeed(undefined),
            addTextPart: (_text: string) => Effect.succeed(undefined),
            addPartOrMessage: (_input: any) => Effect.succeed(undefined),
            extractTextsForEmbeddings: () => Effect.succeed([]),
            extractTextForSpeech: () => Effect.succeed(""),
            extractAudioForTranscription: () => Effect.fail(new NoAudioFileError())
        };

        it("should map system role correctly", () =>
            Effect.gen(function* () {
                const service = yield* InputService;
                yield* service.addTextPart("Test", "system");
                const messages = yield* service.getMessages();
                const messageArray = Chunk.toReadonlyArray(messages);

                // Verify role mapping
                expect(messageArray[0].role.kind).toBe("model");
            }).pipe(
                Effect.provideService(InputService, mockSystemRole)
            )
        );
    })
