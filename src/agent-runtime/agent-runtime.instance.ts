import { Effect, Fiber, Queue, Ref, Stream, pipe } from "effect"
import { v4 as uuid4 } from "uuid"
import { AgentRuntimeProcessingError } from "./agent-runtime.errors.js"
import type { AgentActivity, AgentRuntimeConfig, AgentRuntimeId, AgentRuntimeState, AgentWorkflow } from "./agent-runtime.types.js"
import { AgentActivityType, AgentRuntimeStatus } from "./agent-runtime.types.js"
import { PrioritizedMailbox } from "./prioritized-mailbox.js"

/**
 * Internal representation of an AgentRuntime instance.
 * Manages state, mailbox, subscribers, and processing.
 */
export class AgentRuntimeInstance<S, E = never, R = never> {
    private readonly subscribers: Ref.Ref<Set<Queue.Queue<AgentActivity>>>

    /**
     * Gets the subscribers ref
     */
    getSubscribers = (): Ref.Ref<Set<Queue.Queue<AgentActivity>>> =>
        this.subscribers

    /**
     * Adds a subscriber
     */
    addSubscriber = (queue: Queue.Queue<AgentActivity>): Effect.Effect<void> =>
        pipe(
            this.subscribers,
            Ref.update(set => {
                set.add(queue)
                return set
            })
        )

    /**
     * Removes a subscriber
     */
    removeSubscriber = (queue: Queue.Queue<AgentActivity>): Effect.Effect<void> =>
        pipe(
            this.subscribers,
            Ref.update(set => {
                set.delete(queue)
                return set
            })
        )

    constructor(
        private readonly id: AgentRuntimeId,
        private readonly state: Ref.Ref<AgentRuntimeState<S>>,
        private readonly mailbox: PrioritizedMailbox,
        private readonly agentWorkflow: AgentWorkflow<S, E, R>,
        private readonly config: AgentRuntimeConfig["mailbox"]
    ) {
        this.subscribers = Ref.unsafeMake(new Set<Queue.Queue<AgentActivity>>())
    }

    private this = this

    /**
     * Creates a new AgentRuntimeInstance
     */
    static create = <S, E = never, R = never>(
        id: AgentRuntimeId,
        initialState: S,
        agentWorkflow: AgentWorkflow<S, E, R>,
        config: AgentRuntimeConfig["mailbox"]
    ): Effect.Effect<AgentRuntimeInstance<S, E, R>, never, R> =>
        Effect.gen(function* () {
            // Create state ref with initial state
            const stateRef = yield* Ref.make<AgentRuntimeState<S>>({
                id,
                state: initialState,
                status: AgentRuntimeStatus.IDLE,
                lastUpdated: Date.now(),
                processing: {
                    processed: 0,
                    failures: 0,
                    avgProcessingTime: 0
                }
            })

            // Create mailbox
            const mailbox = yield* PrioritizedMailbox.create(config)

            return new AgentRuntimeInstance(id, stateRef, mailbox, agentWorkflow, config)
        })

    /**
     * Starts the processing loop for this instance
     */
    startProcessing = (): Effect.Effect<Fiber.RuntimeFiber<never, E | AgentRuntimeProcessingError>, never, R> => {
        const self = this
        return pipe(
            Effect.gen(function* () {
                // Set initial status
                yield* self.updateStatus(AgentRuntimeStatus.IDLE)

                while (true) {
                    try {
                        // Take next message from mailbox with error handling
                        const activity = yield* pipe(
                            self.mailbox.take(),
                            Effect.tap(() => self.updateStatus(AgentRuntimeStatus.PROCESSING)),
                            Effect.mapError(error => new AgentRuntimeProcessingError({
                                agentRuntimeId: self.id,
                                activityId: "unknown",
                                cause: error,
                                message: `Failed to take message from mailbox: ${error.message}`
                            }))
                        )

                        // Get current state
                        const currentState = yield* pipe(
                            Ref.get(self.state),
                            Effect.map(state => state as AgentRuntimeState<S>)
                        )

                        const startTime = Date.now()

                        // Execute agent workflow with proper error handling
                        yield* pipe(
                            self.agentWorkflow(activity, currentState.state),
                            Effect.matchCauseEffect({
                                onFailure: cause => pipe(
                                    Ref.update(self.state, (state: AgentRuntimeState<S>) => ({
                                        ...state,
                                        status: AgentRuntimeStatus.ERROR,
                                        error: cause,
                                        lastUpdated: Date.now(),
                                        processing: {
                                            processed: 0,
                                            failures: (state.processing?.failures ?? 0) + 1,
                                            avgProcessingTime: state.processing?.avgProcessingTime ?? 0,
                                            lastError: cause
                                        }
                                    })),
                                    Effect.zipRight(
                                        Effect.fail(new AgentRuntimeProcessingError({
                                            agentRuntimeId: self.id,
                                            activityId: activity.id,
                                            cause,
                                            message: `Error processing activity ${activity.id} in AgentRuntime ${self.id}`
                                        }))
                                    )
                                ),
                                onSuccess: newState => {
                                    return pipe(
                                        Effect.gen(function* () {
                                            // Update state
                                            yield* Ref.update(self.state, (state: AgentRuntimeState<S>) => ({
                                                ...state,
                                                state: newState,
                                                status: AgentRuntimeStatus.IDLE,
                                                lastUpdated: Date.now(),
                                                processing: {
                                                    processed: (state.processing?.processed ?? 0) + 1,
                                                    failures: state.processing?.failures ?? 0,
                                                    avgProcessingTime: self.calculateAvgTime(
                                                        state.processing?.avgProcessingTime ?? 0,
                                                        state.processing?.processed ?? 0,
                                                        Date.now() - startTime
                                                    )
                                                }
                                            }))

                                            // Notify subscribers of state changes
                                            const stateChangeActivity: AgentActivity = {
                                                id: uuid4(),
                                                agentRuntimeId: self.id,
                                                timestamp: Date.now(),
                                                type: AgentActivityType.STATE_CHANGE,
                                                payload: newState,
                                                metadata: {
                                                    operation: activity.type === AgentActivityType.COMMAND
                                                        ? (activity.payload as { type: string }).type
                                                        : undefined
                                                }
                                            }

                                            // Send state change to subscribers
                                            const subscribers = yield* Ref.get(self.subscribers)
                                            yield* Effect.forEach(
                                                subscribers.values(),
                                                queue => Queue.offer(queue, stateChangeActivity),
                                                { concurrency: "unbounded" }
                                            )
                                        })
                                    )
                                }
                            })
                        )
                    } catch (error) {
                        // Handle processing errors by updating state and continuing
                        yield* Ref.update(self.state, (state: AgentRuntimeState<S>) => ({
                            ...state,
                            status: AgentRuntimeStatus.ERROR,
                            error,
                            lastUpdated: Date.now()
                        }))
                    }
                }
            }),
            Effect.fork
        )
    }

    /**
     * Gets the current state
     */
    getState = (): Effect.Effect<AgentRuntimeState<S>, never> =>
        Ref.get(this.state)

    /**
     * Sends an activity to this instance's mailbox
     */
    send = (activity: AgentActivity): Effect.Effect<void, Error> =>
        this.mailbox.offer(activity)

    /**
     * Creates a subscription to this instance's activity stream
     */
    subscribe = (): Stream.Stream<AgentActivity, Error> =>
        pipe(
            Stream.fromEffect(
                Effect.gen(function* () {
                    // Create subscriber queue
                    const queue = yield* Queue.unbounded<AgentActivity>()
                    // Add to subscribers
                    yield* this.addSubscriber(queue)
                    return queue
                })
            ),
            Stream.flatMap(queue =>
                pipe(
                    Stream.fromQueue(queue),
                    Stream.ensuring(this.removeSubscriber(queue))
                )
            )
        )

    /**
     * Updates the status of this instance
     */
    private updateStatus = (status: AgentRuntimeStatus): Effect.Effect<void> =>
        pipe(
            this.state,
            Ref.update(state => ({
                ...state,
                status,
                lastUpdated: Date.now()
            }))
        )

    /**
     * Calculates the new average processing time
     */
    private calculateAvgTime = (currentAvg: number, processed: number, newTime: number): number =>
        ((currentAvg * processed) + newTime) / (processed + 1)

    /**
     * Terminates this instance
     */
    terminate = (): Effect.Effect<void> =>
        Effect.gen(function* () {
            yield* pipe(
                this.state,
                Ref.update(state => ({
                    ...state,
                    status: AgentRuntimeStatus.TERMINATED,
                    lastUpdated: Date.now()
                }))
            )
        })
}