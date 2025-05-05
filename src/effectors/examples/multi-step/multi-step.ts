import {
    AgentRecord,
    AgentRecordType,
    AgentRuntime,
    AgentRuntimeService,
    makeAgentRuntimeId
} from "@/agent-runtime/index.js"
import { Effect, pipe } from "effect"
import type {
    MultiStepConfig,
    MultiStepId,
    MultiStepState,
    StepState
} from "./types.js"
import {
    DEFAULT_CONFIG,
    MultiStepCommand
} from "./types.js"

/**
 * Creates a new Multi-Step Task Runtime
 */
export const createMultiStepRuntime = (
    id: MultiStepId,
    config: MultiStepConfig = {}
): Effect.Effect<AgentRuntime<MultiStepState>> =>
    Effect.gen(function* () {
        const agentRuntimeService = yield* AgentRuntimeService

        // Initial state for the runtime
        const initialState: MultiStepState = {
            id,
            currentStep: 0,
            steps: {},
            config: { ...DEFAULT_CONFIG, ...config }
        }

        // Convert string ID to AgentRuntimeId
        const runtimeId = makeAgentRuntimeId(id)

        // Helper to process a single step
        const processStep = (state: MultiStepState): Effect.Effect<MultiStepState, Error> =>
            Effect.gen(function* () {
                // Check if we should simulate failure
                if (Math.random() < state.config.failureProbability) {
                    return yield* Effect.fail(new Error(`Step ${state.currentStep} failed`))
                }

                // Simulate step processing
                yield* Effect.sleep(state.config.stepDelayMs)

                // Update step state
                const stepState: StepState = {
                    status: "completed",
                    startedAt: Date.now(),
                    completedAt: Date.now(),
                    result: `Step ${state.currentStep + 1} completed successfully`
                }

                return {
                    ...state,
                    currentStep: state.currentStep + 1,
                    steps: {
                        ...state.steps,
                        [state.currentStep]: stepState
                    }
                }
            })

        // Create the agent runtime
        const runtime = yield* agentRuntimeService.create<MultiStepState>(runtimeId, initialState)

        // Set up message processing
        yield* pipe(
            runtime.subscribe(),
            Stream.tap(record => {
                if (record.type !== AgentRecordType.COMMAND) {
                    return Effect.succeed(void 0)
                }

                const command = record.payload as { type: MultiStepCommand }
                const state = yield * runtime.getState()

                switch (command.type) {
                    case MultiStepCommand.START_TASK: {
                        if (state.state.currentStep > 0 || state.state.paused) {
                            return Effect.succeed(void 0)
                        }

                        // Initialize task state
                        const startState: MultiStepState = {
                            ...state.state,
                            startedAt: Date.now(),
                            paused: false
                        }

                        // Process all steps
                        return pipe(
                            processStep(startState),
                            Effect.match({
                                onSuccess: newState => {
                                    const stateChangeRecord: AgentRecord = {
                                        id: crypto.randomUUID(),
                                        agentRuntimeId: runtimeId,
                                        timestamp: Date.now(),
                                        type: AgentRecordType.STATE_CHANGE,
                                        payload: newState,
                                        metadata: {
                                            operation: command.type
                                        }
                                    }
                                    return agentRuntimeService.send(runtimeId, stateChangeRecord)
                                },
                                onFailure: error => {
                                    const errorState: MultiStepState = {
                                        ...state.state,
                                        error,
                                        completedAt: Date.now()
                                    }
                                    const errorRecord: AgentRecord = {
                                        id: crypto.randomUUID(),
                                        agentRuntimeId: runtimeId,
                                        timestamp: Date.now(),
                                        type: AgentRecordType.STATE_CHANGE,
                                        payload: errorState,
                                        metadata: {
                                            operation: command.type,
                                            error: error.message
                                        }
                                    }
                                    return agentRuntimeService.send(runtimeId, errorRecord)
                                }
                            })
                        )
                    }
                    case MultiStepCommand.PAUSE_TASK: {
                        if (state.state.paused || state.state.completedAt) {
                            return Effect.succeed(void 0)
                        }

                        const pausedState: MultiStepState = {
                            ...state.state,
                            paused: true
                        }

                        const pauseRecord: AgentRecord = {
                            id: crypto.randomUUID(),
                            agentRuntimeId: runtimeId,
                            timestamp: Date.now(),
                            type: AgentRecordType.STATE_CHANGE,
                            payload: pausedState,
                            metadata: {
                                operation: command.type
                            }
                        }
                        return agentRuntimeService.send(runtimeId, pauseRecord)
                    }
                    case MultiStepCommand.RESUME_TASK: {
                        if (!state.state.paused || state.state.completedAt) {
                            return Effect.succeed(void 0)
                        }

                        const resumeState: MultiStepState = {
                            ...state.state,
                            paused: false
                        }

                        const resumeRecord: AgentRecord = {
                            id: crypto.randomUUID(),
                            agentRuntimeId: runtimeId,
                            timestamp: Date.now(),
                            type: AgentRecordType.STATE_CHANGE,
                            payload: resumeState,
                            metadata: {
                                operation: command.type
                            }
                        }
                        return agentRuntimeService.send(runtimeId, resumeRecord)
                    }
                    default:
                        return Effect.succeed(void 0)
                }
            }),
            Stream.runDrain,
            Effect.fork
        )

        return runtime
    })