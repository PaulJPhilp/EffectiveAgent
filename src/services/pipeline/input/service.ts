import { type EffectiveRole } from "@/schema.js";
import {
  InvalidInputError,
  InvalidMessageError,
  NoAudioFileError
} from "./errors.js";

/**
 * Role constants for InputService
 */
export const ROLE_USER = "user" as const;
export const ROLE_SYSTEM = "system" as const;
export const ROLE_MODEL = "model" as const;

/**
 * Method name constants for InputService validation and error context
 */
export const METHOD_ADD_MESSAGE = "addMessage" as const;
export const METHOD_ADD_MESSAGES = "addMessages" as const;
export const METHOD_ADD_TEXT_PART = "addTextPart" as const;
export const METHOD_ADD_PART_OR_MESSAGE = "addPartOrMessage" as const;
export const METHOD_EXTRACT_TEXTS_FOR_EMBEDDINGS = "extractTextsForEmbeddings" as const;
export const METHOD_EXTRACT_TEXT_FOR_SPEECH = "extractTextForSpeech" as const;

import { ImageUrlPart, Message, Part, TextPart, ToolCallPart } from "@/schema.js";
import { EffectiveInput } from "@/types.js";

import { Chunk, Effect, Ref } from "effect";
import { InputServiceApi } from "./api.js";
import { FilePart } from "./schema.js";
export { FilePart };



/**
 * Type guard to check if a part is a FilePart.
 * @param part The part to check
 * @returns true if part is a FilePart
 */
// Define a strongly-typed FilePart interface for type guard usage
interface FilePartLike {
  _tag: "File";
  fileName: string;
  fileContent: Uint8Array;
  fileType: string;
  url: string;

}

/**
 * Type guard to check if a part is a FilePart.
 * @param part The part to check
 * @returns true if part is a FilePart
 */
export function isFilePart(part: unknown): part is FilePartLike {
  return (
    part !== null &&
    typeof part === 'object' &&
    '_tag' in part &&
    (part as { _tag: string })._tag === 'File' &&
    'fileName' in part &&
    'fileContent' in part &&
    'fileType' in part &&
    'url' in part &&
    true
  );
}

export function isTextPart(part: unknown): part is TextPart {
  return (
    part !== null &&
    typeof part === 'object' &&
    '_tag' in part &&
    (part as { _tag: string })._tag === 'Text' &&
    'content' in part
  );
}

/**
 * Extracts all text content from EffectiveInput for embedding generation.
 * @param input The EffectiveInput instance
 * @returns string[] Array of text contents
 */
export function extractTextsForEmbeddings(input: EffectiveInput): string[] {
  return Chunk.toReadonlyArray(input.messages).flatMap(message => {
    const parts = Chunk.toReadonlyArray(message.parts);
    return parts.filter((part): part is TextPart => part instanceof TextPart)
      .map(part => part.content);
  });
}

/**
 * Extracts a single string for TTS from EffectiveInput by concatenating all text parts.
 * @param input The EffectiveInput instance
 * @returns string Concatenated text for TTS
 */
export function extractTextForSpeech(input: EffectiveInput): string {
  const texts: string[] = [];
  for (const message of input.messages) {
    for (const part of message.parts) {
      if (part instanceof TextPart) {
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
  const audioFiles = Chunk.toReadonlyArray(input.messages).flatMap(message => {
    const parts = Chunk.toReadonlyArray(message.parts);

    // First filter for instances of FilePart
    const fileParts = parts.filter(part => part instanceof FilePart) as FilePart[];

    // Then filter for audio files
    return fileParts.filter(part =>
      part.fileType &&
      typeof part.fileType === 'string' &&
      part.fileType.startsWith('audio/')
    );
  });

  if (audioFiles.length === 0) {
    return Effect.fail(new NoAudioFileError());
  }

  const audioFile = audioFiles[0];
  if (!audioFile?.fileContent?.buffer) {
    return Effect.fail(new NoAudioFileError());
  }
  return Effect.succeed(audioFile.fileContent.buffer as ArrayBuffer);
}

// Helper functions
const createTextPart = (text: string): TextPart =>
  new TextPart({ _tag: "Text", content: text });

const mapToAiRole = (role: EffectiveRole): "user" | "model" | "system" | "assistant" | "tool" => {
  switch (role) {
    case ROLE_MODEL: return "model";
    case ROLE_SYSTEM: return "system";
    default: return "model";
  }
};

const validateMessage = (message: Message | undefined | null, method: string): Effect.Effect<Message, InvalidMessageError> => {
  if (!message) {
    return Effect.fail(InvalidMessageError.invalidFormat(method, "Message is null or undefined"));
  }
  if (!message.role) {
    return Effect.fail(InvalidMessageError.missingRole(method));
  }
  if (!message.parts || Chunk.isEmpty(message.parts)) {
    return Effect.fail(InvalidMessageError.missingParts(method));
  }
  return Effect.succeed(message);
};

const validateText = (text: string | undefined | null, method: string): Effect.Effect<string, InvalidInputError> => {
  if (!text || typeof text !== 'string') {
    return Effect.fail(InvalidInputError.invalidType(method, "string"));
  }
  if (text.trim().length === 0) {
    return Effect.fail(InvalidInputError.emptyInput(method));
  }
  return Effect.succeed(text);
};

const convertToMessagePart = (part: Part): TextPart | ToolCallPart | ImageUrlPart => {
  // If it's already a valid message part type, return as is
  if (part instanceof TextPart || part instanceof ToolCallPart || part instanceof ImageUrlPart) {
    return part;
  }

  // Convert FilePart to TextPart using our isFilePart type guard
  if (isFilePart(part)) {
    // Ensure type safety with additional assertion
    const filePart: FilePartLike = part;
    return new TextPart({ _tag: "Text", content: `File: ${filePart.fileName} (${filePart.fileType})` });
  }

  // Type assertions for type safety
  interface TypedTextPart { _tag: "Text"; text: string }
  interface TypedToolCallPart { _tag: "ToolCall"; toolCall: string }
  interface TypedImageUrlPart { _tag: "ImageUrl"; url: string }

  // Convert other known part types to TextPart using type assertion
  // for type safety
  const typedPart = part as unknown;

  if (typeof typedPart === 'object' && typedPart !== null) {
    if ('_tag' in typedPart) {
      const taggedPart = typedPart as { _tag: string };

      if (taggedPart._tag === "Text" && 'text' in typedPart) {
        const textPart = typedPart as TypedTextPart;
        return new TextPart({ _tag: "Text", content: textPart.text });
      }

      if (taggedPart._tag === "ToolCall" && 'toolCall' in typedPart) {
        const toolCallPart = typedPart as TypedToolCallPart;
        return new TextPart({ _tag: "Text", content: `Tool Call: ${toolCallPart.toolCall}` });
      }

      if (taggedPart._tag === "ImageUrl" && 'url' in typedPart) {
        const imageUrlPart = typedPart as TypedImageUrlPart;
        return new TextPart({ _tag: "Text", content: `Image URL: ${imageUrlPart.url}` });
      }
    }
  }

  // Fallback for any other part type
  return new TextPart({ _tag: "Text", content: `Unknown part type` });
};

const addPartAsMessage = (part: Part, role: EffectiveRole = ROLE_USER): Message => {
  const aiRole = mapToAiRole(role);
  return new Message({
    role: aiRole,
    parts: Chunk.make(convertToMessagePart(part))
  });
};

const partToString = (part: Part): string => {
  if (part instanceof TextPart) {
    return part.content;
  }

  // Use our type guard instead of instanceof
  if (isFilePart(part)) {
    // Use explicit cast to avoid type errors
    const filePart: FilePartLike = part;
    return `File: ${filePart.fileName} (${filePart.fileType})`;
  }

  // For any other part type, safely convert to string
  if (part && typeof part === 'object' && '_tag' in part) {
    return `Part: ${part._tag}`;
  }

  return String(part);
};

/**
 * Input Service implementation
 */
export class InputService extends Effect.Service<InputServiceApi>()("InputService", {
  effect: Effect.gen(function* () {
    // Internal state
    const messages = yield* Ref.make(Chunk.empty<Message>());

    // Internal helper to find audio files
    /**
     * Finds all audio FileParts in the given messages chunk.
     * @param msgs - Chunk of Message objects to search
     * @returns Array of FilePart objects with audio MIME types
     */
    const findAudioFiles = (msgs: Chunk.Chunk<Message>): FilePart[] => {
      // Extract all parts from messages
      const allParts = Chunk.toReadonlyArray(msgs)
        .flatMap((msg: Message) => Chunk.toReadonlyArray(msg.parts));

      // First: filter for parts that pass our isFilePart check
      const possibleFileParts = allParts.filter(part => isFilePart(part));

      // Cast to FilePart[] since we know all elements pass isFilePart
      const fileParts = possibleFileParts as FilePart[];

      // Now filter for audio files
      return fileParts.filter(part =>
        part.fileType &&
        typeof part.fileType === 'string' &&
        part.fileType.startsWith('audio/')
      );
    };

    return {
      /**
       * Retrieves the current list of messages.
       * @returns Chunk of Message objects
       */
      getMessages: (): Effect.Effect<Chunk.Chunk<Message>> => Ref.get(messages),

      /**
       * Adds a single message to the internal message list.
       * @param message - Message object to add
       * @throws InvalidMessageError if the message is invalid
       */
      addMessage: (message: Message) => Effect.gen(function* () {
        const validMessage = yield* validateMessage(message, METHOD_ADD_MESSAGE);
        yield* Ref.update(messages, msgs => Chunk.append(msgs, validMessage));
      }),

      /**
       * Adds multiple messages to the internal message list.
       * @param newMessages - Array of Message objects to add
       * @throws InvalidInputError if the input is not an array
       * @throws InvalidMessageError if any message is invalid
       */
      addMessages: (newMessages: ReadonlyArray<Message>) => Effect.gen(function* () {
        if (!Array.isArray(newMessages)) {
          return yield* Effect.fail(InvalidInputError.invalidType(METHOD_ADD_MESSAGES, "array"));
        }

        // Validate all messages first
        const validatedMessages = yield* Effect.all(
          newMessages.map(msg => validateMessage(msg, METHOD_ADD_MESSAGES))
        );

        yield* Ref.update(messages, msgs =>
          validatedMessages.reduce((acc: Chunk.Chunk<Message>, msg: Message) => Chunk.append(acc, msg), msgs)
        );
      }),

      /**
       * Adds a text part as a new message to the internal message list.
       * @param text - Text content to add
       * @param role - Role of the message (default: ROLE_USER)
       * @throws InvalidInputError if the text is invalid
       */
      addTextPart: (text: string, role: EffectiveRole = ROLE_USER) => Effect.gen(function* () {
        const validText = yield* validateText(text, METHOD_ADD_TEXT_PART);
        const part = createTextPart(validText);
        const message = addPartAsMessage(part, role);
        yield* Ref.update(messages, msgs => Chunk.append(msgs, message));
      }),

      /**
       * Adds a part or message to the internal message list.
       * @param input - Part or Message object to add
       * @throws InvalidInputError if the input is empty
       * @throws InvalidMessageError if the message is invalid
       */
      addPartOrMessage: (input: Part | Message) => Effect.gen(function* () {
        if (!input) {
          return yield* Effect.fail(InvalidInputError.emptyInput(METHOD_ADD_PART_OR_MESSAGE));
        }

        const message = input instanceof Message ? input : addPartAsMessage(input);
        yield* validateMessage(message, METHOD_ADD_PART_OR_MESSAGE);
        yield* Ref.update(messages, msgs => Chunk.append(msgs, message));
      }),

      /**
       * Extracts text content from all messages for embeddings.
       * @returns Array of text strings
       * @throws InvalidInputError if no text content is found
       */
      extractTextsForEmbeddings: () => Effect.gen(function* () {
        const allMessages = yield* Ref.get(messages);
        if (Chunk.isEmpty(allMessages)) {
          return yield* Effect.fail(InvalidInputError.noTextContent(METHOD_EXTRACT_TEXTS_FOR_EMBEDDINGS));
        }

        const texts = Chunk.toReadonlyArray(allMessages)
          .flatMap(msg => Chunk.toReadonlyArray(msg.parts)
            .filter((part: Part): part is TextPart => part instanceof TextPart)
            .map((part: TextPart) => part.content)
          );

        if (texts.length === 0) {
          return yield* Effect.fail(InvalidInputError.noTextContent(METHOD_EXTRACT_TEXTS_FOR_EMBEDDINGS));
        }

        return texts;
      }),

      /**
       * Extracts text content from all messages for speech.
       * @returns Concatenated text string
       * @throws InvalidInputError if no text content is found
       */
      extractTextForSpeech: () => Effect.gen(function* () {
        const allMessages = yield* Ref.get(messages);
        if (Chunk.isEmpty(allMessages)) {
          return yield* Effect.fail(InvalidInputError.noTextContent(METHOD_EXTRACT_TEXT_FOR_SPEECH));
        }

        const texts = Chunk.toReadonlyArray(allMessages)
          .flatMap((msg: Message) => Chunk.toReadonlyArray(msg.parts)
            .map((part: Part) => partToString(part))
          )
          .filter((text: string) => text.trim().length > 0);

        if (texts.length === 0) {
          return yield* Effect.fail(InvalidInputError.noTextContent(METHOD_EXTRACT_TEXT_FOR_SPEECH));
        }

        return texts.join(' ');
      }),

      /**
       * Extracts audio files from all messages for transcription.
       * @returns First audio file found as an ArrayBuffer
       * @throws NoAudioFileError if no audio file is found
       */
      extractAudioForTranscription: () => Effect.gen(function* () {
        const allMessages = yield* Ref.get(messages);
        const audioFiles = findAudioFiles(allMessages);

        if (audioFiles.length === 0) {
          return yield* Effect.fail(new NoAudioFileError());
        }

        // Return the first audio file found
        // Note: In a real implementation, you would read the file content here
        return new ArrayBuffer(0); // Placeholder
      }),
    };
  })
}) { }