/**
 * @file Defines specific errors for the Tool services.
 * @module services/tools/errors
 */

import { Data } from "effect";
// Correct import path for ParseError
import type { ParseError } from "effect/ParseResult";

// --- Base Tool Error (Optional but good practice) ---
/** Base error for all tool-related failures. */
export class ToolError extends Data.TaggedError("ToolError")<{
    readonly toolName?: string; // Optional: Tool name might not be known for all errors
    readonly message: string;
    readonly cause?: unknown; // Underlying cause
}> { }

// --- Specific Tool Errors ---

/** Error when a requested tool cannot be found in the registry. */
export class ToolNotFoundError extends Data.TaggedClass("ToolNotFoundError")<{
    readonly toolName: string;
}> {
    get message() {
        return `Tool not found in registry: ${this.toolName}`;
    }
    // Optionally extend ToolError if base class is used
}

/** Error when the input provided to a tool fails validation against its inputSchema. */
export class ToolInputValidationError extends Data.TaggedClass(
    "ToolInputValidationError",
)<{
    readonly toolName: string;
    readonly cause: ParseError; // The specific schema validation error
}> {
    get message() {
        return `Invalid input provided for tool: ${this.toolName}`;
    }
    // Optionally extend ToolError
}

/** Error when the output produced by a tool's implementation fails validation against its outputSchema. */
export class ToolOutputValidationError extends Data.TaggedClass(
    "ToolOutputValidationError",
)<{
    readonly toolName: string;
    readonly cause: ParseError; // The specific schema validation error
}> {
    get message() {
        return `Invalid output received from tool implementation: ${this.toolName}`;
    }
    // Optionally extend ToolError
}

/** Generic error occurring during the execution of a tool's implementation logic. */
export class ToolExecutionError extends Data.TaggedClass("ToolExecutionError")<{
    readonly toolName: string;
    readonly input?: unknown; // Optional input context for debugging
    readonly cause: unknown; // The original error (e.g., from Effect impl, HTTP client, MCP client, permission denial)
}> {
    get message() {
        // Provide a more informative message if possible
        let detail = "Unknown execution error";
        if (this.cause instanceof Error) {
            detail = this.cause.message;
        } else if (typeof this.cause === 'string') {
            // Include permission denial message directly
            if (this.cause.startsWith("Permission denied")) return this.cause;
            detail = this.cause;
        }
        return `Error during execution of tool '${this.toolName}': ${detail}`;
    }
    // Optionally extend ToolError
}

// --- Optional: MCP Client Specific Errors ---
// If we build a dedicated McpClient service, it might have its own errors
// export class McpClientError extends Data.TaggedError("McpClientError")<{...}> {}
