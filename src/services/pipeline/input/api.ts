import { type EffectiveRole } from "@/schema.js";
import { Message, type Part } from "@effect/ai/AiInput";
import { Effect } from "effect";
import * as Chunk from "effect/Chunk";
import { NoAudioFileError } from "./errors.js";
import { EffectivePartType } from "./schema.js";

/**
 * API for the Input Service
 */
export interface InputServiceApi {
  /**
   * Get all messages in the input
   */
  getMessages(): Effect.Effect<Chunk.Chunk<Message>>;

  /**
   * Add a message to the input
   */
  addMessage(message: Message): Effect.Effect<void>;

  /**
   * Add multiple messages to the input
   */
  addMessages(messages: ReadonlyArray<Message>): Effect.Effect<void>;

  /**
   * Add a text part as a message
   */
  addTextPart(text: string, role?: EffectiveRole): Effect.Effect<void>;

  /**
   * Add a part or message to the input
   */
  addPartOrMessage(input: EffectivePartType | Message): Effect.Effect<void>;

  /**
   * Extract text content for embeddings
   */
  extractTextsForEmbeddings(): Effect.Effect<ReadonlyArray<string>>;

  /**
   * Extract text content for speech
   */
  extractTextForSpeech(): Effect.Effect<string>;

  /**
   * Extract audio content for transcription
   */
  extractAudioForTranscription(): Effect.Effect<ArrayBuffer, NoAudioFileError>;
}
