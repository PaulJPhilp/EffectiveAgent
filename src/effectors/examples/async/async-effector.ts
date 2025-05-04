import { Effect, pipe } from "effect";
import type { Effector } from "../../effector/api.js";
import { EffectorService } from "../../effector/service.js";
import type { AgentRecord, EffectorId } from "../../effector/types.js";
import { AgentRecordType } from "../../effector/types.js";
import type { AsyncOperationState } from "./types.js";
import { AsyncOperationCommand, AsyncOperationEventType, AsyncOperationStatus } from "./types.js";

/**
 * Creates a new AsyncOperationTaskEffector instance
 */
export const createAsyncEffector = (
    id: EffectorId,
    simulatedDelay: number = 1000,
    simulatedSuccessRate: number = 0.8
): Effect.Effect<Effector<AsyncOperationState>> => {
    // Initial state
    const initialState: AsyncOperationState = {
        status: AsyncOperationStatus.IDLE
    };

    // Processing logic
    const processingLogic = (record: AgentRecord, state: AsyncOperationState) => {
        // Only process commands when IDLE
        if (record.type !== AgentRecordType.COMMAND ||
            (state.status !== AsyncOperationStatus.IDLE && record.payload.type === AsyncOperationCommand.START_FETCH)) {
            return Effect.succeed(state);
        }

        switch (record.payload.type) {
            case AsyncOperationCommand.START_FETCH: {
                const { url } = record.payload;

                // Emit FETCH_STARTED event
                const startEvent: AgentRecord = {
                    id: crypto.randomUUID(),
                    effectorId: id,
                    timestamp: Date.now(),
                    type: AgentRecordType.EVENT,
                    payload: {
                        type: AsyncOperationEventType.FETCH_STARTED,
                        url
                    },
                    metadata: {}
                };

                // Simulate async work with delay
                return pipe(
                    // First emit the start event
                    Effect.sync(() => startEvent),
                    Effect.tap(event => EffectorService.send(id, event)),

                    // Update state to PENDING
                    Effect.map(() => ({
                        ...state,
                        status: AsyncOperationStatus.PENDING,
                        inputUrl: url
                    })),

                    // Simulate async work
                    Effect.tap(() => Effect.sleep(simulatedDelay)),

                    // Simulate success/failure
                    Effect.flatMap(() =>
                        Effect.sync(() => Math.random() < simulatedSuccessRate)
                    ),

                    // Handle success/failure
                    Effect.flatMap(success => {
                        if (success) {
                            const result = { data: `Simulated result for ${url}` };
                            const successEvent: AgentRecord = {
                                id: crypto.randomUUID(),
                                effectorId: id,
                                timestamp: Date.now(),
                                type: AgentRecordType.EVENT,
                                payload: {
                                    type: AsyncOperationEventType.FETCH_SUCCEEDED,
                                    url,
                                    result
                                },
                                metadata: {}
                            };

                            return pipe(
                                Effect.sync(() => successEvent),
                                Effect.tap(event => EffectorService.send(id, event)),
                                Effect.map(() => ({
                                    ...state,
                                    status: AsyncOperationStatus.SUCCESS,
                                    result,
                                    error: undefined
                                }))
                            );
                        } else {
                            const error = new Error(`Simulated failure for ${url}`);
                            const failureEvent: AgentRecord = {
                                id: crypto.randomUUID(),
                                effectorId: id,
                                timestamp: Date.now(),
                                type: AgentRecordType.EVENT,
                                payload: {
                                    type: AsyncOperationEventType.FETCH_FAILED,
                                    url,
                                    error: error.message
                                },
                                metadata: {}
                            };

                            return pipe(
                                Effect.sync(() => failureEvent),
                                Effect.tap(event => EffectorService.send(id, event)),
                                Effect.map(() => ({
                                    ...state,
                                    status: AsyncOperationStatus.FAILURE,
                                    result: undefined,
                                    error
                                }))
                            );
                        }
                    })
                );
            }
            default:
                return Effect.succeed(state);
        }
    };

    // Create and return the effector instance
    return pipe(
        EffectorService,
        Effect.flatMap(service => service.create(id, initialState))
    );
};