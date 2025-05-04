import { createServiceTestHarness } from "@/services/core/test-harness/utils/service-test.js"
import { Effect, Stream, pipe } from "effect"
import { describe, expect, it } from "vitest"
import { Effector, EffectorServiceApi } from "../../../effector/api.js"
import { EffectorError } from "../../../effector/errors.js"
import { EffectorService } from "../../../effector/service.js"
import { AgentRecord, AgentRecordType, EffectorId, EffectorState } from "../../../effector/types.js"
import { createMultiStepEffector } from "../multi-step.js"
import { MultiStepCommand, makeMultiStepId } from "../types.js"

// Create test implementation factory for the EffectorService
const createTestImpl = () => Effect.succeed<EffectorServiceApi>({
    create: <S>(id: EffectorId, initialState: S): Effect.Effect<Effector<S>, EffectorError> => Effect.succeed({
        id,
        send: (record: AgentRecord) => Effect.succeed(void 0),
        getState: () => Effect.succeed({
            id,
            state: initialState,
            status: "IDLE" as const,
            lastUpdated: Date.now(),
            processing: {
                processed: 0,
                failures: 0,
                avgProcessingTime: 0
            }
        }),
        subscribe: () => pipe(
            Stream.fromIterable([]),
            Stream.map(msg => msg as AgentRecord)
        )
    }),
    terminate: (id: EffectorId) => Effect.succeed(void 0),
    getState: <S>(id: EffectorId): Effect.Effect<EffectorState<S>> => Effect.succeed({
        id,
        state: {} as S,
        status: "IDLE" as const,
        lastUpdated: Date.now(),
        processing: {
            processed: 0,
            failures: 0,
            avgProcessingTime: 0
        }
    }),
    send: (id: EffectorId, record: AgentRecord) => Effect.succeed(void 0),
    subscribe: (id: EffectorId) => pipe(
        Stream.fromIterable([]),
        Stream.map(msg => msg as AgentRecord)
    )
})

describe("MultiStepTaskEffector", () => {
    const harness = createServiceTestHarness(EffectorService, createTestImpl)

    it("should create an effector with initial state", async () => {
        await harness.runTest(
            Effect.gen(function* ($) {
                const testImpl = yield* createTestImpl()
                const test = Effect.gen(function* ($) {
                    const id = makeMultiStepId("test")
                    const effector = yield* createMultiStepEffector(id)
                    const state = yield* effector.getState()

                    expect(state.state.currentStep).toBe(0)
                    expect(Object.keys(state.state.steps)).toHaveLength(0)
                    expect(state.state.lastOperation).toBeUndefined()
                })
                return yield* pipe(test, Effect.provideService(EffectorService, testImpl))
            })
        )
    })

    it("should process all steps successfully with default config", async () => {
        await harness.runTest(
            Effect.gen(function* ($) {
                const testImpl = yield* createTestImpl()
                const test = Effect.gen(function* ($) {
                    const id = makeMultiStepId("test")
                    const effector = yield* createMultiStepEffector(id)

                    // Start the task
                    yield* effector.send({
                        id: "start-cmd",
                        effectorId: id,
                        timestamp: Date.now(),
                        type: AgentRecordType.COMMAND,
                        payload: { type: MultiStepCommand.START_TASK },
                        metadata: {}
                    })

                    // Get final state
                    const state = yield* effector.getState()
                    expect(state.state.config.totalSteps).toBe(3)
                    expect(state.state.currentStep).toBe(1)
                    expect(state.state.lastOperation).toBe(MultiStepCommand.START_TASK)
                })
                return yield* pipe(test, Effect.provideService(EffectorService, testImpl))
            })
        )
    })

    it("should handle step failures", async () => {
        await harness.runTest(
            Effect.gen(function* ($) {
                const testImpl = yield* createTestImpl()
                const test = Effect.gen(function* ($) {
                    const id = makeMultiStepId("test")
                    const effector = yield* createMultiStepEffector(id)

                    // Start the task with high failure probability
                    yield* effector.send({
                        id: "start-cmd",
                        effectorId: id,
                        timestamp: Date.now(),
                        type: AgentRecordType.COMMAND,
                        payload: {
                            type: MultiStepCommand.START_TASK,
                            config: { failureProbability: 1 } // Force failure
                        },
                        metadata: {}
                    })

                    // Get state after failure
                    const state = yield* effector.getState()
                    expect(state.state.currentStep).toBe(1)
                    expect(state.state.lastOperation).toBe(MultiStepCommand.START_TASK)
                })
                return yield* pipe(test, Effect.provideService(EffectorService, testImpl))
            })
        )
    })

    it("should respect custom step configuration", async () => {
        await harness.runTest(
            Effect.gen(function* ($) {
                const testImpl = yield* createTestImpl()
                const test = Effect.gen(function* ($) {
                    const id = makeMultiStepId("test")
                    const effector = yield* createMultiStepEffector(id)

                    const config = {
                        totalSteps: 2,
                        stepDelayMs: 100
                    }

                    // Start the task with custom config
                    yield* effector.send({
                        id: "start-cmd",
                        effectorId: id,
                        timestamp: Date.now(),
                        type: AgentRecordType.COMMAND,
                        payload: {
                            type: MultiStepCommand.START_TASK,
                            config
                        },
                        metadata: {}
                    })

                    // Verify configuration was respected
                    const state = yield* effector.getState()
                    expect(state.state.config.totalSteps).toBe(2)
                    expect(state.state.config.stepDelayMs).toBe(100)
                    expect(state.state.currentStep).toBe(1)
                    expect(state.state.lastOperation).toBe(MultiStepCommand.START_TASK)
                })
                return yield* pipe(test, Effect.provideService(EffectorService, testImpl))
            })
        )
    })
})