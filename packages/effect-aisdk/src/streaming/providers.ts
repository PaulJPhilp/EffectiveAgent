/* eslint-disable @typescript-eslint/no-explicit-any */

import type { LanguageModelV1 } from "ai";
import { streamObject as vercelStreamObject, streamText as vercelStreamText } from "ai";
import type { Schema } from "effect";
import type { StreamController, StreamOptions } from "./types";

/**
 * Parse Server-Sent Events from a text stream
 */
function parseSSELine(line: string): Record<string, any> | null {
  if (!line.startsWith("data:")) {
    return null;
  }

  try {
    const json = line.slice(5).trim();
    if (json === "[DONE]") {
      return { done: true };
    }
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Adapter for OpenAI streaming
 */
export async function createOpenAIStreamAdapter(
  model: LanguageModelV1,
  options: StreamOptions,
  controller: StreamController
): Promise<void> {
  try {
    const result = await vercelStreamText({
      model,
      messages: options.messages as any,
      temperature: options.temperature,
      topP: options.top_p,
      abortSignal: options.signal,
    });

    let fullText = "";

    // Get the response body as a ReadableStream
    const response = result.toDataStreamResponse();
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          const data = parseSSELine(line.trim());
          if (!data) continue;

          if (data.done) {
            // Stream completed
            controller.enqueue({
              type: "final-message",
              text: fullText,
              raw: data,
              timestamp: Date.now(),
              provider: "openai",
            } as const);

            controller.enqueue({
              type: "complete",
              timestamp: Date.now(),
              provider: "openai",
            } as const);
            return;
          }

          const t = data?.type as
            | "content_block_delta"
            | "message_stop"
            | "content_block_start"
            | "ping"
            | undefined;

          if (!t) continue;

          switch (t) {
            case "content_block_delta": {
              const delta = data.delta?.text || "";
              if (delta) {
                fullText += delta;
                controller.enqueue({
                  type: "token-delta",
                  delta,
                  timestamp: Date.now(),
                  provider: "openai",
                } as const);
              }
              break;
            }
            case "message_stop": {
              controller.enqueue({
                type: "final-message",
                text: fullText,
                raw: data,
                timestamp: Date.now(),
                provider: "openai",
              } as const);

              controller.enqueue({
                type: "complete",
                timestamp: Date.now(),
                provider: "openai",
              } as const);
              break;
            }
            case "content_block_start":
            case "ping":
              // No action needed
              break;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    controller.error(error as Error);
  }
}

/**
 * Adapter for Anthropic streaming
 */
export async function createAnthropicStreamAdapter(
  model: LanguageModelV1,
  options: StreamOptions,
  controller: StreamController
): Promise<void> {
  try {
    const result = await vercelStreamText({
      model,
      messages: options.messages as any,
      temperature: options.temperature,
      topP: options.top_p,
      abortSignal: options.signal,
    });

    let fullText = "";

    // Get the response body as a ReadableStream
    const response = result.toDataStreamResponse();
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          const data = parseSSELine(line.trim());
          if (!data) continue;

          if (data.done) {
            // Stream completed
            controller.enqueue({
              type: "final-message",
              text: fullText,
              raw: data,
              timestamp: Date.now(),
              provider: "anthropic",
            } as const);

            controller.enqueue({
              type: "complete",
              timestamp: Date.now(),
              provider: "anthropic",
            } as const);
            return;
          }

          const t = data?.type as
            | "content_block_delta"
            | "message_stop"
            | "content_block_start"
            | "ping"
            | undefined;

          if (!t) continue;

          switch (t) {
            case "content_block_delta": {
              const delta = data.delta?.text || "";
              if (delta) {
                fullText += delta;
                controller.enqueue({
                  type: "token-delta",
                  delta,
                  timestamp: Date.now(),
                  provider: "anthropic",
                } as const);
              }
              break;
            }
            case "message_stop": {
              controller.enqueue({
                type: "final-message",
                text: fullText,
                raw: data,
                timestamp: Date.now(),
                provider: "anthropic",
              } as const);

              controller.enqueue({
                type: "complete",
                timestamp: Date.now(),
                provider: "anthropic",
              } as const);
              break;
            }
            case "content_block_start":
            case "ping":
              // No action needed
              break;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    controller.error(error as Error);
  }
}

/**
 * Adapter for streaming objects
 */
export async function createObjectStreamAdapter<T>(
  model: LanguageModelV1,
  options: StreamOptions & { schema: Schema.Schema<T, any, never> },
  controller: StreamController
): Promise<void> {
  try {
    const result = await vercelStreamObject({
      model,
      messages: options.messages as any,
      schema: options.schema as any,
      temperature: options.temperature,
      topP: options.top_p,
      abortSignal: options.signal,
    });

    let fullText = "";

    // Get the response body as a ReadableStream
    const response = result.toTextStreamResponse();
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          const data = parseSSELine(line.trim());
          if (!data) continue;

          if (data.done) {
            // Stream completed - attempt to parse final object
            try {
              const parsed = JSON.parse(fullText);
              controller.enqueue({
                type: "final-message",
                text: fullText,
                raw: { object: parsed, ...data },
                timestamp: Date.now(),
                provider: options.provider,
              } as const);
            } catch (parseError) {
              // If parsing fails, still emit final message
              controller.enqueue({
                type: "final-message",
                text: fullText,
                raw: data,
                timestamp: Date.now(),
                provider: options.provider,
              } as const);
            }

            controller.enqueue({
              type: "complete",
              timestamp: Date.now(),
              provider: options.provider,
            } as const);
            return;
          }

          const t = data?.type as
            | "content_block_delta"
            | "message_stop"
            | "content_block_start"
            | "ping"
            | undefined;

          if (!t) continue;

          switch (t) {
            case "content_block_delta": {
              const delta = data.delta?.text || "";
              if (delta) {
                fullText += delta;
                controller.enqueue({
                  type: "token-delta",
                  delta,
                  timestamp: Date.now(),
                  provider: options.provider,
                } as const);
              }
              break;
            }
            case "message_stop": {
              // For object streaming, try to parse the accumulated text
              try {
                const parsed = JSON.parse(fullText);
                controller.enqueue({
                  type: "final-message",
                  text: fullText,
                  raw: { object: parsed, ...data },
                  timestamp: Date.now(),
                  provider: options.provider,
                } as const);
              } catch (parseError) {
                controller.enqueue({
                  type: "error",
                  error: parseError as Error,
                  timestamp: Date.now(),
                  provider: options.provider,
                } as const);
              }

              controller.enqueue({
                type: "complete",
                timestamp: Date.now(),
                provider: options.provider,
              } as const);
              break;
            }
            case "content_block_start":
            case "ping":
              // No action needed
              break;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    controller.error(error as Error);
  }
}
