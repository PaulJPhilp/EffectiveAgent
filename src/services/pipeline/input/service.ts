import { type EffectiveRole } from "@/schema.js";
import { EffectivePartType, FilePart, ImagePart, ImageUrlPart, Message, Model, Part, PartTypeId, TextPart, ToolCallPart, ToolCallResolvedPart, User } from "@/services/ai/input/schema.js";
import { type InputServiceApi } from "@/services/pipeline/input/api.js";
import { InvalidInputError, InvalidMessageError, NoAudioFileError } from "@/services/pipeline/input/errors.js";
import { isFilePart } from "@/services/pipeline/input/helpers.js";
import { Effect, Ref } from "effect";
import * as Chunk from "effect/Chunk";

// Helper functions
const createTextPart = (text: string): TextPart =>
  new TextPart({ content: text });

const mapToAiRole = (role: EffectiveRole): User | Model => {
  switch (role) {
    case "user": return new User();
    case "system": return new Model();
    default: return new Model();
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

const convertToMessagePart = (part: Part | EffectivePartType): TextPart | ToolCallPart | ToolCallResolvedPart | ImagePart | ImageUrlPart => {
  if (part instanceof TextPart || part instanceof ToolCallPart ||
    part instanceof ToolCallResolvedPart || part instanceof ImagePart ||
    part instanceof ImageUrlPart) {
    return part;
  }
  // Convert other part types to TextPart
  return new TextPart({ content: partToString(part) });
};

const addPartAsMessage = (part: Part | EffectivePartType, role: EffectiveRole = "user"): Message => {
  const aiRole = mapToAiRole(role);
  const messagePart = convertToMessagePart(part);
  return new Message({
    role: aiRole,
    parts: Chunk.make(messagePart)
  });
};

const partToString = (part: Part | EffectivePartType): string => {
  if (part instanceof TextPart) {
    return part.content;
  }

  if (PartTypeId in part) {
    return String(part);
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
    const findAudioFiles = (msgs: Chunk.Chunk<Message>): FilePart[] => {
      const allParts: Array<Part | EffectivePartType> = Chunk.toReadonlyArray(msgs)
        .flatMap(msg => Chunk.toReadonlyArray(msg.parts));

      return allParts.filter((part): part is FilePart =>
        isFilePart(part) && part.fileType.startsWith('audio/')
      );
    };

    return {
      getMessages: () => Ref.get(messages),

      addMessage: (message: Message) => Effect.gen(function* () {
        const validMessage = yield* validateMessage(message, "addMessage");
        yield* Ref.update(messages, msgs => Chunk.append(msgs, validMessage));
      }),

      addMessages: (newMessages: ReadonlyArray<Message>) => Effect.gen(function* () {
        if (!Array.isArray(newMessages)) {
          return yield* Effect.fail(InvalidInputError.invalidType("addMessages", "array"));
        }

        // Validate all messages first
        const validatedMessages = yield* Effect.all(
          newMessages.map(msg => validateMessage(msg, "addMessages"))
        );

        yield* Ref.update(messages, msgs =>
          validatedMessages.reduce((acc, msg) => Chunk.append(acc, msg), msgs)
        );
      }),

      addTextPart: (text: string, role: EffectiveRole = "user") => Effect.gen(function* () {
        const validText = yield* validateText(text, "addTextPart");
        const part = createTextPart(validText);
        const message = addPartAsMessage(part, role);
        yield* Ref.update(messages, msgs => Chunk.append(msgs, message));
      }),

      addPartOrMessage: (input: EffectivePartType | Message) => Effect.gen(function* () {
        if (!input) {
          return yield* Effect.fail(InvalidInputError.emptyInput("addPartOrMessage"));
        }

        const message = input instanceof Message ? input : addPartAsMessage(input);
        yield* validateMessage(message, "addPartOrMessage");
        yield* Ref.update(messages, msgs => Chunk.append(msgs, message));
      }),

      extractTextsForEmbeddings: () => Effect.gen(function* () {
        const allMessages = yield* Ref.get(messages);
        if (Chunk.isEmpty(allMessages)) {
          return yield* Effect.fail(InvalidInputError.noTextContent("extractTextsForEmbeddings"));
        }

        const texts = Chunk.toReadonlyArray(allMessages)
          .flatMap(msg => Chunk.toReadonlyArray(msg.parts)
            .filter((part): part is TextPart => part instanceof TextPart)
            .map(part => part.content)
          );

        if (texts.length === 0) {
          return yield* Effect.fail(InvalidInputError.noTextContent("extractTextsForEmbeddings"));
        }

        return texts;
      }),

      extractTextForSpeech: () => Effect.gen(function* () {
        const allMessages = yield* Ref.get(messages);
        if (Chunk.isEmpty(allMessages)) {
          return yield* Effect.fail(InvalidInputError.noTextContent("extractTextForSpeech"));
        }

        const texts = Chunk.toReadonlyArray(allMessages)
          .flatMap(msg => Chunk.toReadonlyArray(msg.parts)
            .map(part => partToString(part))
          )
          .filter(text => text.trim().length > 0);

        if (texts.length === 0) {
          return yield* Effect.fail(InvalidInputError.noTextContent("extractTextForSpeech"));
        }

        return texts.join(' ');
      }),

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