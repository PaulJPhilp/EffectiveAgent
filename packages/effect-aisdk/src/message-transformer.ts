/**
 * @file Message transformation utilities for converting between EffectiveMessage and Vercel CoreMessage formats
 * @module @effective-agent/ai-sdk/message-transformer
 */

import type { CoreMessage } from "ai";
import { Chunk, Effect } from "effect";
import { AiSdkMessageTransformError } from "./errors.js";
import { ImageUrlPart, Message, type Part, TextPart, ToolCallPart, ToolPart } from "./message.js";

/**
 * Convert a single EffectiveMessage to Vercel CoreMessage
 */
export function toVercelMessage(message: Message): Effect.Effect<CoreMessage, AiSdkMessageTransformError> {
  return Effect.gen(function* () {
    const parts = Chunk.toReadonlyArray(message.parts);
    const role = message.role;

    try {
      // Handle system messages
      if (role === "system") {
        const textParts = parts.filter(TextPart.is);
        const content = textParts.map(p => p.content).join("\n");
        return {
          role: "system",
          content,
        };
      }

      // Handle user messages
      if (role === "user") {
        const content: Array<{ type: "text"; text: string } | { type: "image"; image: URL }> = [];
        
        for (const part of parts) {
          if (TextPart.is(part)) {
            content.push({ type: "text", text: part.content });
          } else if (ImageUrlPart.is(part)) {
            content.push({ type: "image", image: new URL(part.url) });
          }
        }

        return {
          role: "user",
          content,
        };
      }

      // Handle assistant messages (with potential tool calls)
      if (role === "assistant" || role === "model") {
        const textParts = parts.filter(TextPart.is);
        const toolCallParts = parts.filter(ToolCallPart.is);

        const content = textParts.map(p => p.content).join("\n");
        
        if (toolCallParts.length > 0) {
          const toolCalls = toolCallParts.map(tc => ({
            toolCallId: tc.id,
            toolName: tc.name,
            args: tc.args,
          }));

          return {
            role: "assistant",
            content,
            toolCalls,
          };
        }

        return {
          role: "assistant",
          content,
        };
      }

      // Handle tool messages
      if (role === "tool") {
        const toolParts = parts.filter(ToolPart.is);

        if (toolParts.length === 0) {
          return yield* Effect.fail(
            new AiSdkMessageTransformError({
              message: "Tool message must have at least one tool result part",
              direction: "toVercel",
            })
          );
        }

        // Vercel expects one message per tool result
        // For now, we'll take the first tool result
        const toolPart = toolParts[0];
        return {
          role: "tool",
          content: [{
            type: "tool-result" as const,
            toolCallId: toolPart.tool_call_id,
            toolName: "unknown", // Tool name not stored in ToolPart
            result: toolPart.content
          }],
        };
      }

      // Unknown role
      return yield* Effect.fail(
        new AiSdkMessageTransformError({
          message: `Unknown message role: ${role}`,
          direction: "toVercel",
        })
      );
    } catch (error) {
      return yield* Effect.fail(
        new AiSdkMessageTransformError({
          message: `Failed to convert message to Vercel format`,
          direction: "toVercel",
          cause: error,
        })
      );
    }
  });
}

/**
 * Convert Vercel CoreMessage to EffectiveMessage
 */
export function toEffectiveMessage(
  coreMessage: CoreMessage,
  _modelId: string
): Effect.Effect<Message, AiSdkMessageTransformError> {
  return Effect.gen(function* () {
    try {
      const role = coreMessage.role;

      // Handle system messages
      if (role === "system") {
        const parts = Chunk.of(
          new TextPart({ _tag: "Text", content: coreMessage.content })
        );
        return new Message({ role: "system", parts });
      }

      // Handle user messages
      if (role === "user") {
        const content = coreMessage.content;
        const parts: Part[] = [];

        if (typeof content === "string") {
          parts.push(new TextPart({ _tag: "Text", content }));
        } else if (Array.isArray(content)) {
          for (const item of content) {
            if (item.type === "text") {
              parts.push(new TextPart({ _tag: "Text", content: item.text }));
            } else if (item.type === "image") {
              const imageUrl = item.image instanceof URL ? item.image.toString() : String(item.image);
              parts.push(new ImageUrlPart({ _tag: "ImageUrl", url: imageUrl }));
            }
          }
        }

        return new Message({ role: "user", parts: Chunk.fromIterable(parts) });
      }

      // Handle assistant messages
      if (role === "assistant") {
        const parts: Part[] = [];

        // Add text content if present
        const content = coreMessage.content;
        if (typeof content === "string" && content) {
          parts.push(new TextPart({ _tag: "Text", content }));
        }

        // Add tool calls if present
        if ("toolCalls" in coreMessage && coreMessage.toolCalls && Array.isArray(coreMessage.toolCalls)) {
          for (const toolCall of coreMessage.toolCalls) {
            if ("toolName" in toolCall && "toolCallId" in toolCall) {
              parts.push(
                new ToolCallPart({
                  _tag: "ToolCall",
                  id: toolCall.toolCallId,
                  name: toolCall.toolName,
                  args: (toolCall.args || {}) as Record<string, unknown>,
                })
              );
            }
          }
        }

        return new Message({ role: "assistant", parts: Chunk.fromIterable(parts) });
      }

      // Handle tool messages
      if (role === "tool") {
        const content = coreMessage.content;
        let resultText = "";

        if (Array.isArray(content)) {
          for (const item of content) {
            if ("type" in item && item.type === "tool-result" && "result" in item) {
              resultText = String(item.result);
              break;
            }
          }
        }

        const toolCallId = Array.isArray(content) && content.length > 0 && "toolCallId" in content[0] 
          ? String(content[0].toolCallId) 
          : "unknown";

        const parts = Chunk.of(
          new ToolPart({
            _tag: "Tool",
            tool_call_id: toolCallId,
            content: resultText,
          })
        );

        return new Message({ role: "tool", parts });
      }

      // Unknown role
      return yield* Effect.fail(
        new AiSdkMessageTransformError({
          message: `Unknown CoreMessage role: ${role}`,
          direction: "toEffective",
        })
      );
    } catch (error) {
      return yield* Effect.fail(
        new AiSdkMessageTransformError({
          message: `Failed to convert CoreMessage to EffectiveMessage`,
          direction: "toEffective",
          cause: error,
        })
      );
    }
  });
}

/**
 * Convert multiple EffectiveMessages to Vercel CoreMessages
 */
export function toVercelMessages(
  messages: Chunk.Chunk<Message>
): Effect.Effect<CoreMessage[], AiSdkMessageTransformError> {
  return Effect.gen(function* () {
    const messageArray = Chunk.toReadonlyArray(messages);
    const coreMessages: CoreMessage[] = [];

    for (const message of messageArray) {
      const coreMessage = yield* toVercelMessage(message);
      coreMessages.push(coreMessage);
    }

    return coreMessages;
  });
}

/**
 * Convert multiple Vercel CoreMessages to EffectiveMessages
 */
export function toEffectiveMessages(
  coreMessages: CoreMessage[],
  modelId: string
): Effect.Effect<Chunk.Chunk<Message>, AiSdkMessageTransformError> {
  return Effect.gen(function* () {
    const messages: Message[] = [];

    for (const coreMessage of coreMessages) {
      const message = yield* toEffectiveMessage(coreMessage, modelId);
      messages.push(message);
    }

    return Chunk.fromIterable(messages);
  });
}
