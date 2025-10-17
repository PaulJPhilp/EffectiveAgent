/* eslint-disable @typescript-eslint/no-explicit-any */

import type { CoreMessage, LanguageModelV1 } from "ai";
import { generateText } from "ai";
import {
    createAnthropicToolResultMessage,
    createOpenAIToolResultMessage,
    executeTool,
    extractAnthropicToolCalls,
    extractOpenAIToolCalls,
    prepareToolDefinitionsForProvider,
    validateToolCall,
} from "./providers.js";
import type {
    Tool,
    ToolCall,
    ToolCallingOptions,
    ToolOrchestrationResult,
    ToolResult,
} from "./types.js";

/**
 * Main tool orchestration engine
 * Handles multi-turn tool calling loops until completion
 */
export async function orchestrateTools(
    model: LanguageModelV1,
    messages: CoreMessage[],
    tools: Tool[],
    options?: ToolCallingOptions
): Promise<ToolOrchestrationResult> {
    const maxTurns = options?.maxTurns ?? 5;
    const toolTimeout = options?.toolTimeout ?? 30000;
    const continueOnError = options?.continueOnError ?? true;

    const conversationMessages: CoreMessage[] = [...messages];
    const allToolCalls: ToolCall[] = [];
    const allToolResults: ToolResult[] = [];
    let turnCount = 0;
    let shouldContinue = true;

    const { provider, toolDefinitions } = prepareToolDefinitionsForProvider(model, tools);
    const toolMap = new Map(tools.map((t) => [t.definition.name, t]));

    while (shouldContinue && turnCount < maxTurns) {
        turnCount++;

        // Generate next response with tools available
        try {
            const response = await generateText({
                model,
                messages: conversationMessages,
                tools:
                    provider === "openai"
                        ? ({ type: "object", tools: toolDefinitions } as any)
                        : undefined,
                toolChoice: "auto" as any,
                temperature: 0.7,
                maxTokens: 2048,
                system: buildSystemPromptWithTools(tools),
            } as any);

            // Extract tool calls from response
            let toolCalls: ToolCall[] = [];

            if (provider === "openai" && (response as any).toolCalls) {
                toolCalls = extractOpenAIToolCalls((response as any));
            } else if (provider === "anthropic" && (response as any).content) {
                toolCalls = extractAnthropicToolCalls((response as any).content);
            }

            // If no tool calls, we're done
            if (toolCalls.length === 0) {
                // Add final assistant message
                conversationMessages.push({
                    role: "assistant",
                    content: response.text || "",
                });
                shouldContinue = false;
                break;
            }

            // Add assistant message with tool calls to conversation
            conversationMessages.push({
                role: "assistant",
                content: response.text || "",
            });

            // Execute tools
            const results: ToolResult[] = [];

            for (const toolCall of toolCalls) {
                const tool = toolMap.get(toolCall.toolName);

                if (!tool) {
                    results.push({
                        id: toolCall.id,
                        toolName: toolCall.toolName,
                        args: toolCall.args,
                        result: null,
                        error: `Tool not found: ${toolCall.toolName}`,
                        isError: true,
                    });
                    continue;
                }

                // Validate tool call
                const validation = await validateToolCall(toolCall, tool);
                if (!validation.valid) {
                    results.push({
                        id: toolCall.id,
                        toolName: toolCall.toolName,
                        args: toolCall.args,
                        result: null,
                        error: validation.error,
                        isError: true,
                    });
                    continue;
                }

                // Check approval if needed
                if (options?.onApproval) {
                    const approved = await options.onApproval(toolCall);
                    if (!approved) {
                        results.push({
                            id: toolCall.id,
                            toolName: toolCall.toolName,
                            args: toolCall.args,
                            result: null,
                            error: "Tool call denied by user",
                            isError: true,
                        });
                        continue;
                    }
                }

                // Execute tool
                const result = await executeTool(
                    toolCall.toolName,
                    toolCall.args,
                    tool.handler,
                    toolTimeout
                );
                results.push(result);

                if (result.isError && !continueOnError) {
                    shouldContinue = false;
                    break;
                }
            }

            allToolCalls.push(...toolCalls);
            allToolResults.push(...results);

            // If error occurred and continueOnError is false, stop
            if (!shouldContinue) {
                break;
            }

            // Add tool results to conversation
            const toolResultMessage =
                provider === "openai"
                    ? createOpenAIToolResultMessage(results)
                    : createAnthropicToolResultMessage(results);

            conversationMessages.push(toolResultMessage);
        } catch (error: any) {
            allToolResults.push({
                id: "",
                toolName: "error",
                args: {},
                result: null,
                error: error?.message || "Failed to generate response",
                isError: true,
            });

            if (!continueOnError) {
                shouldContinue = false;
            }
        }
    }

    return {
        toolCalls: allToolCalls,
        toolResults: allToolResults,
        finalMessages: conversationMessages as Array<{ role: "user" | "assistant"; content: any }>,
        turnCount,
        reason:
            turnCount >= maxTurns
                ? "max_turns"
                : allToolResults.some((r) => r.isError && !r.toolName.startsWith("error"))
                    ? "error"
                    : "completed",
    };
}

/**
 * Build system prompt that includes tool descriptions
 */
function buildSystemPromptWithTools(tools: Tool[]): string {
    if (tools.length === 0) {
        return "You are a helpful assistant.";
    }

    const toolDescriptions = tools
        .map((t) => `- ${t.definition.name}: ${t.definition.description}`)
        .join("\n");

    return `You are a helpful assistant with access to the following tools:

${toolDescriptions}

Use these tools when appropriate to help the user.`;
}
