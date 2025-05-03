import { Effect } from "effect";
import * as Chunk from "effect/Chunk";
import { NoAudioFileError } from "../provider/errors.js";
import { FilePart } from "./schema.js";
import { EffectiveInput } from "./service.js";

/**
 * Type guard to check if a part is a FilePart.
 * @param part The part to check
 * @returns boolean
 */
export function isFilePart(part: unknown): part is FilePart {
  return (
    typeof part === "object" &&
    part !== null &&
    (part as FilePart)._tag === "FilePart" &&
    "fileName" in part &&
    "fileContent" in part &&
    "fileType" in part
  );
}

/**
 * Extracts all text content from EffectiveInput for embedding generation.
 * @param input The EffectiveInput instance
 * @returns string[] Array of text contents
 */
export function extractTextsForEmbeddings(input: EffectiveInput): string[] {
  const messages = Chunk.toReadonlyArray(input.getMessages());
  const texts: string[] = [];
  for (const message of messages) {
    const parts = Chunk.toReadonlyArray(message.parts);
    for (const part of parts) {
      if (part._tag === "Text" && "content" in part) {
        texts.push(part.content);
      }
    }
  }
  return texts;
}

/**
 * Extracts a single string for TTS from EffectiveInput by concatenating all text parts.
 * @param input The EffectiveInput instance
 * @returns string Concatenated text for TTS
 */
export function extractTextForSpeech(input: EffectiveInput): string {
  const messages = Chunk.toReadonlyArray(input.getMessages());
  const texts: string[] = [];
  for (const message of messages) {
    const parts = Chunk.toReadonlyArray(message.parts);
    for (const part of parts) {
      if (part._tag === "Text" && "content" in part) {
        texts.push(part.content);
      }
    }
  }
  return texts.join(" ");
}

/**
 * Extracts the first audio file as ArrayBuffer from EffectiveInput for transcription.
 * Only supports FilePart with fileType starting with "audio/".
 * Returns Effect<ArrayBuffer, NoAudioFileError> for type safety and error handling.
 * @param input The EffectiveInput instance
 * @returns Effect<ArrayBuffer, NoAudioFileError>
 */
export function extractAudioForTranscriptionEffect(
  input: EffectiveInput
): Effect.Effect<ArrayBuffer, NoAudioFileError> {
  const messages = Chunk.toReadonlyArray(input.getMessages());
  for (const message of messages) {
    const parts = Chunk.toReadonlyArray(message.parts);
    for (const part of parts) {
      if (!isFilePart(part)) continue;
      const test: FilePart = part;
      if (
        typeof test.fileType === "string" &&
        test.fileType.startsWith("audio/")
      ) {
        const buffer = test.fileContent.buffer;
        const offset = test.fileContent.byteOffset;
        const length = test.fileContent.byteLength;
        if (buffer instanceof ArrayBuffer) {
          return Effect.succeed(buffer.slice(offset, offset + length));
        }
        return Effect.succeed(new Uint8Array(buffer, offset, length).slice().buffer);
      }
    }
  }
  return Effect.fail(new NoAudioFileError());
}
