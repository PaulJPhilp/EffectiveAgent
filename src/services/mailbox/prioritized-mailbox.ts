import { AgentActivity, MessagePriority as Priority } from "@/agent-runtime/types.js"
// filepath: /Users/paul/Projects/EffectiveAgent/src/agent-runtime/prioritized-mailbox.ts
import { Effect, Queue, Ref, Schedule, Stream, pipe } from "effect"
import { Mailbox } from "./mailbox.js"

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
export class PrioritizedMailbox extends Mailbox {
    private readonly stats: Ref.Ref<MailboxState>

    private constructor(
        defaultQueue: Queue.Queue<AgentActivity>,
        queues: Map<MessagePriority, Queue.Queue<AgentActivity>>,
        config: { size: number; priorityQueueSize: number; enablePrioritization: boolean },
        stats: Ref.Ref<MailboxState>
    ) {
        super(defaultQueue, queues, config)
        this.stats = stats
    }

    /**
     * Creates a new PrioritizedMailbox
     */
    static override create(config: { size: number; priorityQueueSize: number; enablePrioritization: boolean }): Effect.Effect<PrioritizedMailbox> {
        return Effect.gen(function* () {
            const queues = new Map<MessagePriority, Queue.Queue<AgentActivity>>()
            let defaultQueue: Queue.Queue<AgentActivity>

            if (config.enablePrioritization) {
                for (const priority of Object.values(Priority)) {
                    if (typeof priority === "number") {
                        const q = yield* Queue.bounded<AgentActivity>(config.priorityQueueSize)
                        queues.set(priority, q)
                        if (priority === Priority.NORMAL) defaultQueue = q
                    }
                }
            } else {
                defaultQueue = yield* Queue.bounded<AgentActivity>(config.size)
                queues.set(Priority.NORMAL, defaultQueue)
            }

            const stats = yield* Ref.make<MailboxState>({
                processed: 0,
                timeouts: 0,
                totalProcessingTime: 0
            })

            return new PrioritizedMailbox(defaultQueue!, queues, config, stats)
        })
    }

    /**
     * Offers an activity to the mailbox with backpressure
     */
    override offer(activity: AgentActivity): Effect.Effect<void, Error> {
        const priority = activity.metadata.priority ?? Priority.NORMAL
        const timeout = activity.metadata.timeout ?? this.config.size
        const queue = this.queues.get(this.config.enablePrioritization ? priority : Priority.NORMAL)!

        return pipe(
            Queue.offer(queue, activity).pipe(
                Effect.retry(Schedule.upTo(timeout)),
                Effect.map(() => void 0),
                Effect.tapError(() =>
                    Ref.update(this.stats, state => ({
                        ...state,
                        timeouts: state.timeouts + 1
                    }))
                )
            ),
            Effect.mapError(() => new Error(`Mailbox offer timed out after ${timeout}ms`))
        )
    }

    /**
     * Takes the next activity from the mailbox, respecting priorities
     */
    override take(): Effect.Effect<AgentActivity, Error> {
        if (!this.config.enablePrioritization) {
            const queue = this.queues.get(Priority.NORMAL)
            if (!queue) {
                return Effect.fail(new Error("Default queue not found"))
            }
            return Queue.take(queue)
        }
        return pipe(
            Effect.gen(function* () {
                for (let priority = Priority.HIGH; priority <= Priority.BACKGROUND; priority++) {
                    const queue = this.queues.get(priority)
                    if (!queue) continue
                    const size = yield* Queue.size(queue)
                    if (size > 0) return yield* Queue.take(queue)
                }
                const highPriorityQueue = this.queues.get(Priority.HIGH)
                if (!highPriorityQueue) return yield* Effect.fail(new Error("High priority queue not found"))
                return yield* Queue.take(highPriorityQueue)
            }),
            Effect.tap(() =>
                Ref.update(this.stats, state => ({
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
    getStats(): Effect.Effect<MailboxStats> {
        return pipe(
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
    }

    /**
     * Creates a stream of activities from the mailbox
     */
    override subscribe(): Stream.Stream<AgentActivity, Error> {
        return Stream.repeatEffect(this.take()).pipe(
            Stream.catchAll(error => Stream.fail(error))
        )
    }

    /**
     * Shuts down the mailbox
     */
    override shutdown(): Effect.Effect<void> {
        return Effect.forEach(
            Array.from(this.queues.values()),
            queue => Queue.shutdown(queue),
            { concurrency: "unbounded" }
        )
    }
}