import { type EffectiveRole } from "@/schema.js";
import { NoAudioFileError } from "@/services/pipeline/input/errors.js";
import { EffectivePartType, FilePart, ReasoningPart, RedactedReasoningPart, ToolPart, ToolResultPart } from "@/services/pipeline/input/schema.js";
import { Message, type Part, PartTypeId, TextPart } from "@effect/ai/AiInput";
import { Model, User } from "@effect/ai/AiRole";
import { Effect, Ref } from "effect";
import * as Chunk from "effect/Chunk";
import { type InputServiceApi } from "./api.js";

/**
 * Input Service implementation
 */
export class InputService extends Effect.Service<InputServiceApi>()(
  "InputService",
  {
    effect: Effect.gen(function* () {
      // Internal state
      const messages = yield* Ref.make(Chunk.empty<Message>());

      // Service method interfaces
      interface Messages {
        getMessages: () => Effect.Effect<Chunk.Chunk<Message>>;
        addMessage: (message: Message) => Effect.Effect<Chunk.Chunk<Message>>;
        addMessages: (newMessages: ReadonlyArray<Message>) => Effect.Effect<Chunk.Chunk<Message>>;
        addTextPart: (text: string, role?: EffectiveRole) => Effect.Effect<Chunk.Chunk<Message>>;
        addPartOrMessage: (input: EffectivePartType | Message) => Effect.Effect<Chunk.Chunk<Message>>;
        extractTextsForEmbeddings: () => Effect.Effect<string[]>;
        extractTextForSpeech: () => Effect.Effect<string>;
        extractAudioForTranscription: () => Effect.Effect<never, NoAudioFileError, never>;
      }

      return {
        getMessages: (): Effect.Effect<Chunk.Chunk<Message>> => messages.get,

        addMessage: (message: Message): Effect.Effect<Chunk.Chunk<Message>> =>
          Effect.flatMap(messages.get, (msgs) =>
            Effect.succeed(Chunk.append(msgs, message))
          ),

        addMessages: (newMessages: ReadonlyArray<Message>): Effect.Effect<Chunk.Chunk<Message>> =>
          Effect.flatMap(messages.get, (msgs) =>
            Effect.succeed(Chunk.appendAll(msgs, Chunk.fromIterable(newMessages)))
          ),

        addTextPart: (text: string, role: EffectiveRole = "assistant"): Effect.Effect<Chunk.Chunk<Message>> => {
          const textPart = new TextPart({ content: text });
          const message = addPartAsMessage(textPart, role);
          return Effect.flatMap(messages.get, (msgs) =>
            Effect.succeed(Chunk.append(msgs, message))
          );
        },

        addPartOrMessage: (input: EffectivePartType | Message): Effect.Effect<Chunk.Chunk<Message>> => {
          if (input instanceof Message) {
            return Effect.flatMap(messages.get, (msgs) =>
              Effect.succeed(Chunk.append(msgs, input))
            );
          }
          const message = fromEffectivePart(input);
          return Effect.flatMap(messages.get, (msgs) =>
            Effect.succeed(Chunk.append(msgs, message))
          );
        },

        extractTextsForEmbeddings: (): Effect.Effect<string[]> =>
          Effect.map(messages.get, (msgs) => {
            const texts: string[] = [];
            for (const message of Chunk.toReadonlyArray(msgs)) {
              const parts = Chunk.toReadonlyArray(message.parts);
              for (const part of parts) {
                if (part._tag === "Text" && "content" in part) {
                  texts.push(part.content);
                }
              }
            }
            return texts;
          }),

        extractTextForSpeech: (): Effect.Effect<string> =>
          Effect.map(messages.get, (msgs) => {
            const texts: string[] = [];
            for (const message of Chunk.toReadonlyArray(msgs)) {
              const parts = Chunk.toReadonlyArray(message.parts);
              for (const part of parts) {
                if (part._tag === "Text" && "content" in part) {
                  texts.push(part.content);
                }
              }
            }
            return texts.join(" ");
          }),

        extractAudioForTranscription: (): Effect.Effect<never, NoAudioFileError, never> => Effect.fail(new NoAudioFileError())
      } satisfies Messages;
    })
  }
) { }

// Helper functions
function createTextPart(text: string): TextPart {
  return new TextPart({ content: text });
}

function mapToAiRole(role: EffectiveRole): User | Model {
  switch (role) {
    case "user": return new User();
    case "system": return new Model();
    default: return new Model();
  }
}

function addPartAsMessage(part: Part, role: EffectiveRole = "assistant"): Message {
  const aiRole = mapToAiRole(role);
  return new Message({ role: aiRole, parts: Chunk.make(part) });
}

function fromEffectivePart(part: EffectivePartType): Message {
  // Handle new EffectivePart types with custom message creation
  if (part instanceof FilePart) {
    const text = `File: ${part.fileName}\nType: ${part.fileType}`;
    return addPartAsMessage(createTextPart(text));
  }

  if (part instanceof ReasoningPart) {
    return addPartAsMessage(createTextPart(part.text));
  }

  if (part instanceof RedactedReasoningPart) {
    return addPartAsMessage(createTextPart("[REDACTED REASONING]"));
  }

  if (part instanceof ToolPart) {
    const text = `Tool Call: ${part.toolName}\nArguments: ${part.toolArguments}`;
    return addPartAsMessage(createTextPart(text));
  }

  if (part instanceof ToolResultPart) {
    return addPartAsMessage(createTextPart(part.data));
  }

  // For any other part type that is already a Part
  if (PartTypeId in part) {
    return addPartAsMessage(part as Part);
  }

  // Last resort - convert to text part
  return addPartAsMessage(createTextPart(String(part)));
}