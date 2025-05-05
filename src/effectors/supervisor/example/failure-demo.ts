import { AgentRuntimeService, makeAgentRuntimeId } from "@/agent-runtime/index.js"
import { Console, Effect, Stream, pipe } from "effect"
import { createTaskRuntime } from "../__tests__/task-runtime.js"
import { createSupervisorRuntime } from "../index.js"

/**
 * Demonstrates the SupervisorAgentRuntime handling a failure in Task B
 * This script shows the error handling capabilities of the Phase 3 implementation
 */
const runFailureDemo = () =>
    Effect.gen(function* (_) {
        yield* Console.log("Starting SupervisorAgentRuntime Failure Demo...")

        // Get the AgentRuntimeService
        const service = yield* AgentRuntimeService

        // Create IDs for our tasks
        const taskAId = makeAgentRuntimeId("demo-task-a")
        const taskBId = makeAgentRuntimeId("demo-task-b")

        // Create supervisor runtime with task IDs
        yield* Console.log("Creating SupervisorAgentRuntime...")
        const supervisorRuntime = yield* createSupervisorRuntime("failure-demo")

        // Update supervisor with task IDs
        yield* service.update(supervisorRuntime.id, {
            taskAId,
            taskBId
        })

        // Create task runtimes - Task B will fail
        yield* Console.log("Creating Task A and Task B runtimes (Task B will fail)...")
        yield* createTaskRuntime("A", false, 1000) // Task A, no failures, 1s delay
        yield* createTaskRuntime("B", true, 2000)  // Task B will fail after 2s delay

        // Subscribe to supervisor events and log them
        yield* Console.log("Subscribing to SupervisorAgentRuntime events...")
        yield* pipe(
            supervisorRuntime.subscribe(),
            Stream.tap(record => {
                if (record.type === "EVENT") {
                    const event = record.payload as { type: string }
                    return Console.log(`[EVENT] ${event.type}`)
                }
                return Effect.unit
            }),
            Stream.runDrain,
            Effect.fork
        )

        // Start the process
        yield* Console.log("Starting the orchestration process...")
        yield* service.send(supervisorRuntime.id, {
            id: "demo-start",
            agentRuntimeId: supervisorRuntime.id,
            timestamp: Date.now(),
            type: "COMMAND",
            payload: { type: "START_PROCESS" },
            metadata: { correlationId: "failure-demo-123" }
        })

        // Wait for process to complete (6 seconds should be plenty)
        yield* Console.log("Waiting for process to complete...")
        yield* Effect.sleep(6000)

        // Get final state
        const finalState = yield* service.getState(supervisorRuntime.id)
        yield* Console.log("Final process state:", finalState.processState)
        yield* Console.log("Error information:", finalState.error)

        yield* Console.log("Failure Demo completed!")
    })

// Run the demo
Effect.runPromise(
    runFailureDemo().pipe(
        Effect.provide(AgentRuntimeService.Default),
        Effect.tapErrorCause(Console.errorCause),
    )
)
    .then(() => console.log("Failure Demo execution finished"))
    .catch(err => console.error("Failure Demo execution failed:", err))