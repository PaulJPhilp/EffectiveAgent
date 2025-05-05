// filepath: /Users/paul/Projects/EffectiveAgent/src/agent-runtime/prioritized-mailbox.ts
import { Effect, Queue, Ref, Schedule, Stream, pipe } from "effect"
import type { AgentActivity, AgentRuntimeConfig, MessagePriority } from "./agent-runtime.types.js"
import { MessagePriority as Priority } from "./agent-runtime.types.js"

/**
 * Statistics for a mailbox
 */
export interface MailboxStats {
    readonly size: number
    readonly processed: number
    readonly timeouts: number
    readonly avgProcessingTime: number
}

/**
 * Internal state for a mailbox
 */
interface MailboxState {
    readonly processed: number
    readonly timeouts: number
    readonly totalProcessingTime: number
}

/**
 * A prioritized mailbox implementation
 */
export class PrioritizedMailbox {
    private readonly queues: Map<MessagePriority, Queue.Queue<AgentActivity>>
    private readonly stats: Ref.Ref<MailboxState>
    private readonly config: AgentRuntimeConfig["mailbox"]

    private constructor(
        queues: Map<MessagePriority, Queue.Queue<AgentActivity>>,
        stats: Ref.Ref<MailboxState>,
        config: AgentRuntimeConfig["mailbox"]
    ) {
        this.queues = queues
        this.stats = stats
        this.config = config
    }

    /**
     * Creates a new PrioritizedMailbox
     */
    static create = (config: AgentRuntimeConfig["mailbox"]): Effect.Effect<PrioritizedMailbox> =>
        Effect.gen(function* () {
            const queues = new Map<MessagePriority, Queue.Queue<AgentActivity>>()

            if (config.enablePrioritization) {
                // Create a queue for each priority level
                for (const priority of Object.values(Priority)) {
                    if (typeof priority === "number") {
                        queues.set(
                            priority,
                            yield* Queue.bounded<AgentActivity>(config.priorityQueueSize)
                        )
                    }
                }
            } else {
                // Create a single queue for all messages
                queues.set(
                    Priority.NORMAL,
                    yield* Queue.bounded<AgentActivity>(config.size)
                )
            }

            const stats = yield* Ref.make<MailboxState>({
                processed: 0,
                timeouts: 0,
                totalProcessingTime: 0
            })

            return new PrioritizedMailbox(queues, stats, config)
        })

    /**
     * Offers an activity to the mailbox with backpressure
     */
    offer = (activity: AgentActivity): Effect.Effect<void, Error> => {
        const priority = activity.metadata.priority ?? Priority.NORMAL
        const timeout = activity.metadata.timeout ?? this.config.backpressureTimeout
        const queue = this.queues.get(
            this.config.enablePrioritization ? priority : Priority.NORMAL
        )!

        return pipe(
            // Try to offer with timeout
            Queue.offer(queue, activity).pipe(
                Effect.retry(
                    Schedule.upTo(timeout)
                ),
                Effect.map(() => void 0),
                Effect.tapError(() =>
                    Ref.update(this.stats, state => ({
                        ...state,
                        timeouts: state.timeouts + 1
                    }))
                )
            ),
            Effect.mapError(() =>
                new Error(`Mailbox offer timed out after ${timeout}ms`)
            )
        )
    }

    /**
     * Takes the next activity from the mailbox, respecting priorities
     */
    take = (): Effect.Effect<AgentActivity, Error> => {
        const self = this
        if (!self.config.enablePrioritization) {
            const queue = self.queues.get(Priority.NORMAL)
            if (!queue) {
                return Effect.fail(new Error("Default queue not found"))
            }
            return Queue.take(queue)
        }

        // Try to take from each priority queue in order
        return pipe(
            Effect.gen(function* () {
                for (let priority = Priority.HIGH; priority <= Priority.BACKGROUND; priority++) {
                    const queue = self.queues.get(priority)
                    if (!queue) {
                        continue
                    }
                    const size = yield* Queue.size(queue)
                    if (size > 0) {
                        return yield* Queue.take(queue)
                    }
                }
                // If no messages in any queue, wait on highest priority
                const highPriorityQueue = self.queues.get(Priority.HIGH)
                if (!highPriorityQueue) {
                    return yield* Effect.fail(new Error("High priority queue not found"))
                }
                return yield* Queue.take(highPriorityQueue)
            }),
            Effect.tap(() =>
                Ref.update(self.stats, state => ({
                    ...state,
                    processed: state.processed + 1,
                    totalProcessingTime: state.totalProcessingTime + 1 // Simplified
                }))
            )
        )
    }

    /**
     * Gets current mailbox statistics
     */
    getStats = (): Effect.Effect<MailboxStats> =>
        pipe(
            Effect.all({
                state: Ref.get(this.stats),
                sizes: Effect.forEach(
                    Array.from(this.queues.values()),
                    queue => Queue.size(queue)
                )
            }),
            Effect.map(({ state, sizes }) => ({
                size: sizes.reduce((a, b) => a + b, 0),
                processed: state.processed,
                timeouts: state.timeouts,
                avgProcessingTime:
                    state.processed > 0
                        ? state.totalProcessingTime / state.processed
                        : 0
            }))
        )

    /**
     * Creates a stream of activities from the mailbox
     */
    stream = (): Stream.Stream<AgentActivity, Error> =>
        pipe(
            Stream.repeatEffect(this.take()),
            Stream.catchAll(error =>
                Stream.fail(error)
            )
        )

    /**
     * Shuts down the mailbox
     */
    shutdown = (): Effect.Effect<void> =>
        Effect.forEach(
            Array.from(this.queues.values()),
            queue => Queue.shutdown(queue),
            { concurrency: "unbounded" }
        )
}