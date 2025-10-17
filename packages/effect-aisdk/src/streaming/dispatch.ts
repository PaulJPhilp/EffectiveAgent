/* eslint-disable @typescript-eslint/no-explicit-any */

import type { StreamCallbacks, UnifiedStreamEvent } from "./types";

/**
 * Centralized, exhaustive dispatcher for unified stream events.
 * Routes each event to the appropriate callback.
 */
export function dispatchUnifiedEvent(
    event: UnifiedStreamEvent,
    callbacks: StreamCallbacks
): void {
    switch (event.type) {
        case "token-delta":
            callbacks.onTokenDelta?.(event);
            break;
        case "message-part":
            callbacks.onMessagePart?.(event);
            break;
        case "tool-call-started":
            callbacks.onToolCallStarted?.(event);
            break;
        case "tool-call-delta":
            callbacks.onToolCallDelta?.(event);
            break;
        case "tool-call-ready":
            callbacks.onToolCallReady?.(event);
            break;
        case "tool-result":
            callbacks.onToolResult?.(event);
            break;
        case "final-message":
            callbacks.onFinalMessage?.(event);
            break;
        case "error":
            callbacks.onError?.(event);
            break;
        case "complete":
            callbacks.onComplete?.(event);
            break;
        default:
            // Exhaustive switch - all cases covered
            break;
    }
}

