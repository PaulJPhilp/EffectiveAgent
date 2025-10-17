/* eslint-disable @typescript-eslint/no-explicit-any */

import type { LanguageModelV1 } from "ai";
import { parseToolArguments, toJsonSchema } from "./schema.js";
import type {
    Tool,
    ToolCall,
    ToolResult
} from "./types.js";

/**
 * Create a tool calling request for OpenAI format
 */
export function createOpenAIToolDefinitions(tools: Tool[]): any[] {
    return tools.map((tool) => ({
        type: "function",
        function: {
            name: tool.definition.name,
            description: tool.definition.description,
            parameters: toJsonSchema(tool.definition.schema),
        },
    }));
}

/**
 * Create a tool calling request for Anthropic format
 */
export function createAnthropicToolDefinitions(tools: Tool[]): any[] {
    return tools.map((tool) => ({
        name: tool.definition.name,
        description: tool.definition.description,
        input_schema: toJsonSchema(tool.definition.schema),
    }));
}

/**
 * Extract tool calls from OpenAI response
 */
export function extractOpenAIToolCalls(message: any): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
            if (toolCall.type === "function") {
                try {
                    const args = JSON.parse(toolCall.function.arguments || "{}");
                    toolCalls.push({
                        id: toolCall.id,
                        toolName: toolCall.function.name,
                        args,
                    });
                } catch {
                    // Skip malformed tool calls
                }
            }
        }
    }

    return toolCalls;
}

/**
 * Extract tool calls from Anthropic response
 */
export function extractAnthropicToolCalls(content: any[]): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    for (const block of content || []) {
        if (block.type === "tool_use") {
            toolCalls.push({
                id: block.id,
                toolName: block.name,
                args: block.input || {},
            });
        }
    }

    return toolCalls;
}

/**
 * Create tool result message for OpenAI format
 */
export function createOpenAIToolResultMessage(results: ToolResult[]): any {
    return {
        role: "user",
        content: results.map((result) => ({
            type: "tool_result",
            tool_call_id: result.id,
            content: result.isError ? `Error: ${result.error}` : JSON.stringify(result.result),
            is_error: result.isError || false,
        })),
    };
}

/**
 * Create tool result message for Anthropic format
 */
export function createAnthropicToolResultMessage(results: ToolResult[]): any {
    const content: any[] = [];

    for (const result of results) {
        content.push({
            type: "tool_result",
            tool_use_id: result.id,
            content: result.isError ? `Error: ${result.error}` : JSON.stringify(result.result),
            is_error: result.isError || false,
        });
    }

    return {
        role: "user",
        content,
    };
}

/**
 * Execute a tool handler with timeout and error handling
 */
export async function executeTool(
    toolName: string,
    args: any,
    handler: any,
    timeout?: number
): Promise<ToolResult> {
    const id = crypto.getRandomValues(new Uint8Array(16)).toString();

    try {
        let result: any;

        if (timeout) {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Tool timeout after ${timeout}ms`)), timeout)
            );
            result = await Promise.race([handler(args), timeoutPromise]);
        } else {
            result = await handler(args);
        }

        return {
            id,
            toolName,
            args,
            result,
            isError: false,
        };
    } catch (error: any) {
        return {
            id,
            toolName,
            args,
            result: null,
            error: error?.message || "Unknown error",
            isError: true,
        };
    }
}

/**
 * Validate tool call before execution
 */
export async function validateToolCall(
    toolCall: ToolCall,
    tool: Tool
): Promise<{ valid: true } | { valid: false; error: string }> {
    const parseResult = await parseToolArguments(toolCall.args, tool.definition.schema);

    if (!parseResult.success) {
        return { valid: false, error: parseResult.error };
    }

    return { valid: true };
}

/**
 * Detect provider from model and prepare tool definitions
 */
export function prepareToolDefinitionsForProvider(
    model: LanguageModelV1,
    tools: Tool[]
): { provider: "openai" | "anthropic"; toolDefinitions: any[] } {
    const modelId = (model as any).modelId || (model as any).model || "";

    if (modelId.includes("gpt") || modelId.includes("openai")) {
        return {
            provider: "openai",
            toolDefinitions: createOpenAIToolDefinitions(tools),
        };
    }

    if (modelId.includes("claude") || modelId.includes("anthropic")) {
        return {
            provider: "anthropic",
            toolDefinitions: createAnthropicToolDefinitions(tools),
        };
    }

    throw new Error(`Unsupported model for tool calling: ${modelId}`);
}
