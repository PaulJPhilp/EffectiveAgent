import { EffectiveError } from "@/errors.js"

/**
 * Error class for mock WebSocket server errors
 */
export class MockWebSocketServerError extends EffectiveError {
    constructor(params: { message: string, cause?: unknown }) {
        super({ description: params.message, cause: params.cause, module: "MockWebSocketServer", method: "MockWebSocketServerError" });
    }
}