import { EffectorError, EffectorNotFoundError } from "@/effectors/effector/errors.js";
import { EffectorService } from "@/effectors/effector/service.js";
import type { AgentRecord, EffectorId, EffectorState } from "@/effectors/effector/types.js";
import { AgentRecordType } from "@/effectors/effector/types.js";
import { Effect, Stream } from "effect";
import type { BridgeServiceApi } from "./api.js";

/**
 * Initial state for new Effectors
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
            // Get EffectorService instance
            const effectorService = yield* EffectorService;

            return {
                createEffector: () =>
                    Effect.gen(function* () {
                        const id = crypto.randomUUID() as EffectorId;
                        const initialState: BridgeState = { messages: [] };
                        yield* effectorService.create(id, initialState);
                        return id;
                    }),

                sendMessage: (id: EffectorId, message: string) =>
                    Effect.gen(function* () {
                        const record: AgentRecord = {
                            id: crypto.randomUUID(),
                            effectorId: id,
                            timestamp: Date.now(),
                            type: AgentRecordType.MESSAGE,
                            payload: { message },
                            metadata: {}
                        };
                        yield* effectorService.send(id, record);
                    }),

                getState: <S>(id: EffectorId) =>
                    effectorService.getState<S>(id),

                subscribe: (id: EffectorId) =>
                    effectorService.subscribe(id),

                terminate: (id: EffectorId) =>
                    effectorService.terminate(id)
            };
        })
    }
);