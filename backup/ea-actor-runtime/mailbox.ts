/**
 * @file Base mailbox implementation for agent runtime message handling.
 */

import { Effect, Queue, Stream } from "effect"
import { AgentActivity, MessagePriority } from "./types.js"

class MailboxError extends Error {
    readonly agentRuntimeId: string | undefined
    constructor(params: { agentRuntimeId: string | undefined, message: string, cause?: unknown }) {
        super(params.message)
        this.agentRuntimeId = params.agentRuntimeId
        if (params.cause) (this as any).cause = params.cause
    }
}

/**
 * Mailbox class for priority-aware mailbox operations.
 */
export class Mailbox {
    protected readonly defaultQueue: Queue.Queue<AgentActivity>
    protected readonly queues: Map<MessagePriority, Queue.Queue<AgentActivity>>
    protected readonly config: {
        size: number
        priorityQueueSize: number
        enablePrioritization: boolean
    }

    protected constructor(
        defaultQueue: Queue.Queue<AgentActivity>,
        queues: Map<MessagePriority, Queue.Queue<AgentActivity>>,
        config: { size: number; priorityQueueSize: number; enablePrioritization: boolean }
    ) {
        this.defaultQueue = defaultQueue
        this.queues = queues
        this.config = config
    }

    static create(config: { size: number; priorityQueueSize: number; enablePrioritization: boolean }): Effect.Effect<Mailbox> {
        return Effect.gen(function* () {
            const defaultQueue = yield* Queue.dropping<AgentActivity>(config.size)
            const queues = new Map<MessagePriority, Queue.Queue<AgentActivity>>()

            if (config.enablePrioritization) {
                // Initialize priority queues
                for (let priority = 0; priority <= 3; priority++) {
                    const priorityQueue = yield* Queue.dropping<AgentActivity>(config.priorityQueueSize)
                    queues.set(priority as MessagePriority, priorityQueue)
                }
            }

            return new Mailbox(defaultQueue, queues, config)
        })
    }

    offer(activity: AgentActivity): Effect.Effect<void, MailboxError> {
        const priority = activity.metadata.priority
        const queue = priority !== undefined && this.config.enablePrioritization
            ? this.queues.get(priority)
            : this.defaultQueue

        if (!queue) {
            return Effect.fail(new MailboxError({
                agentRuntimeId: activity.agentRuntimeId,
                message: `Invalid priority: ${priority}`
            }))
        }

        return Queue.offer(queue, activity).pipe(
            Effect.mapError(error => new MailboxError({
                agentRuntimeId: activity.agentRuntimeId,
                message: "Failed to enqueue activity",
                cause: error
            }))
        )
    }

    take(): Effect.Effect<AgentActivity, MailboxError> {
        return Queue.take(this.defaultQueue).pipe(
            Effect.mapError(error => new MailboxError({
                agentRuntimeId: undefined as any,
                message: "Failed to dequeue activity",
                cause: error
            }))
        )
    }

    subscribe(): Stream.Stream<AgentActivity, MailboxError> {
        if (!this.config.enablePrioritization) {
            return Stream.fromQueue(this.defaultQueue).pipe(Stream.mapError(() => new MailboxError({ agentRuntimeId: undefined as any, message: "Stream error" })))
        }

        // Create streams for each priority queue
        const streams = Array.from(this.queues.entries())
            .sort(([a], [b]) => a - b) // Sort by priority
            .map(([_, queue]) => Stream.fromQueue(queue).pipe(Stream.mapError(() => new MailboxError({ agentRuntimeId: undefined as any, message: "Stream error" }))))

        // Add default queue at lowest priority
        streams.push(Stream.fromQueue(this.defaultQueue).pipe(Stream.mapError(() => new MailboxError({ agentRuntimeId: undefined as any, message: "Stream error" }))))

        // Merge streams with priority
        return Stream.mergeAll(streams, { concurrency: "unbounded" })
    }

    shutdown(): Effect.Effect<void> {
        return Queue.shutdown(this.defaultQueue)
    }
} 