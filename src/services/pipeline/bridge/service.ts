import {
    AgentRecord,
    AgentRecordType,
    AgentRuntimeError,
    AgentRuntimeId,
    AgentRuntimeService,
    AgentRuntimeState,
    makeAgentRuntimeId
} from "@/agent-runtime/index.js";
import { Effect, Stream } from "effect";
import type { BridgeServiceApi } from "./api.js";

/**
 * Initial state for new agent runtime instances
 */
interface BridgeState {
    messages: string[];
}

/**
 * Implementation of the Bridge Service
 */
export class BridgeService extends Effect.Service<BridgeServiceApi>()(
    "BridgeService",
    {
        effect: Effect.gen(function* () {
            // Get AgentRuntimeService instance
            const agentRuntimeService = yield* AgentRuntimeService;

            return {
                createAgentRuntime: () =>
                    Effect.gen(function* () {
                        const id = makeAgentRuntimeId(crypto.randomUUID());
                        const initialState: BridgeState = { messages: [] };
                        yield* agentRuntimeService.create(id, initialState);
                        return id;
                    }),

                sendMessage: (id: AgentRuntimeId, message: string) =>
                    Effect.gen(function* () {
                        const record: AgentRecord = {
                            id: crypto.randomUUID(),
                            agentRuntimeId: id,
                            timestamp: Date.now(),
                            type: AgentRecordType.MESSAGE,
                            payload: { message },
                            metadata: {}
                        };
                        yield* agentRuntimeService.send(id, record);
                    }),

                getState: <S>(id: AgentRuntimeId) =>
                    agentRuntimeService.getState<S>(id),

                subscribe: (id: AgentRuntimeId) =>
                    agentRuntimeService.subscribe(id),

                terminate: (id: AgentRuntimeId) =>
                    agentRuntimeService.terminate(id)
            };
        })
    }
);