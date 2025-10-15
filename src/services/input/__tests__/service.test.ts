import type { ImageUrlPart, Message, TextPart, ToolCallPart } from "@effective-agent/ai-sdk";
import { Chunk, Effect } from "effect";
import { describe, it } from "vitest";
import { EffectiveError } from "@/errors.js";
import { InvalidMessageError, NoAudioFileError } from "@/services/input/errors.js";
import type { FilePart } from "@/services/input/schema.js";
import { InputService, ROLE_USER } from "@/services/input/service.js";

// Helper to create a text part
const createTextPart = (content: string): TextPart => ({
  _tag: "Text",
  content
});

// Helper to create a message
const createMessage = (content: string, role: "user" | "system" | "model" | "assistant" | "tool" = "user"): Message => ({
  role: role as "user" | "system" | "model" | "assistant" | "tool",
  parts: Chunk.fromIterable([createTextPart(content)])
});

// Helper to create an audio file part
const createAudioPart = (fileName: string): FilePart => ({
  _tag: "File",
  fileName,
  fileContent: new Uint8Array([1, 2, 3]), // Dummy audio content
  fileType: "audio/wav",
  url: `file://${fileName}`
});

describe("InputService", () => {
  // Message management tests
  it("should add and retrieve messages", () =>
    Effect.gen(function* () {
      const service = yield* InputService;
      const message = createMessage("Hello");

      yield* service.addMessage(message);
      const messages = yield* service.getMessages();

      if (Chunk.isEmpty(messages)) {
        throw new EffectiveError({
          description: "Expected messages to not be empty",
          module: "input-service-test",
          method: "addMessage"
        });
      }

      const firstMessage = Chunk.unsafeHead(messages);
      const firstPart = Chunk.unsafeHead(firstMessage.parts);

      if (firstPart._tag !== "Text") {
        throw new EffectiveError({
          description: "Expected first part to be Text",
          module: "input-service-test",
          method: "addMessage"
        });
      }

      if (firstPart.content !== "Hello") {
        throw new EffectiveError({
          description: `Expected content "Hello", got "${firstPart.content}"`,
          module: "input-service-test",
          method: "addMessage"
        });
      }
    }));

  it("should add multiple messages", () =>
    Effect.gen(function* () {
      const service = yield* InputService;
      const messages = [
        createMessage("First"),
        createMessage("Second", "system")
      ];

      yield* service.addMessages(messages);
      const result = yield* service.getMessages();

      if (Chunk.size(result) !== 2) {
        throw new EffectiveError({
          description: `Expected 2 messages, got ${Chunk.size(result)}`,
          module: "input-service-test",
          method: "addMessages"
        });
      }
    }));

  it("should handle invalid messages", () =>
    Effect.gen(function* () {
      const service = yield* InputService;
      const invalidMessage = { role: "invalid", parts: Chunk.empty() } as unknown as Message;

      const result = yield* Effect.either(service.addMessage(invalidMessage));

      if (result._tag !== "Left") {
        throw new EffectiveError({
          description: "Expected Left (failure) result",
          module: "input-service-test",
          method: "addMessage"
        });
      }

      if (!(result.left instanceof InvalidMessageError)) {
        throw new EffectiveError({
          description: "Expected InvalidMessageError",
          module: "input-service-test",
          method: "addMessage"
        });
      }
    }));

  // Text part management tests
  it("should add text parts", () =>
    Effect.gen(function* () {
      const service = yield* InputService;
      const text = "Test text";

      yield* service.addTextPart(text);
      const messages = yield* service.getMessages();
      const firstMessage = Chunk.unsafeHead(messages);
      const firstPart = Chunk.unsafeHead(firstMessage.parts);

      if (firstPart._tag !== "Text") {
        throw new EffectiveError({
          description: "Expected first part to be Text",
          module: "input-service-test",
          method: "addTextPart"
        });
      }

      if (firstPart.content !== text) {
        throw new EffectiveError({
          description: `Expected content "${text}", got "${firstPart.content}"`,
          module: "input-service-test",
          method: "addTextPart"
        });
      }
    }));

  // Text extraction tests
  it("should extract texts for embeddings", () =>
    Effect.gen(function* () {
      const service = yield* InputService;
      const texts = ["First text", "Second text"];

      for (const text of texts) {
        yield* service.addTextPart(text);
      }

      const result = yield* service.extractTextsForEmbeddings();

      if (result.length !== texts.length) {
        throw new EffectiveError({
          description: `Expected ${texts.length} texts, got ${result.length}`,
          module: "input-service-test",
          method: "extractTextsForEmbeddings"
        });
      }

      if (!texts.every(text => result.includes(text))) {
        throw new EffectiveError({
          description: "Not all texts were extracted correctly",
          module: "input-service-test",
          method: "extractTextsForEmbeddings"
        });
      }
    }));

  it("should extract text for speech", () =>
    Effect.gen(function* () {
      const service = yield* InputService;
      const texts = ["First text", "Second text"];

      for (const text of texts) {
        yield* service.addTextPart(text);
      }

      const result = yield* service.extractTextForSpeech();
      const expected = texts.join(" ");

      if (result !== expected) {
        throw new EffectiveError({
          description: `Expected "${expected}", got "${result}"`,
          module: "input-service-test",
          method: "extractTextForSpeech"
        });
      }
    }));

  // Audio file tests
  it("should extract audio for transcription", () =>
    Effect.gen(function* () {
      const service = yield* InputService;
      const audioMessage = {
        role: ROLE_USER,
        parts: Chunk.fromIterable([createAudioPart("test.wav")]) as unknown as Chunk.Chunk<TextPart | ToolCallPart | ImageUrlPart>
      };

      yield* service.addMessage(audioMessage);
      const result = yield* service.extractAudioForTranscription();

      if (!(result instanceof ArrayBuffer)) {
        throw new EffectiveError({
          description: "Expected ArrayBuffer result",
          module: "input-service-test",
          method: "extractAudioForTranscription"
        });
      }
    }));

  it("should fail when no audio file is found", () =>
    Effect.gen(function* () {
      const service = yield* InputService;
      const textMessage = createMessage("No audio here");

      yield* service.addMessage(textMessage);
      const result = yield* Effect.either(service.extractAudioForTranscription());

      if (result._tag !== "Left") {
        throw new EffectiveError({
          description: "Expected Left (failure) result",
          module: "input-service-test",
          method: "extractAudioForTranscription"
        });
      }

      if (!(result.left instanceof NoAudioFileError)) {
        throw new EffectiveError({
          description: "Expected NoAudioFileError",
          module: "input-service-test",
          method: "extractAudioForTranscription"
        });
      }
    }));
});
