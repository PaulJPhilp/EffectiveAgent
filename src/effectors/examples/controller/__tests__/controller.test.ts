import { EffectorService } from "@effectors/effector/service.js"
import { AgentRecordType, makeEffectorId } from "@effectors/effector/types.js"
import { CounterCommand, type CounterState } from "@effectors/examples/counter/counter.js"
import { Effect, Stream } from "effect"
import { describe, expect, it } from "vitest"
import { AgentRecord } from "../../effector/types.js"
import { ControllerCommand, createControllerEffector } from "../controller.js"

describe("ControllerEffector", () => {
    const testId = makeEffectorId("test-controller")

    const createTestController = () =>
        Effect.gen(function* () {
            const controller = yield* createControllerEffector(testId)
            return controller
        }).pipe(Effect.provide(EffectorService.Default))

    it("should create a controller with initial state", () =>
        Effect.gen(function* () {
            const controller = yield* createTestController()
            const state = yield* controller.getState()

            expect(state.state.managedEffectors).toHaveLength(0)
            expect(state.state.lastOperation).toBeUndefined()
            expect(state.state.lastUpdated).toBeDefined()
        })
    )

    it("should create and manage counter effectors", () =>
        Effect.gen(function* () {
            const controller = yield* createTestController()
            const events: Array<{ counterId: string }> = []

            // Subscribe to state changes
            yield* Effect.fork(
                controller.subscribe().pipe(
                    Stream.filter((record: AgentRecord) => record.type === AgentRecordType.STATE_CHANGE),
                    Stream.runForEach((record: AgentRecord) =>
                        Effect.sync(() => events.push(record.payload as { counterId: string }))
                    )
                )
            )

            // Create a counter
            yield* controller.send({
                id: crypto.randomUUID(),
                effectorId: testId,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: { type: ControllerCommand.CREATE_COUNTER },
                metadata: {}
            })

            // Wait for event processing
            yield* Effect.sleep(100)

            // Verify state
            const state = yield* controller.getState()
            expect(state.state.managedEffectors).toHaveLength(1)
            expect(state.state.lastOperation).toBe(ControllerCommand.CREATE_COUNTER)

            // Verify event
            expect(events).toHaveLength(1)
            expect(events[0].counterId).toBeDefined()
        })
    )

    it("should terminate managed counters", () =>
        Effect.gen(function* () {
            const controller = yield* createTestController()
            const events: Array<{ counterId?: string, terminatedId?: string }> = []

            // Subscribe to state changes
            yield* Effect.fork(
                controller.subscribe().pipe(
                    Stream.filter((record: AgentRecord) => record.type === AgentRecordType.STATE_CHANGE),
                    Stream.forEach((record: AgentRecord) => Effect.sync(() => {
                        events.push(record.payload as { counterId?: string, terminatedId?: string })
                    }))
                )
            )

            // Create a counter
            yield* controller.send({
                id: crypto.randomUUID(),
                effectorId: testId,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: { type: ControllerCommand.CREATE_COUNTER },
                metadata: {}
            })

            // Wait for event processing
            yield* Effect.sleep(100)

            const counterId = events[0].counterId!

            // Terminate the counter
            yield* controller.send({
                id: crypto.randomUUID(),
                effectorId: testId,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: {
                    type: ControllerCommand.TERMINATE_COUNTER,
                    data: counterId
                },
                metadata: {}
            })

            // Wait for event processing
            yield* Effect.sleep(100)

            // Verify state
            const state = yield* controller.getState()
            expect(state.state.managedEffectors).toHaveLength(0)
            expect(state.state.lastOperation).toBe(ControllerCommand.TERMINATE_COUNTER)

            // Verify events
            expect(events).toHaveLength(2)
            expect(events[1].terminatedId).toBe(counterId)
        })
    )

    it("should broadcast commands to managed counters", () =>
        Effect.gen(function* () {
            const service = yield* EffectorService
            const controller = yield* createTestController()
            const events: Array<{ counterId?: string, broadcastCommand?: unknown }> = []

            // Subscribe to state changes
            yield* Effect.fork(
                controller.subscribe().pipe(
                    Stream.filter((record: AgentRecord) => record.type === AgentRecordType.STATE_CHANGE),
                    Stream.forEach((record: AgentRecord) => Effect.sync(() => {
                        events.push(record.payload as { counterId?: string, broadcastCommand?: unknown })
                    }))
                )
            )

            // Create two counters
            for (let i = 0; i < 2; i++) {
                yield* controller.send({
                    id: crypto.randomUUID(),
                    effectorId: testId,
                    timestamp: Date.now(),
                    type: AgentRecordType.COMMAND,
                    payload: { type: ControllerCommand.CREATE_COUNTER },
                    metadata: {}
                })
            }

            // Wait for event processing
            yield* Effect.sleep(100)

            // Get counter IDs
            const state = yield* controller.getState()
            const counterIds = state.state.managedEffectors

            // Broadcast increment command
            yield* controller.send({
                id: crypto.randomUUID(),
                effectorId: testId,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: {
                    type: ControllerCommand.BROADCAST_COMMAND,
                    data: { type: CounterCommand.INCREMENT }
                },
                metadata: {}
            })

            // Wait for event processing
            yield* Effect.sleep(100)

            // Verify each counter's state
            for (const counterId of counterIds) {
                const counterState = yield* service.getState(counterId)
                const state = counterState.state as CounterState
                expect(state.count).toBe(1)
                expect(state.lastOperation).toBe(CounterCommand.INCREMENT)
            }

            // Verify broadcast event
            expect(events).toHaveLength(3) // 2 creates + 1 broadcast
            expect(events[2].broadcastCommand).toEqual({ type: CounterCommand.INCREMENT })
        })
    )
}) 