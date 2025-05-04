import { createServiceTestHarness } from "@/services/core/test-utils/effect-test-harness.js"
import { Effect, Stream, pipe } from "effect"
import { describe, expect, it } from "vitest"
import { EffectorService } from "../../effector/service.js"
import { AgentRecordType, makeEffectorId } from "../../effector/types.js"
import { ControllerCommand, createControllerEffector } from "../controller.js"
import { CounterCommand } from "../counter.js"

const harness = createServiceTestHarness(EffectorService)

describe("ControllerEffector", () => {
    it("should create a controller with initial state", async () => {
        const effect = Effect.gen(function* () {
            const id = makeEffectorId("test-controller")
            const controller = yield* createControllerEffector(id)
            const state = yield* controller.getState()

            expect(state.state.managedEffectors).toHaveLength(0)
        })

        await harness.runTest(effect)
    })

    it("should create and manage counter effectors", async () => {
        const effect = Effect.gen(function* () {
            const id = makeEffectorId("test-controller")
            const controller = yield* createControllerEffector(id)

            // Create a counter
            yield* controller.send({
                id: "test-cmd",
                effectorId: id,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: { type: ControllerCommand.CREATE_COUNTER },
                metadata: {}
            })

            // Wait for state change event
            const events: unknown[] = []
            yield* pipe(
                controller.subscribe(),
                Stream.take(1),
                Stream.runForEach(record => Effect.sync(() => events.push(record)))
            )

            // Verify state
            const state = yield* controller.getState()
            expect(state.state.managedEffectors).toHaveLength(1)
            expect(state.state.lastOperation).toBe(ControllerCommand.CREATE_COUNTER)

            // Verify event
            expect(events).toHaveLength(1)
            expect((events[0] as any).type).toBe(AgentRecordType.STATE_CHANGE)
            expect((events[0] as any).payload.counterId).toBeDefined()
        })

        await harness.runTest(effect)
    })

    it("should terminate managed counters", async () => {
        const effect = Effect.gen(function* () {
            const id = makeEffectorId("test-controller")
            const controller = yield* createControllerEffector(id)

            // Create a counter
            yield* controller.send({
                id: "create-cmd",
                effectorId: id,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: { type: ControllerCommand.CREATE_COUNTER },
                metadata: {}
            })

            // Get the counter ID from the state change event
            const createEvents: unknown[] = []
            yield* pipe(
                controller.subscribe(),
                Stream.take(1),
                Stream.runForEach(record => Effect.sync(() => createEvents.push(record)))
            )

            const counterId = (createEvents[0] as any).payload.counterId

            // Terminate the counter
            yield* controller.send({
                id: "terminate-cmd",
                effectorId: id,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: {
                    type: ControllerCommand.TERMINATE_COUNTER,
                    data: counterId
                },
                metadata: {}
            })

            // Wait for state change event
            const terminateEvents: unknown[] = []
            yield* pipe(
                controller.subscribe(),
                Stream.take(1),
                Stream.runForEach(record => Effect.sync(() => terminateEvents.push(record)))
            )

            // Verify state
            const state = yield* controller.getState()
            expect(state.state.managedEffectors).toHaveLength(0)
            expect(state.state.lastOperation).toBe(ControllerCommand.TERMINATE_COUNTER)

            // Verify event
            expect(terminateEvents).toHaveLength(1)
            expect((terminateEvents[0] as any).type).toBe(AgentRecordType.STATE_CHANGE)
            expect((terminateEvents[0] as any).payload.terminatedId).toBe(counterId)
        })

        await harness.runTest(effect)
    })

    it("should broadcast commands to managed counters", async () => {
        const effect = Effect.gen(function* () {
            const service = yield* EffectorService
            const id = makeEffectorId("test-controller")
            const controller = yield* createControllerEffector(id)

            // Create two counters
            for (let i = 0; i < 2; i++) {
                yield* controller.send({
                    id: `create-cmd-${i}`,
                    effectorId: id,
                    timestamp: Date.now(),
                    type: AgentRecordType.COMMAND,
                    payload: { type: ControllerCommand.CREATE_COUNTER },
                    metadata: {}
                })

                // Wait for state change event
                yield* pipe(
                    controller.subscribe(),
                    Stream.take(1),
                    Stream.runForEach(() => Effect.unit)
                )
            }

            // Get counter IDs
            const state = yield* controller.getState()
            const counterIds = state.state.managedEffectors

            // Broadcast increment command
            yield* controller.send({
                id: "broadcast-cmd",
                effectorId: id,
                timestamp: Date.now(),
                type: AgentRecordType.COMMAND,
                payload: {
                    type: ControllerCommand.BROADCAST_COMMAND,
                    data: { type: CounterCommand.INCREMENT }
                },
                metadata: {}
            })

            // Verify each counter's state
            for (const counterId of counterIds) {
                const counterState = yield* service.getState(counterId)
                expect(counterState.state.count).toBe(1)
                expect(counterState.state.lastOperation).toBe(CounterCommand.INCREMENT)
            }
        })

        await harness.runTest(effect)
    })
}) 