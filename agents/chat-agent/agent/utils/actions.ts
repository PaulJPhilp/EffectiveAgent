/**
 * Async action helpers for LangGraph nodes
 * @file Provides Promise-based API for EA service interactions
 */

import type { AgentRuntimeServiceApi } from "@/ea-agent-runtime/api.js";
import { runEffect } from "@/ea-langgraph-sdk/helpers.js";
import {
    generateAiResponseEffect,
    logActivityEffect,
    validateUserPoliciesEffect
} from "./effect-definitions.js";

/**
 * Generate AI response using EA services
 */
export async function generateAiResponse(
    runtime: AgentRuntimeServiceApi,
    prompt: string,
    modelId = "gpt-4"
): Promise<string> {
    return runEffect(
        runtime,
        generateAiResponseEffect(prompt, modelId),
        {
            operation: "generate_ai_response",
            nodeId: "generate-response"
        }
    )
}

/**
 * Validate user action against policies
 */
export async function validateUserPolicies(
    runtime: AgentRuntimeServiceApi,
    userId: string,
    sessionId: string,
    messageCount: number
): Promise<{ allowed: boolean; reason: string }> {
    return runEffect(
        runtime,
        validateUserPoliciesEffect(userId, sessionId, messageCount),
        {
            operation: "validate_policies",
            nodeId: "validate-conversation"
        }
    )
}

/**
 * Log activity through EA logging system
 */
export async function logActivity(
    runtime: AgentRuntimeServiceApi,
    operation: string,
    data: Record<string, unknown>,
    metadata: Record<string, unknown> = {}
): Promise<void> {
    return runEffect(
        runtime,
        logActivityEffect(operation, data, metadata),
        {
            operation: "log_activity",
            nodeId: metadata.nodeId as string || "unknown"
        }
    )
} 