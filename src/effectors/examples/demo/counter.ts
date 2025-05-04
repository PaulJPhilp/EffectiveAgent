import { Effect, Stream, pipe } from "effect"
import { EffectorService } from "../../effector/service.js"
import type { AgentRecord } from "../../effector/types.js"
import { AgentRecordType, makeEffectorId } from "../../effector/types.js"
import { ControllerCommand, createControllerEffector } from "../controller/controller.js"
import { CounterCommand, type CounterState } from "../counter/counter.js"

/**
 * Counter demo program
 */
export const program = Effect.gen(function* () {
    // Create a controller
    const controllerId = makeEffectorId("main-controller")
    const controller = yield* createControllerEffector(controllerId)

    // Subscribe to all state changes
    const fiber = yield* pipe(
        controller.subscribe(),
        Stream.map((record: AgentRecord) => record),
        Stream.filter(record => record.type === AgentRecordType.STATE_CHANGE),
        Stream.tap(record =>
            Effect.sync(() => {
                console.log("State changed:", {
                    effectorId: record.effectorId,
                    payload: record.payload,
                    operation: record.metadata["operation"]
                })
            })
        ),
        Stream.runDrain,
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
        const state = counterState.state as CounterState
        yield* Effect.logInfo("Final counter state", {
            counterId,
            count: state.count,
            lastOperation: state.lastOperation
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

    // Wait for subscription to complete
    yield* Effect.sleep(100)
})

if (require.main === module) {
    Effect.runPromise(
        Effect.gen(function* () {
            yield* Effect.log("Starting counter demo")
            try {
                yield* program.pipe(
                    Effect.provide(EffectorService.Default),
                    Effect.tap(() => Effect.log("Program started")),
                    Effect.tap(() => Effect.sleep(5000)),
                    Effect.tap(() => Effect.log("Program completed"))
                )
            } catch (error) {
                yield* Effect.logError("Demo failed", { error })
                throw error
            }
        })
    ).catch(error => {
        console.error("Fatal error:", error)
        process.exit(1)
    })
}

