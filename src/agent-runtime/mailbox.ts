import { Effect, Queue, Stream } from "effect"
import { MailboxError } from "./errors.js"
import type { AgentActivity, MessagePriority } from "./types.js"

/**
 * A priority-aware mailbox implementation for AgentRuntime instances.
 */
export class Mailbox {
    private readonly queues: Map<MessagePriority, Queue.Queue<AgentActivity>>
    private readonly defaultQueue: Queue.Queue<AgentActivity>

    private constructor(
        defaultQueue: Queue.Queue<AgentActivity>,
        queues: Map<MessagePriority, Queue.Queue<AgentActivity>>,
        private readonly config: {
            size: number
            priorityQueueSize: number
            enablePrioritization: boolean
        }
    ) {
        this.queues = queues
        this.defaultQueue = defaultQueue
    }

    /**
     * Creates a new Mailbox instance
     */
    static create(config: {
        size: number
        priorityQueueSize: number
        enablePrioritization: boolean
    }): Effect.Effect<Mailbox> {
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

    /**
     * Enqueues an activity into the appropriate priority queue.
     */
    enqueue(activity: AgentActivity): Effect.Effect<void, MailboxError> {
        return Effect.try({
            try: () => {
                const priority = activity.metadata.priority
                const queue = priority !== undefined && this.config.enablePrioritization
                    ? this.queues.get(priority)
                    : this.defaultQueue

                if (!queue) {
                    throw new MailboxError({
                        agentRuntimeId: activity.agentRuntimeId,
                        message: `Invalid priority: ${priority}`
                    })
                }

                return Queue.offer(queue, activity)
            },
            catch: (error) => new MailboxError({
                agentRuntimeId: activity.agentRuntimeId,
                message: "Failed to enqueue activity",
                cause: error
            })
        })
    }

    /**
     * Creates a stream of activities from all queues, respecting priorities.
     */
    subscribe(): Stream.Stream<AgentActivity, never> {
        if (!this.config.enablePrioritization) {
            return Stream.fromQueue(this.defaultQueue)
        }

        // Create streams for each priority queue
        const streams = Array.from(this.queues.entries())
            .sort(([a], [b]) => a - b) // Sort by priority
            .map(([_, queue]) => Stream.fromQueue(queue))

        // Add default queue at lowest priority
        streams.push(Stream.fromQueue(this.defaultQueue))

        // Merge streams with priority
        return Stream.mergeAll(streams, { concurrency: "unbounded" })
    }
}