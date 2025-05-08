import {
    makeAgentRuntimeId,
    AgentRuntimeService
} from "@/agent-runtime/index.js";
import type { AgentActivity, AgentRuntimeId } from "@/agent-runtime/types.js";
import { AgentRecordType } from "@/agent-runtime/types.js";
import type { BridgeState } from "./types.js";

import { Effect } from "effect";
import type { BridgeServiceApi } from "./api.js";

/**
 * Implementation of the Bridge Service
 */
export class BridgeService extends Effect.Service<BridgeServiceApi>()("BridgeServiceImpl", {
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
                    const record: AgentActivity = {
                        id: crypto.randomUUID(),
                        agentRuntimeId: id,
                        timestamp: Date.now(),
                        type: AgentRecordType.EVENT,
                        payload: { message },
                        sequence: Date.now(), // Using timestamp as sequence for basic ordering
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
}) { }