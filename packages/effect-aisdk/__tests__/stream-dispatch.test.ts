/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, expect, it, vi } from "vitest";
import { dispatchUnifiedEvent } from "../src/streaming/dispatch.js";
import type { StreamCallbacks, UnifiedStreamEvent } from "../src/streaming/types.js";

describe("dispatchUnifiedEvent", () => {
    it("invokes onTokenDelta for token-delta events", () => {
        const spy = vi.fn();
        const callbacks: StreamCallbacks = { onTokenDelta: spy };

        const event: UnifiedStreamEvent = {
            type: "token-delta",
            timestamp: 0,
            provider: "openai",
            delta: "hello",
        };

        dispatchUnifiedEvent(event, callbacks);
        expect(spy).toHaveBeenCalledWith(event);
    });

    it("invokes onFinalMessage for final-message events", () => {
        const spy = vi.fn();
        const callbacks: StreamCallbacks = { onFinalMessage: spy };

        const event: UnifiedStreamEvent = {
            type: "final-message",
            timestamp: 1,
            provider: "openai",
            text: "Complete message",
        };

        dispatchUnifiedEvent(event, callbacks);
        expect(spy).toHaveBeenCalledWith(event);
    });

    it("invokes onComplete for complete events", () => {
        const spy = vi.fn();
        const callbacks: StreamCallbacks = { onComplete: spy };

        const event: UnifiedStreamEvent = {
            type: "complete",
            timestamp: 2,
            provider: "openai",
        };

        dispatchUnifiedEvent(event, callbacks);
        expect(spy).toHaveBeenCalledWith(event);
    });

    it("invokes onMessagePart for message-part events", () => {
        const spy = vi.fn();
        const callbacks: StreamCallbacks = { onMessagePart: spy };

        const event: UnifiedStreamEvent = {
            type: "message-part",
            timestamp: 3,
            provider: "openai",
            contentPart: "part",
        };

        dispatchUnifiedEvent(event, callbacks);
        expect(spy).toHaveBeenCalledWith(event);
    });

    it("invokes onToolCallStarted for tool-call-started events", () => {
        const spy = vi.fn();
        const callbacks: StreamCallbacks = { onToolCallStarted: spy };

        const event: UnifiedStreamEvent = {
            type: "tool-call-started",
            timestamp: 4,
            provider: "openai",
            toolName: "calculator",
        };

        dispatchUnifiedEvent(event, callbacks);
        expect(spy).toHaveBeenCalledWith(event);
    });

    it("invokes onError for error events", () => {
        const spy = vi.fn();
        const callbacks: StreamCallbacks = { onError: spy };

        const event: UnifiedStreamEvent = {
            type: "error",
            timestamp: 5,
            provider: "openai",
            error: new Error("Test error"),
        };

        dispatchUnifiedEvent(event, callbacks);
        expect(spy).toHaveBeenCalledWith(event);
    });

    it("handles multiple events in sequence", () => {
        const calls: string[] = [];
        const callbacks: StreamCallbacks = {
            onTokenDelta: () => calls.push("delta"),
            onFinalMessage: () => calls.push("final"),
            onComplete: () => calls.push("complete"),
        };

        const events: UnifiedStreamEvent[] = [
            { type: "token-delta", timestamp: 0, provider: "openai", delta: "a" },
            { type: "token-delta", timestamp: 1, provider: "openai", delta: "b" },
            { type: "final-message", timestamp: 2, provider: "openai", text: "ab" },
            { type: "complete", timestamp: 3, provider: "openai" },
        ];

        for (const event of events) {
            dispatchUnifiedEvent(event, callbacks);
        }

        expect(calls).toEqual(["delta", "delta", "final", "complete"]);
    });

    it("does not invoke missing callbacks", () => {
        const spy = vi.fn();
        const callbacks: StreamCallbacks = {}; // No callbacks defined

        const event: UnifiedStreamEvent = {
            type: "token-delta",
            timestamp: 0,
            provider: "openai",
            delta: "test",
        };

        // Should not throw
        expect(() => dispatchUnifiedEvent(event, callbacks)).not.toThrow();
        expect(spy).not.toHaveBeenCalled();
    });

    it("handles all event types exhaustively", () => {
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
            { type: "token-delta", timestamp: 0, provider: "openai", delta: "" },
            { type: "message-part", timestamp: 0, provider: "openai", contentPart: "" },
            { type: "tool-call-started", timestamp: 0, provider: "openai", toolName: "" },
            { type: "tool-call-delta", timestamp: 0, provider: "openai", toolName: "", argsDelta: {} },
            { type: "tool-call-ready", timestamp: 0, provider: "openai", toolName: "", argsFinal: {} },
            { type: "tool-result", timestamp: 0, provider: "openai", toolName: "", result: null },
            { type: "final-message", timestamp: 0, provider: "openai", text: "" },
            { type: "error", timestamp: 0, provider: "openai", error: new Error() },
            { type: "complete", timestamp: 0, provider: "openai" },
        ];

        for (const event of events) {
            dispatchUnifiedEvent(event, callbacks);
        }

        // Verify all callbacks were called once
        for (const cb of Object.values(callbacks)) {
            if (typeof cb === "function") {
                expect((cb as any).mock.calls.length).toBe(1);
            }
        }
    });
});
