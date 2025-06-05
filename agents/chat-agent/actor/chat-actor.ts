import { AgentRuntimeProcessingError } from "@/agent-runtime/errors.js"
import type {
    AgentActivity,
    AgentActivityType,
    AgentRuntimeId,
    AgentWorkflow,
} from "@/agent-runtime/types.js"
import { ActorRuntimeManager } from "@/ea-actor-runtime/index.js"
import { Effect, Stream } from "effect"
import type { ChatAgentState } from "../agent/agent.js"
import { ChatAgent } from "../agent/agent.js"
import type { ChatAgentConfig } from "../agent/types.js"
import { DEFAULT_CHAT_CONFIG } from "../agent/types.js"

/** Convenience payload shape for STATE_CHANGE activities */
interface ChatMessagePayload {
    readonly role: "user" | "assistant" | "system"
    readonly content: string
    readonly metadata?: Record<string, unknown>
}

export interface ChatActorHandle {
    readonly id: AgentRuntimeId
    readonly postUserMessage: (content: string) => Promise<void>
    readonly getState: () => Promise<ChatAgentState>
    readonly subscribe: () => AsyncIterable<AgentActivity>
    readonly stop: () => Promise<void>
}

export async function startChatActor(params: {
    readonly runtimeSvc: import("@/agent-runtime/api.js").AgentRuntimeServiceApi
    readonly userId: string
    readonly sessionId: string
    readonly config?: Partial<ChatAgentConfig>
}): Promise<ChatActorHandle> {
    // 1. build inner ChatAgent (LangGraph + helpers)
    const chatAgentInner = new ChatAgent(
        params.runtimeSvc,
        { ...DEFAULT_CHAT_CONFIG, ...params.config }
    )

    const initialState = await chatAgentInner.createInitialState(
        params.userId,
        params.sessionId
    )

    // 2. Workflow bridging mailbox -> LangGraph
    const workflow: AgentWorkflow<ChatAgentState, AgentRuntimeProcessingError> = (
        activity,
        state
    ) =>
        Effect.gen(function* () {
            if (activity.type !== ("STATE_CHANGE" as AgentActivityType)) return state

            const updatedState = chatAgentInner.addMessage(
                activity.payload as ChatMessagePayload,
                state
            )

            const result = yield* Effect.tryPromise(() =>
                chatAgentInner.getCompiledGraph().invoke(updatedState, {
                    configurable: { ea_activity_payload: activity.payload }
                })
            ).pipe(
                Effect.mapError(
                    (cause) =>
                        new AgentRuntimeProcessingError({
                            agentRuntimeId: activity.agentRuntimeId,
                            activityId: activity.id,
                            message: "LangGraph execution failed",
                            cause
                        })
                )
            )

            return result as ChatAgentState
        })

    // 3. Spin up actor runtime
    const actorId = ("chat-" + crypto.randomUUID()) as AgentRuntimeId;
    const actor = await Effect.runPromise(
        ActorRuntimeManager.create<ChatAgentState>(actorId, initialState, workflow)
    )

    // 4. Helper methods
    const postUserMessage = async (content: string) => {
        const activity: AgentActivity = {
            id: crypto.randomUUID(),
            agentRuntimeId: actor.id,
            timestamp: Date.now(),
            type: "STATE_CHANGE" as AgentActivityType,
            payload: { role: "user", content } satisfies ChatMessagePayload,
            metadata: { priority: 1 },
            sequence: 0
        }
        await Effect.runPromise(actor.send(activity))
    }

    const getState = () =>
        Effect.runPromise(
            actor.getState().pipe(Effect.map(s => s.state))
        )

    const subscribe = () => {
        const stream = actor.subscribe()
        return Stream.toAsyncIterable(stream)
    }

    const stop = () => Effect.runPromise(actor.terminate())

    return {
        id: actor.id,
        postUserMessage,
        getState,
        subscribe,
        stop
    }
} 