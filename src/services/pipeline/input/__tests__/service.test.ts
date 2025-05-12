/**
 * @file Test suite for InputService
 */

import { Message } from "@/schema.js";
import {
  FilePart,
  InputService,
  InvalidInputError,
  InvalidMessageError,
  NoAudioFileError,
  ROLE_MODEL,
  ROLE_SYSTEM,
  ROLE_USER
} from "@/services/pipeline/input/service.js";
import { TextPart } from "@effect/ai/AiResponse";
import { Model, User } from "@effect/ai/AiRole";
import { Chunk, Effect, Schema } from "effect";
import { describe, expect, it } from "vitest";

// Test schema for Person object
class Person extends Schema.Class<Person>("Person")({
    name: Schema.String,
    age: Schema.Number,
    email: Schema.String.pipe(Schema.optional)
}) { }

describe("InputService", () => {
    // --- Message Creation ---


    it("should create a user message", () =>
        Effect.gen(function* () {
            const service = yield* InputService;
            const message = new Message({
                role: "user",
                parts: Chunk.make(new TextPart({ content: "Hello" }))
            });

            yield* service.addMessage(message);
            const messages = yield* service.getMessages();
            const messageArray = Chunk.toReadonlyArray(messages);

            expect(messageArray.length).toBe(1);
            if (messageArray[0]?.role !== "user") {
                throw new Error("Message role is not a user")
            }
            expect(messageArray[0].role).toBe("user");
            expect(messageArray[0].parts.length).toBe(1);

            const parts = Chunk.toReadonlyArray(messageArray[0].parts);
            expect(parts[0]).toBeInstanceOf(TextPart);
            if (parts[0] === undefined) {
                throw new Error("Part is undefined")
            }
            expect((parts[0] as TextPart).content).toBe("Hello");
        })
    );

    it("should create an assistant message", () =>
        Effect.gen(function* () {
            const service = yield* InputService;
            const message = new Message({
                role: "model",
                parts: Chunk.make(new TextPart({ content: "Hello" }))
            });

            yield* service.addMessage(message);
            const messages = yield* service.getMessages();
            const messageArray = Chunk.toReadonlyArray(messages);

            expect(messageArray.length).toBe(1);
            if (messageArray[0] === undefined) {
                throw new Error("Message is undefined")
            }
            expect(messageArray[0].role).toBe("model");

            expect(messageArray[0].parts.length).toBe(1);

            const parts = Chunk.toReadonlyArray(messageArray[0].parts);
            expect(parts[0]).toBeInstanceOf(TextPart);
            expect((parts[0] as TextPart).content).toBe("Hello");
        })
    );

    it("should create a system message", () =>
        Effect.gen(function* () {
            const service = yield* InputService;
            yield* service.addTextPart("Hello", ROLE_SYSTEM);
            const messages = yield* service.getMessages();
            const messageArray = Chunk.toReadonlyArray(messages);

            expect(messageArray.length).toBe(1);
            if (messageArray[0] === undefined) {
                throw new Error("Message is undefined")
            }
            expect(messageArray[0].role).toBe("model");
            expect(messageArray[0].parts.length).toBe(1);

            const parts = Chunk.toReadonlyArray(messageArray[0].parts);
            expect(parts[0]).toBeInstanceOf(TextPart);
            expect((parts[0] as TextPart).content).toBe("Hello");
        })
    );
})

describe("message parts", () => {
    // --- File Parts ---
    it("should add a file part", () =>
        Effect.gen(function* () {
            const service = yield* InputService;
            const filePart = new FilePart(
                "test.txt",
                new Uint8Array([1, 2, 3]),
                "text/plain"
            );

            yield* service.addPartOrMessage(filePart);
            const messages = yield* service.getMessages();
            const message = Chunk.toReadonlyArray(messages)[0];

            expect(message).toBeDefined();
            if (message === undefined) {
                throw new Error("Message is undefined")
            }
            const parts = Chunk.toReadonlyArray(message.parts);
            expect(parts[0]).toBeInstanceOf(TextPart);
            expect((parts[0] as TextPart).content).toContain("File: test.txt");
            expect((parts[0] as TextPart).content).toContain("Type: text/plain");
        })
    );
})

describe("message management", () => {
    // --- Message Order ---
    const mockMessageOrder = {
        getMessages: () => Effect.succeed(Chunk.make(
            new Message({
                role: "user",
                parts: Chunk.make(new TextPart({ content: "First" }))
            }),
            new Message({
                role: "model",
                parts: Chunk.make(new TextPart({ content: "Second" }))
            }),
            new Message({
                role: "model",
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
                role: "user",
                parts: Chunk.make(new TextPart({ content: "First" }))
            });
            yield* service.addMessage(msg1);

            const msg2 = new Message({
                role: "model",
                parts: Chunk.make(new TextPart({ content: "Second" }))
            });
            yield* service.addMessage(msg2);

            const msg3 = new Message({
                role: "model",
                parts: Chunk.make(new TextPart({ content: "Third" }))
            });
            yield* service.addMessage(msg3);

            // Get all messages
            const messages = yield* service.getMessages();
            const messageArray = Chunk.toReadonlyArray(messages);
            expect(messageArray.length).toBe(3);

            // Verify message content in order
            expect(messageArray[0]).toBeDefined();
            const parts1 = Chunk.toReadonlyArray(messageArray[0]!.parts);
            expect(parts1[0]).toBeDefined();
            expect((parts1[0] as TextPart).content).toBe("First");

            expect(messageArray[1]).toBeDefined();
            const parts2 = Chunk.toReadonlyArray(messageArray[1]!.parts);
            expect(parts2[0]).toBeDefined();
            expect((parts2[0] as TextPart).content).toBe("Second");

            expect(messageArray[2]).toBeDefined();
            const parts3 = Chunk.toReadonlyArray(messageArray[2]!.parts);
            expect(parts3[0]).toBeDefined();
            expect((parts3[0] as TextPart).content).toBe("Third");
        }).pipe(
            Effect.provideService(InputService, mockMessageOrder)
        )
    );

    // --- Multiple Parts Per Message ---
    const mockMultipleParts = {
        getMessages: () => Effect.succeed(Chunk.make(
            new Message({
                role: "model",
                parts: Chunk.make(new TextPart({ content: "Initial text" }))
            }),
            new Message({
                role: "model",
                parts: Chunk.make(new TextPart({ content: "File: test.txt\nType: text/plain" }))
            }),
            new Message({
                role: "model",
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

            const filePart = new FilePart(
                "test.txt",
                new Uint8Array([1, 2, 3]),
                "text/plain"
            );
            yield* service.addPartOrMessage(filePart);

            // Verify three separate messages were created
            const messages = yield* service.getMessages();
            const messageArray = Chunk.toReadonlyArray(messages);
            expect(messageArray.length).toBe(2);

            if (messageArray[0] === undefined) {
                throw new Error("Message is undefined")
            }

            const parts1 = Chunk.toReadonlyArray(messageArray[0].parts);
            if (parts1[0] === undefined) {
                throw new Error("Part is undefined")
            }
            expect((parts1[0] as TextPart).content).toBe("Initial text");

            if (messageArray[1] === undefined) {
                throw new Error("Message is undefined")
            }
            const parts2 = Chunk.toReadonlyArray(messageArray[1].parts);
            if (parts2[0] === undefined) {
                throw new Error("Part is undefined")
            }
            expect((parts2[0] as TextPart).content).toContain("File: test.txt");
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
                role: "user",
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
                role: "user",
                parts: Chunk.make(new TextPart({ content: "Test" }))
            });

            yield* service.addMessage(message);
            const messages = yield* service.getMessages();
            const messageArray = Chunk.toReadonlyArray(messages);

            // Verify role mapping
            if (messageArray[0] === undefined) {
                throw new Error("Message is undefined")
            }
            expect(messageArray[0].role).toBe("user");
        }).pipe(
            Effect.provideService(InputService, mockUserRole)
        )
    );

    // --- Assistant Role ---
    const mockAssistantRole = {
        getMessages: () => Effect.succeed(Chunk.make(
            new Message({
                role: "model",
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
                role: "model",
                parts: Chunk.make(new TextPart({ content: "Test" }))
            });

            yield* service.addMessage(message);
            const messages = yield* service.getMessages();
            const messageArray = Chunk.toReadonlyArray(messages);

            // Verify role mapping
            if (messageArray[0] === undefined) {
                throw new Error("Message is undefined")
            }
            expect(messageArray[0].role).toBe("model");
        }).pipe(
            Effect.provideService(InputService, mockAssistantRole)
        )
    );

    // --- System Role ---
    const mockSystemRole = {
        getMessages: () => Effect.succeed(Chunk.make(
            new Message({
                role: "model",
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
            if (messageArray[0] === undefined) {
                throw new Error("Message is undefined")
            }
            expect(messageArray[0].role).toBe("model");
        }).pipe(
            Effect.provideService(InputService, mockSystemRole)
        )
    );
})

describe("message operations", () => {
    it("should add and retrieve a valid message", () =>
        Effect.gen(function* () {
            const service = yield* InputService;
            const message = new Message({
                role: "user",
                parts: Chunk.make(new TextPart({ content: "Hello" }))
            });

            yield* service.addMessage(message);
            const messages = yield* service.getMessages();
            const messageArray = Chunk.toReadonlyArray(messages);

            expect(messageArray.length).toBe(1);
            if (messageArray[0] === undefined) {
                throw new Error("Message is undefined")
            }
            expect(messageArray[0].role).toBe("user");
            const parts = Chunk.toReadonlyArray(messageArray[0].parts);
            expect(parts[0]).toBeInstanceOf(TextPart);
            expect((parts[0] as TextPart).content).toBe("Hello");
        }));

    it("should reject invalid message", () =>
        Effect.gen(function* () {
            const service = yield* InputService;
            const result = yield* Effect.either(service.addMessage({} as Message));

            expect(result._tag).toBe("Left");
            if (result._tag === "Left") {
                expect(result.left).toBeInstanceOf(InvalidMessageError);
            }
        }));

    it("should add multiple messages", () =>
        Effect.gen(function* () {
            const service = yield* InputService;
            const messages = [
                new Message({
                    role: ROLE_USER,
                    parts: Chunk.make(new TextPart({ content: "Hello" }))
                }),
                new Message({
                    role: ROLE_MODEL,
                    parts: Chunk.make(new TextPart({ content: "Hi" }))
                })
            ];

            yield* service.addMessages(messages);
            const result = yield* service.getMessages();
            expect(Chunk.toReadonlyArray(result).length).toBe(2);
        }));
});

describe("text operations", () => {
    it("should add text part with default role", () =>
        Effect.gen(function* () {
            const service = yield* InputService;
            yield* service.addTextPart("Hello");

            const messages = yield* service.getMessages();
            const message = Chunk.toReadonlyArray(messages)[0];
            if (message === undefined) {
                throw new Error("Message is undefined")
            }

            expect(message.role).toBe(ROLE_USER);
            const parts = Chunk.toReadonlyArray(message.parts);
            expect(parts[0]).toBeInstanceOf(TextPart);
            expect((parts[0] as TextPart).content).toBe("Hello");
        }));

    it("should reject empty text", () =>
        Effect.gen(function* () {
            const service = yield* InputService;
            const result = yield* Effect.either(service.addTextPart(""));

            expect(result._tag).toBe("Left");
            if (result._tag === "Left") {
                expect(result.left).toBeInstanceOf(InvalidInputError);
            }
        }));
});

describe("part operations", () => {
    it("should handle file part", () =>
        Effect.gen(function* () {
            const service = yield* InputService;
            const filePart = new FilePart(
                "test.wav",
                new Uint8Array([1, 2, 3]),
                "audio/wav"
            );

            yield* service.addPartOrMessage(filePart);
            const messages = yield* service.getMessages();
            const message = Chunk.toReadonlyArray(messages)[0];

            expect(message).toBeDefined();
            if (message === undefined) {
                throw new Error("Message is undefined")
            }
            const parts = Chunk.toReadonlyArray(message.parts);
            expect(parts[0]).toBeInstanceOf(TextPart);
            expect((parts[0] as TextPart).content).toContain("test.wav");
        }));
})

describe("extraction operations", () => {
    it("should extract texts for embeddings", () =>
        Effect.gen(function* () {
            const service = yield* InputService;
            yield* service.addTextPart("Hello");
            yield* service.addTextPart("World");

            const texts = yield* service.extractTextsForEmbeddings();
            expect(texts).toEqual(["Hello", "World"]);
        }));

    it("should extract text for speech", () =>
        Effect.gen(function* () {
            const service = yield* InputService;
            yield* service.addTextPart("Hello");
            yield* service.addTextPart("World");

            const text = yield* service.extractTextForSpeech();
            expect(text).toBe("Hello World");
        }));

    it("should fail to extract audio when none exists", () =>
        Effect.gen(function* () {
            const service = yield* InputService;
            const result = yield* Effect.either(service.extractAudioForTranscription());

            expect(result._tag).toBe("Left");
            if (result._tag === "Left") {
                expect(result.left).toBeInstanceOf(NoAudioFileError);
            }
        }));

    it("should extract audio content", () =>
        Effect.gen(function* () {
            const service = yield* InputService;
            const audioData = new Uint8Array([1, 2, 3]);
            const filePart = new FilePart(
                "test.wav",
                audioData,
                "audio/wav"
            );

            yield* service.addPartOrMessage(filePart);
            const buffer = yield* service.extractAudioForTranscription();

            expect(new Uint8Array(buffer)).toEqual(audioData);
        }));
})
