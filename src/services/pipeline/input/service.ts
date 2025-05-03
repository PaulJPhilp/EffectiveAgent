import { type EffectiveRole } from "@/schema.js";
import { Message, type Part, PartTypeId, TextPart } from "@effect/ai/AiInput";
import { Model, User } from "@effect/ai/AiRole";
import { Effect } from "effect";
import * as Chunk from "effect/Chunk";
import { type InputServiceApi } from "./api.js";
import { NoAudioFileError } from "./errors.js";
import { EffectivePartType, FilePart, ReasoningPart, RedactedReasoningPart, ToolPart, ToolResultPart } from "./schema.js";

/**
 * Input Service implementation
 */
export class InputService extends Effect.Service<InputServiceApi>()(
  "InputService",
  {
    effect: Effect.succeed({
      getMessages: () => Effect.succeed(Chunk.empty<Message>()),

      addMessage: (message: Message) => Effect.succeed(undefined),

      addMessages: (messages: ReadonlyArray<Message>) => Effect.succeed(undefined),

      addTextPart: (text: string, role: EffectiveRole = "assistant") => Effect.succeed(undefined),

      addPartOrMessage: (input: EffectivePartType | Message) => Effect.succeed(undefined),

      extractTextsForEmbeddings: () => Effect.succeed([]),

      extractTextForSpeech: () => Effect.succeed(""),

      extractAudioForTranscription: () => Effect.fail(new NoAudioFileError())
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