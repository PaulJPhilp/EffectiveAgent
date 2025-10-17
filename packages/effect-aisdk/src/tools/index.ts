/* eslint-disable @typescript-eslint/no-explicit-any */

import type { LanguageModelV1 } from "ai";
import { orchestrateTools } from "./orchestration.js";
import type { Tool, ToolCallingOptions, ToolHandler, ToolOrchestrationResult } from "./types.js";

/**
 * Define a new tool
 */
export function defineTool(
    name: string,
    schema: any,
    handler: ToolHandler
): Tool {
    return {
        definition: {
            name,
            description: "",
            schema,
        },
        handler,
    };
}

/**
 * Define a new tool with description
 */
export function defineToolWithDescription(
    name: string,
    description: string,
    schema: any,
    handler: ToolHandler
): Tool {
    return {
        definition: {
            name,
            description,
            schema,
        },
        handler,
    };
}

/**
 * Main API for running tools with a model
 */
export async function runTools(
    model: LanguageModelV1,
    messages: any[],
    tools: Tool[],
    options?: ToolCallingOptions
): Promise<ToolOrchestrationResult> {
    if (tools.length === 0) {
        throw new Error("At least one tool must be provided");
    }

    return orchestrateTools(model, messages, tools, options);
}

/**
 * Alternative API using a tools map
 */
export async function runToolsWithMap(
    model: LanguageModelV1,
    messages: any[],
    toolsMap: Record<string, { schema: any; handler: ToolHandler; description?: string }>,
    options?: ToolCallingOptions
): Promise<ToolOrchestrationResult> {
    const tools = Object.entries(toolsMap).map(([name, { schema, handler, description }]) => ({
        definition: {
            name,
            description: description || "",
            schema,
        },
        handler,
    }));

    if (tools.length === 0) {
        throw new Error("At least one tool must be provided");
    }

    return orchestrateTools(model, messages, tools, options);
}

/**
 * Export tool types for users
 */
export type { Tool, ToolCall, ToolCallingOptions, ToolDefinition, ToolHandler, ToolResult } from "./types.js";

