import { Effect, Stream, pipe } from "effect"
import { EffectorService } from "../effector/service.js"
import type { AgentRecord } from "../effector/types.js"
import { AgentRecordType, makeEffectorId } from "../effector/types.js"
import { makeEffectorSystem } from "../layer.js"
import { ControllerCommand, createControllerEffector } from "./controller.js"
import { CounterCommand } from "./counter.js"

/**
 * Example program that demonstrates the Effector system
 */
const program = Effect.gen(function* () {
    // Create a controller
    const controllerId = makeEffectorId("main-controller")
    const controller = yield* createControllerEffector(controllerId)

    // Subscribe to all state changes
    yield* pipe(
        controller.subscribe(),
        Stream.filter(record => record.type === AgentRecordType.STATE_CHANGE),
        Stream.forEach((record: AgentRecord) =>
            Effect.logInfo("State changed", {
                effectorId: record.effectorId,
                payload: record.payload,
                operation: record.metadata.operation
            })
        ),
        Effect.fork
    )

    // Create two counters
    for (let i = 0; i < 2; i++) {
        yield* controller.send({
            id: crypto.randomUUID(),
            effectorId: controllerId,
            timestamp: Date.now(),
            type: AgentRecordType.COMMAND,
            payload: { type: ControllerCommand.CREATE_COUNTER },
            metadata: {}
        })
    }

    // Wait a bit for counters to be created
    yield* Effect.sleep(100)

    // Broadcast some commands
    const commands = [
        CounterCommand.INCREMENT,
        CounterCommand.INCREMENT,
        CounterCommand.DECREMENT,
        CounterCommand.RESET
    ]

    for (const command of commands) {
        yield* controller.send({
            id: crypto.randomUUID(),
            effectorId: controllerId,
            timestamp: Date.now(),
            type: AgentRecordType.COMMAND,
            payload: {
                type: ControllerCommand.BROADCAST_COMMAND,
                data: { type: command }
            },
            metadata: {}
        })

        // Wait a bit between commands
        yield* Effect.sleep(100)
    }

    // Get final state of all counters
    const service = yield* EffectorService
    const state = yield* controller.getState()

    for (const counterId of state.state.managedEffectors) {
        const counterState = yield* service.getState(counterId)
        yield* Effect.logInfo("Final counter state", {
            counterId,
            count: counterState.state.count,
            lastOperation: counterState.state.lastOperation
        })
    }

    // Terminate all counters
    for (const counterId of state.state.managedEffectors) {
        yield* controller.send({
            id: crypto.randomUUID(),
            effectorId: controllerId,
            timestamp: Date.now(),
            type: AgentRecordType.COMMAND,
            payload: {
                type: ControllerCommand.TERMINATE_COUNTER,
                data: counterId
            },
            metadata: {}
        })
    }

    // Wait for termination
    yield* Effect.sleep(100)

    // Terminate controller
    yield* service.terminate(controllerId)
})

/**
 * Run the demo
 */
if (require.main === module) {
    Effect.runPromise(
        program.pipe(
            Effect.provide(
                makeEffectorSystem({
                    enableMetrics: true,
                    logLevel: "DEBUG"
                })
            )
        )
    ).catch(console.error)
} 