import { describe, it, expect, vi } from "vitest";
import { dispatchUnifiedEvent } from "../src/streaming/dispatch.js";
import type { StreamCallbacks, UnifiedStreamEvent } from "../src/streaming/types.js";

describe("Stream Dispatch", () => {
  it("should dispatch token-delta events to the correct callback", () => {
    const callbacks: StreamCallbacks = {
      onTokenDelta: vi.fn(),
    };

    const event: UnifiedStreamEvent = {
      type: "token-delta",
      delta: "Hello",
      timestamp: Date.now(),
      provider: "openai",
    };

    dispatchUnifiedEvent(event, callbacks);

    expect(callbacks.onTokenDelta).toHaveBeenCalledWith(event);
  });

  it("should dispatch final-message events to the correct callback", () => {
    const callbacks: StreamCallbacks = {
      onFinalMessage: vi.fn(),
    };

    const event: UnifiedStreamEvent = {
      type: "final-message",
      text: "Hello world",
      timestamp: Date.now(),
      provider: "openai",
    };

    dispatchUnifiedEvent(event, callbacks);

    expect(callbacks.onFinalMessage).toHaveBeenCalledWith(event);
  });

  it("should dispatch complete events to the correct callback", () => {
    const callbacks: StreamCallbacks = {
      onComplete: vi.fn(),
    };

    const event: UnifiedStreamEvent = {
      type: "complete",
      timestamp: Date.now(),
      provider: "openai",
    };

    dispatchUnifiedEvent(event, callbacks);

    expect(callbacks.onComplete).toHaveBeenCalledWith(event);
  });

  it("should dispatch error events to the correct callback", () => {
    const callbacks: StreamCallbacks = {
      onError: vi.fn(),
    };

    const event: UnifiedStreamEvent = {
      type: "error",
      error: new Error("Test error"),
      timestamp: Date.now(),
      provider: "openai",
    };

    dispatchUnifiedEvent(event, callbacks);

    expect(callbacks.onError).toHaveBeenCalledWith(event);
  });

  it("should handle undefined callbacks gracefully", () => {
    const callbacks: StreamCallbacks = {};

    const event: UnifiedStreamEvent = {
      type: "token-delta",
      delta: "Hello",
      timestamp: Date.now(),
      provider: "openai",
    };

    expect(() => dispatchUnifiedEvent(event, callbacks)).not.toThrow();
  });

  it("should dispatch all event types exhaustively", () => {
    const callbacks: StreamCallbacks = {
      onTokenDelta: vi.fn(),
      onMessagePart: vi.fn(),
      onToolCallStarted: vi.fn(),
      onToolCallDelta: vi.fn(),
      onToolCallReady: vi.fn(),
      onToolResult: vi.fn(),
      onFinalMessage: vi.fn(),
      onError: vi.fn(),
      onComplete: vi.fn(),
    };

    const events: UnifiedStreamEvent[] = [
      {
        type: "token-delta",
        delta: "Hello",
        timestamp: Date.now(),
        provider: "openai",
      },
      {
        type: "message-part",
        contentPart: "Part content",
        timestamp: Date.now(),
        provider: "openai",
      },
      {
        type: "tool-call-started",
        toolName: "calculator",
        timestamp: Date.now(),
        provider: "openai",
      },
      {
        type: "tool-call-delta",
        toolName: "calculator",
        argsDelta: { expression: "2+2" },
        timestamp: Date.now(),
        provider: "openai",
      },
      {
        type: "tool-call-ready",
        toolName: "calculator",
        argsFinal: { expression: "2+2" },
        timestamp: Date.now(),
        provider: "openai",
      },
      {
        type: "tool-result",
        toolName: "calculator",
        result: 4,
        timestamp: Date.now(),
        provider: "openai",
      },
      {
        type: "final-message",
        text: "Result: 4",
        timestamp: Date.now(),
        provider: "openai",
      },
      {
        type: "error",
        error: new Error("Test error"),
        timestamp: Date.now(),
        provider: "openai",
      },
      {
        type: "complete",
        timestamp: Date.now(),
        provider: "openai",
      },
    ];

    events.forEach((event) => {
      dispatchUnifiedEvent(event, callbacks);
    });

    expect(callbacks.onTokenDelta).toHaveBeenCalledTimes(1);
    expect(callbacks.onMessagePart).toHaveBeenCalledTimes(1);
    expect(callbacks.onToolCallStarted).toHaveBeenCalledTimes(1);
    expect(callbacks.onToolCallDelta).toHaveBeenCalledTimes(1);
    expect(callbacks.onToolCallReady).toHaveBeenCalledTimes(1);
    expect(callbacks.onToolResult).toHaveBeenCalledTimes(1);
    expect(callbacks.onFinalMessage).toHaveBeenCalledTimes(1);
    expect(callbacks.onError).toHaveBeenCalledTimes(1);
    expect(callbacks.onComplete).toHaveBeenCalledTimes(1);
  });
});
