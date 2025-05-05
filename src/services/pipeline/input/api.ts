import { type EffectiveRole } from "@/schema.js";
import { Message } from "@effect/ai/AiInput";
import { Effect } from "effect";
import * as Chunk from "effect/Chunk";
import { InvalidInputError, InvalidMessageError, NoAudioFileError } from "./errors.js";
import { EffectivePartType } from "./schema.js";

/**
 * API for the Input Service.
 * Manages the collection and manipulation of messages and parts in an AI conversation.
 * Provides methods for adding different types of content and extracting it in various formats.
 */
export interface InputServiceApi {
  /**
   * Get all messages currently stored in the input service.
   * @returns Effect containing a Chunk of Message objects
   */
  getMessages(): Effect.Effect<Chunk.Chunk<Message>>;

  /**
   * Add a single message to the input service.
   * @param message - The Message object to add
   * @returns Effect that resolves when the message is added
   * @throws InvalidMessageError if the message format is invalid (missing role or parts)
   */
  addMessage(message: Message): Effect.Effect<void, InvalidMessageError>;

  /**
   * Add multiple messages to the input service at once.
   * @param messages - Array of Message objects to add
   * @returns Effect that resolves when all messages are added
   * @throws InvalidMessageError if any message in the array has an invalid format
   */
  addMessages(messages: ReadonlyArray<Message>): Effect.Effect<void, InvalidMessageError>;

  /**
   * Add text content as a new message with specified role.
   * @param text - The text content to add
   * @param role - Optional role for the message (defaults to "user")
   * @returns Effect that resolves when the text is added as a message
   * @throws InvalidInputError if the text input is empty or invalid
   */
  addTextPart(text: string, role?: EffectiveRole): Effect.Effect<void, InvalidInputError>;

  /**
   * Add either a part or a complete message to the input.
   * Handles conversion of EffectivePartType to Message if needed.
   * @param input - Either an EffectivePartType or Message to add
   * @returns Effect that resolves when the input is added
   * @throws InvalidInputError if the input is null, undefined, or invalid
   */
  addPartOrMessage(input: EffectivePartType | Message): Effect.Effect<void, InvalidInputError>;

  /**
   * Extract all text content suitable for generating embeddings.
   * Filters and processes text parts from all messages.
   * @returns Effect containing array of text strings
   * @throws InvalidInputError if no valid text content is found
   */
  extractTextsForEmbeddings(): Effect.Effect<ReadonlyArray<string>, InvalidInputError>;

  /**
   * Extract text content suitable for text-to-speech conversion.
   * Concatenates all text parts with spaces between them.
   * @returns Effect containing the concatenated text string
   * @throws InvalidInputError if no valid text content is found
   */
  extractTextForSpeech(): Effect.Effect<string, InvalidInputError>;

  /**
   * Extract audio content for transcription.
   * Finds the first audio file in the messages.
   * @returns Effect containing the audio buffer
   * @throws NoAudioFileError if no audio file is found
   */
  extractAudioForTranscription(): Effect.Effect<ArrayBuffer, NoAudioFileError>;
}
