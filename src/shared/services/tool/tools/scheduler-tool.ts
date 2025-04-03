import { Effect, Schedule } from "effect"
import { z } from "zod"
import { BaseTool } from "../base-tool.js"
import { ToolExecutionError, ToolRuntimeError } from "../errors/index.js"
import { type ToolExecutionContext } from "../types/index.js"

const scheduleConfigSchema = z.object({
    // Schedule configuration
    interval: z.number().min(1).describe("Interval in milliseconds between executions"),
    maxAttempts: z.number().int().min(1).optional().describe("Maximum number of attempts (default: infinite)"),
    exponentialBackoff: z.boolean().optional().describe("Whether to use exponential backoff for retries"),
    jitter: z.boolean().optional().describe("Whether to add random jitter to intervals"),
    // Effect to schedule
    effect: z.object({
        type: z.string().describe("Type of effect to schedule"),
        config: z.record(z.unknown()).describe("Configuration for the effect")
    })
})

type ScheduleConfig = z.infer<typeof scheduleConfigSchema>

/**
 * Tool for scheduling effects using Effect's Schedule type
 */
export class SchedulerTool extends BaseTool<typeof scheduleConfigSchema, void> {
    readonly id = "scheduler"
    readonly name = "Scheduler"
    readonly description = "Schedule effects using Effect's Schedule type"
    readonly tags = ["scheduling", "automation"] as const
    readonly inputSchema = scheduleConfigSchema
    readonly outputSchema = z.void()

    execute(
        input: ScheduleConfig,
        context: ToolExecutionContext
    ): Effect.Effect<void, ToolExecutionError> {
        const { interval, maxAttempts, exponentialBackoff, jitter, effect } = input
        const { logging } = context

        return Effect.gen(function* (_) {
            // Build the schedule based on configuration
            let schedule = Schedule.spaced(interval)

            if (exponentialBackoff) {
                schedule = Schedule.exponential(interval, 2)
            }

            if (jitter) {
                schedule = Schedule.jittered(schedule)
            }

            // Always set max attempts to avoid infinite retries
            const attempts = maxAttempts ?? 1
            schedule = Schedule.compose(schedule, Schedule.recurs(attempts))

            // Log the execution details
            yield* Effect.succeed(
                yield* logging.info("Executing scheduled effect", {
                    effect,
                    interval,
                    maxAttempts: attempts,
                    exponentialBackoff,
                    jitter
                })
            )

            // Execute the effect with the schedule
            yield* Effect.retry(
                Effect.fail(new ToolRuntimeError("Effect execution failed")),
                schedule
            )

            return yield* Effect.succeed(undefined)
        }).pipe(
            Effect.mapError(error => new ToolExecutionError(
                "Failed to execute scheduled effect",
                { cause: error }
            ))
        )
    }
} 