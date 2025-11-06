/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Schema } from "effect";
import type { z } from "zod";

/**
 * Tool schema types supporting Zod, Effect Schema, or JSON Schema
 */
export type ToolSchemaType =
    | z.ZodType<any, any, any>
    | Schema.Schema<any, any, any>
    | { type: "object"; properties: Record<string, any>; required?: string[] };

/**
 * Represents a single tool or function definition
 */
export interface ToolDefinition {
    name: string;
    description: string;
    schema: ToolSchemaType;
}

/**
 * Handler function for tool execution
 */
export type ToolHandler = (args: any) => Promise<any> | any;

/**
 * Complete tool with definition and handler
 */
export interface Tool {
    definition: ToolDefinition;
    handler: ToolHandler;
}

/**
 * Tool call from AI model
 */
export interface ToolCall {
    id: string;
    toolName: string;
    args: Record<string, any>;
}

/**
 * Tool execution result
 */
export interface ToolResult {
    id: string;
    toolName: string;
    args: Record<string, any>;
    result: any;
    error?: string;
    isError?: boolean;
}

/**
 * Options for tool calling behavior
 */
export interface ToolCallingOptions {
    /** Maximum number of tool calling turns */
    maxTurns?: number;
    /** Timeout per tool execution in ms */
    toolTimeout?: number;
    /** Optional approval callback to allow/deny tool calls */
    onApproval?: (toolCall: ToolCall) => Promise<boolean> | boolean;
    /** Continue execution even if a tool call fails */
    continueOnError?: boolean;
}

/**
 * Tool orchestration context and state
 */
export interface ToolOrchestrationContext {
    toolCalls: ToolCall[];
    toolResults: ToolResult[];
    turnCount: number;
    aborted: boolean;
}

/**
 * Result of tool execution orchestration
 */
export interface ToolOrchestrationResult {
    toolCalls: ToolCall[];
    toolResults: ToolResult[];
    finalMessages: Array<{ role: "assistant" | "user"; content: any }>;
    turnCount: number;
    reason: "completed" | "max_turns" | "error" | "abort";
}

/**
 * OpenAI-specific tool call format
 */
export interface OpenAIToolCall {
    id: string;
    type: "function";
    function: {
        name: string;
        arguments: string; // JSON string
    };
}

/**
 * Anthropic-specific tool use format
 */
export interface AnthropicToolUse {
    type: "tool_use";
    id: string;
    name: string;
    input: Record<string, any>;
}

/**
 * Unified tool call result message format
 */
export interface ToolResultMessage {
    role: "user";
    content: Array<{
        type: "tool_result";
        tool_use_id?: string; // Anthropic
        tool_call_id?: string; // OpenAI
        content: string;
        is_error?: boolean;
    }>;
}
