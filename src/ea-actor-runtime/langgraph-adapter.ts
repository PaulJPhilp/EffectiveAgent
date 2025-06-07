/**
 * @file Adapter to bridge LangGraph agents with the EA Actor Runtime.
 */
import type { AgentRuntimeServiceApi } from "@/ea-agent-runtime/api.js"
import { Effect } from "effect"
import { AgentRuntimeProcessingError } from "./errors.js"
import type { AgentActivity, AgentWorkflow } from "./types.js"

/**
 * Creates an AgentWorkflow from a compiled LangGraph.
 *
 * @param graph The compiled LangGraph instance.
 * @returns An AgentWorkflow function compatible with the ActorRuntimeManager.
 */
export function createLangGraphWorkflow<TState extends { agentRuntime: AgentRuntimeServiceApi }>(
    graph: any
): AgentWorkflow<TState, AgentRuntimeProcessingError> {
    return (
        activity: AgentActivity,
        currentState: TState
    ): Effect.Effect<TState, AgentRuntimeProcessingError> => {
        return Effect.tryPromise({
            try: async () => {
                // The input to the graph is the content of the user message.
                // LangGraph state management is internal to the graph execution.
                const graphInput = {
                    messages: [activity.payload.content]
                }

                // We need to provide the full current state to the graph's invoke method
                // so it has access to the agentRuntime and other context.
                const graphResult = await graph.invoke(graphInput, {
                    config: {
                        configurable: {
                            ...currentState
                        }
                    }
                })

                // The result of the graph invocation is the new state.
                return graphResult
            },
            catch: e =>
                new AgentRuntimeProcessingError({
                    agentRuntimeId: activity.agentRuntimeId,
                    activityId: "unknown", // Placeholder as activity has no ID
                    message: e instanceof Error ? e.message : "Unknown LangGraph error",
                    cause: e
                })
        })
    }
} 