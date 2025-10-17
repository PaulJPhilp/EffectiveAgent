import { describe, it, expect, vi, beforeEach } from "vitest";
import { streamText, streamObject } from "../src/streaming/index.js";
import type { LanguageModelV1 } from "ai";

// Mock the AI SDK
vi.mock("ai", () => ({
  streamText: vi.fn(),
  streamObject: vi.fn(),
}));

describe("Streaming API", () => {
  const mockModel = {
    modelId: "gpt-4o-mini",
  } as LanguageModelV1;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("streamText", () => {
    it("should create a stream handle with readable stream", async () => {
      const options = {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hello" }],
      };

      const handle = streamText(mockModel, options);

      expect(handle).toHaveProperty("readable");
      expect(handle).toHaveProperty("collectText");
      expect(handle).toHaveProperty("pipeToCallbacks");
      expect(handle.readable).toBeInstanceOf(ReadableStream);
    });

    it("should collect text from stream", async () => {
      const options = {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hello" }],
      };

      const handle = streamText(mockModel, options);

      // Mock the stream behavior
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: { type: "token-delta", delta: "Hello" } })
          .mockResolvedValueOnce({ done: false, value: { type: "token-delta", delta: " world" } })
          .mockResolvedValueOnce({ done: false, value: { type: "final-message", text: "Hello world" } })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: vi.fn(),
      };

      vi.spyOn(handle.readable, "getReader").mockReturnValue(mockReader as any);

      const text = await handle.collectText();
      expect(text).toBe("Hello world");
    });

    it("should pipe events to callbacks", async () => {
      const options = {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hello" }],
      };

      const handle = streamText(mockModel, options);

      const callbacks = {
        onTokenDelta: vi.fn(),
        onComplete: vi.fn(),
      };

      // Mock the stream behavior
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: { type: "token-delta", delta: "Hello" } })
          .mockResolvedValueOnce({ done: false, value: { type: "complete" } })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: vi.fn(),
      };

      vi.spyOn(handle.readable, "getReader").mockReturnValue(mockReader as any);

      await handle.pipeToCallbacks(callbacks);

      expect(callbacks.onTokenDelta).toHaveBeenCalledWith(
        expect.objectContaining({ type: "token-delta", delta: "Hello" })
      );
      expect(callbacks.onComplete).toHaveBeenCalledWith(
        expect.objectContaining({ type: "complete" })
      );
    });
  });

  describe("streamObject", () => {
    it("should create a stream handle for objects", async () => {
      const options = {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Create a person object" }],
        schema: { type: "object" } as any,
      };

      const handle = streamObject(mockModel, options);

      expect(handle).toHaveProperty("readable");
      expect(handle.readable).toBeInstanceOf(ReadableStream);
    });
  });
});
