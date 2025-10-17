import type { LanguageModelV1 } from "ai";
import type { Schema } from "effect";
import { dispatchUnifiedEvent } from "./dispatch";
import { createAnthropicStreamAdapter, createObjectStreamAdapter, createOpenAIStreamAdapter } from "./providers";
import type { StreamCallbacks, StreamHandle, StreamOptions, UnifiedStreamEvent } from "./types";

/**
 * Create a streaming text generation handle
 */
export function streamText(
  model: LanguageModelV1,
  options: Omit<StreamOptions, "provider">
): StreamHandle {
  const provider = detectProvider(model);

  const streamOptions: StreamOptions = {
    ...options,
    provider,
  };

  // Create a ReadableStream
  const readable = new ReadableStream<UnifiedStreamEvent>({
    async start(controller) {
      const streamController = {
        enqueue: (event: UnifiedStreamEvent) => controller.enqueue(event),
        error: (error: Error) => controller.error(error),
        close: () => controller.close(),
      };

      try {
        if (provider === "openai") {
          await createOpenAIStreamAdapter(model, streamOptions, streamController);
        } else if (provider === "anthropic") {
          await createAnthropicStreamAdapter(model, streamOptions, streamController);
        } else {
          throw new Error(`Unsupported provider: ${provider}`);
        }
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return {
    readable,
    collectText: () => collectTextFromStream(readable),
    pipeToCallbacks: (callbacks: StreamCallbacks) => pipeToCallbacks(readable, callbacks),
  };
}

/**
 * Create a streaming object generation handle
 */
export function streamObject<T>(
  model: LanguageModelV1,
  options: Omit<StreamOptions, "provider"> & { schema: Schema.Schema<T, any, never> }
): StreamHandle {
  const provider = detectProvider(model);

  const streamOptions: StreamOptions & { schema: Schema.Schema<T, any, never> } = {
    ...options,
    provider,
  };

  // Create a ReadableStream
  const readable = new ReadableStream<UnifiedStreamEvent>({
    async start(controller) {
      const streamController = {
        enqueue: (event: UnifiedStreamEvent) => controller.enqueue(event),
        error: (error: Error) => controller.error(error),
        close: () => controller.close(),
      };

      try {
        await createObjectStreamAdapter(model, streamOptions, streamController);
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return {
    readable,
    collectText: () => collectTextFromStream(readable),
    pipeToCallbacks: (callbacks: StreamCallbacks) => pipeToCallbacks(readable, callbacks),
  };
}

/**
 * Detect provider from model
 */
function detectProvider(model: LanguageModelV1): "openai" | "anthropic" | "unknown" {
  const modelId = (model as any).modelId || (model as any).model || "";
  if (modelId.includes("gpt") || modelId.includes("openai")) {
    return "openai";
  }
  if (modelId.includes("claude") || modelId.includes("anthropic")) {
    return "anthropic";
  }
  return "unknown";
}

/**
 * Collect final text from a stream
 */
async function collectTextFromStream(stream: ReadableStream<UnifiedStreamEvent>): Promise<string> {
  const reader = stream.getReader();
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value.type === "token-delta") {
        text += value.delta;
      } else if (value.type === "final-message") {
        text = value.text;
      }
    }
  } finally {
    reader.releaseLock();
  }

  return text;
}

/**
 * Pipe stream events to callback functions
 */
async function pipeToCallbacks(
  stream: ReadableStream<UnifiedStreamEvent>,
  callbacks: StreamCallbacks
): Promise<void> {
  const reader = stream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      dispatchUnifiedEvent(value, callbacks);
    }
  } finally {
    reader.releaseLock();
  }
}
