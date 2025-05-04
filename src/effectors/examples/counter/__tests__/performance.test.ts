import { createServiceTestHarness } from "@/services/core/test-utils/effect-test-harness.js"
import { Effect, Stream, pipe } from "effect"
import { describe, expect, it } from "vitest"
import { ControllerCommand, createControllerEffector } from "../controller.js"
import { CounterCommand, createCounterEffector } from "../counter/counter.js"
import { EffectorService } from "../effector/service.js"
import { AgentRecordType, makeEffectorId } from "../effector/types.js"

const harness = createServiceTestHarness(EffectorService)

describe("Effector Performance", () => {
    describe("Message Throughput", () => {
        it("should handle high-volume message processing", async () => {
            const effect = Effect.gen(function* () {
                const id = makeEffectorId("test-counter")
                const counter = yield* createCounterEffector(id)
                const numMessages = 1000
                const startTime = Date.now()

                // Send messages in parallel
                yield* Effect.forEach(
                    Array.from({ length: numMessages }, (_, i) => i),
                    () =>
                        counter.send({
                            id: crypto.randomUUID(),
                            effectorId: id,
                            timestamp: Date.now(),
                            type: AgentRecordType.COMMAND,
                            payload: { type: CounterCommand.INCREMENT },
                            metadata: {}
                        }),
                    { concurrency: 10 }
                )

                // Wait for all state changes
                const events: unknown[] = []
                yield* pipe(
                    counter.subscribe(),
                    Stream.take(numMessages),
                    Stream.runForEach(record => Effect.sync(() => events.push(record)))
                )

                const endTime = Date.now()
                const duration = endTime - startTime
                const throughput = (numMessages / duration) * 1000 // messages per second

                // Verify all messages were processed
                const state = yield* counter.getState()
                expect(state.state.count).toBe(numMessages)
                expect(events).toHaveLength(numMessages)

                // Log performance metrics
                yield* Effect.logInfo("Throughput test results", {
                    messagesProcessed: numMessages,
                    durationMs: duration,
                    throughputPerSecond: throughput
                })

                // Basic performance assertions
                expect(throughput).toBeGreaterThan(100) // At least 100 msgs/sec
            })

            await harness.runTest(effect)
        }, 30000) // Increase timeout for performance test
    })

    describe("Broadcast Latency", () => {
        it("should efficiently broadcast messages to multiple effectors", async () => {
            const effect = Effect.gen(function* () {
                const controllerId = makeEffectorId("test-controller")
                const controller = yield* createControllerEffector(controllerId)
                const numCounters = 10
                const numCommands = 100

                // Create counters
                for (let i = 0; i < numCounters; i++) {
                    yield* controller.send({
                        id: crypto.randomUUID(),
                        effectorId: controllerId,
                        timestamp: Date.now(),
                        type: AgentRecordType.COMMAND,
                        payload: { type: ControllerCommand.CREATE_COUNTER },
                        metadata: {}
                    })
                }

                // Wait for counters to be created
                yield* Effect.sleep(100)

                const startTime = Date.now()

                // Broadcast commands
                for (let i = 0; i < numCommands; i++) {
                    yield* controller.send({
                        id: crypto.randomUUID(),
                        effectorId: controllerId,
                        timestamp: Date.now(),
                        type: AgentRecordType.COMMAND,
                        payload: {
                            type: ControllerCommand.BROADCAST_COMMAND,
                            data: { type: CounterCommand.INCREMENT }
                        },
                        metadata: {}
                    })
                }

                // Wait for all counters to process all commands
                const service = yield* EffectorService
                const state = yield* controller.getState()

                let allProcessed = false
                while (!allProcessed) {
                    yield* Effect.sleep(10)

                    const states = yield* Effect.forEach(
                        state.state.managedEffectors,
                        counterId => service.getState(counterId),
                        { concurrency: "unbounded" }
                    )

                    allProcessed = states.every(s => s.state.count === numCommands)
                }

                const endTime = Date.now()
                const duration = endTime - startTime
                const avgLatencyPerBroadcast = duration / numCommands
                const totalMessages = numCommands * numCounters

                // Log performance metrics
                yield* Effect.logInfo("Broadcast test results", {
                    numCounters,
                    numCommands,
                    totalMessages,
                    durationMs: duration,
                    avgLatencyPerBroadcastMs: avgLatencyPerBroadcast,
                    messagesPerSecond: (totalMessages / duration) * 1000
                })

                // Basic performance assertions
                expect(avgLatencyPerBroadcast).toBeLessThan(50) // Less than 50ms per broadcast
            })

            await harness.runTest(effect)
        }, 30000) // Increase timeout for performance test
    })

    describe("Memory Usage", () => {
        it("should maintain stable memory usage under load", async () => {
            const effect = Effect.gen(function* () {
                const initialMemory = process.memoryUsage()
                const id = makeEffectorId("test-counter")
                const counter = yield* createCounterEffector(id)
                const numMessages = 10000

                // Process messages in batches to observe memory stability
                for (let batch = 0; batch < 10; batch++) {
                    // Send batch of messages
                    yield* Effect.forEach(
                        Array.from({ length: numMessages / 10 }, (_, i) => i),
                        () =>
                            counter.send({
                                id: crypto.randomUUID(),
                                effectorId: id,
                                timestamp: Date.now(),
                                type: AgentRecordType.COMMAND,
                                payload: { type: CounterCommand.INCREMENT },
                                metadata: {}
                            }),
                        { concurrency: 10 }
                    )

                    // Wait for batch to be processed
                    yield* Effect.sleep(100)

                    const currentMemory = process.memoryUsage()
                    const heapDiff = (currentMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024

                    // Log memory metrics
                    yield* Effect.logInfo(`Memory usage after batch ${batch + 1}`, {
                        heapUsedMB: currentMemory.heapUsed / 1024 / 1024,
                        heapDiffMB: heapDiff
                    })

                    // Check for memory leaks (arbitrary threshold for test)
                    expect(heapDiff).toBeLessThan(100) // Less than 100MB increase
                }

                // Verify final state
                const state = yield* counter.getState()
                expect(state.state.count).toBe(numMessages)
            })

            await harness.runTest(effect)
        }, 60000) // Increase timeout for memory test
    })
}) 