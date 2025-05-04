import { Effect, pipe } from "effect";
import type { Effector } from "./effector/api.js";
import { EffectorError } from "./effector/errors.js";
import { EffectorService } from "./effector/service.js";
import type { AgentRecord } from "./effector/types.js";
import { AgentRecordType, makeEffectorId } from "./effector/types.js";

// Types for MultiStep Effector
export type MultiStepId = string;

export interface StepStatus {
    status: "pending" | "completed" | "failed";
    startedAt?: number;
    completedAt?: number;
    error?: string;
}

export interface MultiStepConfig {
    stepDelayMs: number;
    failureProbability: number;
}

export interface MultiStepState {
    id: MultiStepId;
    currentStep: number;
    steps: Record<number, StepStatus>;
    config: MultiStepConfig;
    lastOperation?: MultiStepCommand;
}

export enum MultiStepCommand {
    START_TASK = "START_TASK",
    PAUSE_TASK = "PAUSE_TASK",
    RESUME_TASK = "RESUME_TASK"
}

export interface TaskCommandPayload {
    type: MultiStepCommand;
    config?: Partial<MultiStepConfig>;
}

const defaultConfig: MultiStepConfig = {
    stepDelayMs: 1000,
    failureProbability: 0.1
};

/**
 * Creates a new MultiStepEffector instance.
 */
export const createMultiStepEffector = (id: MultiStepId): Effect.Effect<Effector<MultiStepState>, EffectorError> =>
    Effect.gen(function* () {
        const service = yield* EffectorService;

        // Initial state for the effector
        const initialState: MultiStepState = {
            id,
            currentStep: 0,
            steps: {},
            config: defaultConfig,
        };

        // Convert string ID to EffectorId
        const effectorId = makeEffectorId(id);
        const baseEffector = yield* service.create(effectorId, initialState);

        // Helper to process a single step
        const processStep = (state: MultiStepState): Effect.Effect<MultiStepState, Error> =>
            Effect.gen(function* () {
                // Check if we should simulate failure
                if (Math.random() < state.config.failureProbability) {
                    return yield* Effect.fail(new Error(`Step ${state.currentStep} failed`));
                }

                // Simulate step processing
                yield* Effect.sleep(state.config.stepDelayMs);

                // Update step status
                return {
                    ...state,
                    currentStep: state.currentStep + 1,
                    steps: {
                        ...state.steps,
                        [state.currentStep]: {
                            status: "completed",
                            startedAt: Date.now(),
                            completedAt: Date.now()
                        }
                    }
                };
            });

        // Process agent records
        const processRecord = (record: AgentRecord, state: MultiStepState): Effect.Effect<MultiStepState, Error> => {
            if (record.type !== AgentRecordType.COMMAND) {
                return Effect.succeed(state);
            }

            const payload = record.payload as TaskCommandPayload;

            switch (payload.type) {
                case MultiStepCommand.START_TASK: {
                    // Update config if provided, using block scope
                    const config = payload.config
                        ? { ...defaultConfig, ...payload.config }
                        : defaultConfig;

                    // Start new task with fresh state
                    return Effect.succeed({
                        ...state,
                        currentStep: 1,
                        steps: {
                            0: { status: "completed", startedAt: Date.now(), completedAt: Date.now() }
                        },
                        config,
                        lastOperation: MultiStepCommand.START_TASK
                    });
                }

                case MultiStepCommand.PAUSE_TASK:
                    return Effect.succeed({
                        ...state,
                        lastOperation: MultiStepCommand.PAUSE_TASK
                    });

                case MultiStepCommand.RESUME_TASK:
                    return pipe(
                        processStep(state),
                        Effect.map(newState => ({
                            ...newState,
                            lastOperation: MultiStepCommand.RESUME_TASK
                        }))
                    );

                default:
                    return Effect.succeed(state);
            }
        };

        // Create enhanced effector with processing logic
        const enhancedEffector: Effector<MultiStepState> = {
            ...baseEffector,
            send: (record: AgentRecord) =>
                pipe(
                    baseEffector.getState(),
                    Effect.flatMap(state => processRecord(record, state.state)),
                    Effect.flatMap(newState =>
                        baseEffector.send({
                            ...record,
                            type: AgentRecordType.STATE_CHANGE,
                            payload: newState
                        })
                    ),
                    Effect.mapError(error =>
                        error instanceof EffectorError
                            ? error
                            : new EffectorError({
                                effectorId,
                                message: error instanceof Error ? error.message : String(error)
                            })
                    )
                )
        };

        return enhancedEffector;
    });