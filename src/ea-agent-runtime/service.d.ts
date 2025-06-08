import { EffectiveError } from "@/errors.js";
import { Effect, Stream } from "effect";
import type { AgentRuntimeServiceApi } from "./api.js";
import { AgentRuntimeError, AgentRuntimeNotFoundError } from "./errors.js";
import { AgentActivity, AgentRuntimeId, AgentRuntimeState, CompiledLangGraph, LangGraphAgentRuntimeState, LangGraphRunOptions } from "./types.js";
declare const AgentRuntimeService_base: Effect.Service.Class<AgentRuntimeServiceApi, "AgentRuntimeService", {
    readonly effect: Effect.Effect<{
        create: <S>(id: AgentRuntimeId, initialState: S) => Effect.Effect<{
            id: AgentRuntimeId;
            send: (_activity: AgentActivity) => Effect.Effect<undefined, never, never>;
            getState: () => Effect.Effect<AgentRuntimeState<S>, never, never>;
            subscribe: () => Stream.Stream<never, never, never>;
        }, AgentRuntimeError, never>;
        terminate: (id: AgentRuntimeId) => Effect.Effect<undefined, AgentRuntimeNotFoundError, never>;
        send: (_id: AgentRuntimeId, _activity: AgentActivity) => Effect.Effect<undefined, never, never>;
        getState: <S_1>(id: AgentRuntimeId) => Effect.Effect<AgentRuntimeState<any>, AgentRuntimeNotFoundError, never>;
        subscribe: (_id: AgentRuntimeId) => Stream.Stream<never, never, never>;
        getModelService: () => Effect.Effect<import("@/services/ai/index.js").ModelServiceApi, never, never>;
        getProviderService: () => Effect.Effect<import("@/services/ai/index.js").ProviderServiceApi, never, never>;
        getPolicyService: () => Effect.Effect<import("@/services/ai/policy/api.js").PolicyServiceApi, never, never>;
        getToolRegistryService: () => Effect.Effect<import("@/services/ai/tool-registry/api.js").ToolRegistry, never, never>;
        getChatService: () => any;
        createLangGraphAgent: <TState extends {
            readonly agentRuntime: any;
        }>(compiledGraph: CompiledLangGraph<TState>, initialState: TState, langGraphRunOptions?: LangGraphRunOptions) => Effect.Effect<{
            agentRuntime: {
                id: AgentRuntimeId;
                send: (_activity: AgentActivity) => Effect.Effect<undefined, never, never>;
                getState: () => Effect.Effect<LangGraphAgentRuntimeState<TState>, never, never>;
                subscribe: () => Stream.Stream<never, never, never>;
            };
            agentRuntimeId: AgentRuntimeId;
        }, never, never>;
        run: <Output, LogicError = EffectiveError>(logicToRun: Effect.Effect<Output, LogicError, any>) => Promise<Output>;
    }, never, import("@/services/ai/index.js").ModelServiceApi | import("@/services/ai/index.js").ProviderServiceApi | import("@/services/ai/policy/api.js").PolicyServiceApi | import("@/services/ai/tool-registry/api.js").ToolRegistry>;
}>;
export declare class AgentRuntimeService extends AgentRuntimeService_base {
}
export {};
//# sourceMappingURL=service.d.ts.map