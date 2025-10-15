import { Effect, Ref, Stream } from "effect"
import type { EffectiveError } from "@/errors.js"
import { ModelService } from "@/services/ai/model/service.js"
import { PolicyService } from "@/services/ai/policy/service.js"
import { ProviderService } from "@/services/ai/provider/service.js"
import { ToolRegistryService } from "@/services/ai/tool-registry/service.js"
import { FileService } from "@/services/core/file/service.js"
import type { AgentRuntimeServiceApi } from "./api.js"
import {
    AgentRuntimeError,
    AgentRuntimeNotFoundError
} from "./errors.js"
import type {
    AgentActivity,
    AgentRuntimeId,
    AgentRuntimeState,
    CompiledLangGraph,
    LangGraphAgentRuntimeState,
    LangGraphRunOptions
} from "./types.js"

export class AgentRuntimeService extends Effect.Service<AgentRuntimeServiceApi>()("AgentRuntimeService", {
    effect: Effect.gen(function* () {
        // Get the configured services
        const modelService = yield* ModelService
        const providerService = yield* ProviderService
        const policyService = yield* PolicyService
        const toolRegistryService = yield* ToolRegistryService
        const fileService = yield* FileService

        // Agent management state (no mailbox/actor logic)
        const runtimes = yield* Ref.make<Map<AgentRuntimeId, Ref.Ref<AgentRuntimeState<any>>>>(new Map())

        const create = <S>(id: AgentRuntimeId, initialState: S) =>
            Effect.gen(function* () {
                const map = yield* Ref.get(runtimes)
                if (map.has(id)) {
                    return yield* Effect.fail(new AgentRuntimeError({
                        agentRuntimeId: id,
                        message: `AgentRuntime with ID ${id} already exists`
                    }))
                }

                const stateRef = yield* Ref.make<AgentRuntimeState<S>>({
                    id,
                    state: initialState,
                    status: "IDLE",
                    lastUpdated: Date.now(),
                    processing: { processed: 0, failures: 0, avgProcessingTime: 0 }
                })

                yield* Ref.update(runtimes, map => {
                    map.set(id, stateRef)
                    return map
                })

                return {
                    id,
                    send: (_activity: AgentActivity) => Effect.succeed(void 0), // No-op for agent runtime
                    getState: () => Ref.get(stateRef),
                    subscribe: () => Stream.empty // No mailbox in agent runtime
                }
            })

        const terminate = (id: AgentRuntimeId) =>
            Effect.gen(function* () {
                const map = yield* Ref.get(runtimes)
                const stateRef = map.get(id)
                if (!stateRef) {
                    return yield* Effect.fail(new AgentRuntimeNotFoundError({
                        agentRuntimeId: id,
                        message: `AgentRuntime ${id} not found`
                    }))
                }
                yield* Ref.update(runtimes, map => {
                    map.delete(id)
                    return map
                })
            })

        const send = (_id: AgentRuntimeId, _activity: AgentActivity) =>
            Effect.succeed(void 0) // No-op for agent runtime (no mailbox)

        const getState = <S>(id: AgentRuntimeId) =>
            Effect.gen(function* () {
                const map = yield* Ref.get(runtimes)
                const stateRef = map.get(id)
                if (!stateRef) {
                    return yield* Effect.fail(new AgentRuntimeNotFoundError({
                        agentRuntimeId: id,
                        message: `AgentRuntime ${id} not found`
                    }))
                }
                return yield* Ref.get(stateRef)
            })

        const subscribe = (_id: AgentRuntimeId) =>
            Stream.empty // No mailbox in agent runtime

        // Service access methods
        const getModelService = () => Effect.succeed(modelService)
        const getProviderService = () => Effect.succeed(providerService)
        const getPolicyService = () => Effect.succeed(policyService)
        const getToolRegistryService = () => Effect.succeed(toolRegistryService)
        const getFileService = () => Effect.succeed(fileService)
        const getChatService = () => {
            // Lazy import to avoid circular dependency during module initialization
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { ChatService } = require("@/services/pipeline/producers/chat/service.js")
            return ChatService
        }

        // LangGraph support (no mailbox/actor logic)
        const createLangGraphAgent = <TState extends { readonly agentRuntime: any }>(
            compiledGraph: CompiledLangGraph<TState>,
            initialState: TState,
            langGraphRunOptions?: LangGraphRunOptions
        ) => Effect.gen(function* () {
            // Generate a unique ID for this LangGraph agent
            const id = `langgraph-${Date.now()}-${Math.random().toString(36).slice(2)}` as AgentRuntimeId

            // Initialize state with LangGraph stats
            const stateRef = yield* Ref.make<LangGraphAgentRuntimeState<TState>>({
                id,
                state: initialState,
                status: "IDLE",
                lastUpdated: Date.now(),
                processing: { processed: 0, failures: 0, avgProcessingTime: 0 },
                langGraph: { invocations: 0, avgInvokeTime: 0, recursionLimitHits: 0 }
            })

            yield* Ref.update(runtimes, map => {
                map.set(id, stateRef)
                return map
            })

            return {
                agentRuntime: {
                    id,
                    send: (_activity: AgentActivity) => Effect.succeed(void 0),
                    getState: () => Ref.get(stateRef),
                    subscribe: () => Stream.empty
                },
                agentRuntimeId: id
            }
        })

        // Effect execution bridge
        const run = <Output, LogicError = EffectiveError>(
            logicToRun: Effect.Effect<Output, LogicError, any>
        ): Promise<Output> => Effect.runPromise(logicToRun as Effect.Effect<Output, LogicError, never>)

        return {
            create,
            terminate,
            send,
            getState,
            subscribe,
            getModelService,
            getProviderService,
            getPolicyService,
            getToolRegistryService,
            getFileService,
            getChatService,
            createLangGraphAgent,
            run
        } satisfies AgentRuntimeServiceApi
    }),
    dependencies: [ModelService.Default, ProviderService.Default, PolicyService.Default, ToolRegistryService.Default, FileService.Default]
}) { }