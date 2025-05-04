import { Effect, Fiber, Queue, Ref, Stream, pipe } from "effect"
import { EffectorProcessingError } from "./errors.js"
import { PrioritizedMailbox } from "./mailbox.js"
import type { AgentRecord, EffectorConfig, EffectorId, EffectorState, ProcessingLogic } from "./types.js"
import { AgentRecordType, EffectorStatus } from "./types.js"

/**
 * Internal representation of an Effector instance.
 * Manages state, mailbox, subscribers, and processing.
 */
export class EffectorInstance<S, E = never, R = never> {
    private readonly subscribers: Ref.Ref<Set<Queue.Queue<AgentRecord>>>;

    /**
     * Gets the subscribers ref
     */
    getSubscribers = (): Ref.Ref<Set<Queue.Queue<AgentRecord>>> =>
        this.subscribers;

    /**
     * Adds a subscriber
     */
    addSubscriber = (queue: Queue.Queue<AgentRecord>): Effect.Effect<void> =>
        pipe(
            this.subscribers,
            Ref.update(set => {
                set.add(queue);
                return set;
            })
        );

    /**
     * Removes a subscriber
     */
    removeSubscriber = (queue: Queue.Queue<AgentRecord>): Effect.Effect<void> =>
        pipe(
            this.subscribers,
            Ref.update(set => {
                set.delete(queue);
                return set;
            })
        );
    constructor(
        private readonly id: EffectorId,
        private readonly state: Ref.Ref<EffectorState<S>>,
        private readonly mailbox: PrioritizedMailbox,
        private readonly processingLogic: ProcessingLogic<S, E, R>,
        private readonly config: EffectorConfig["mailbox"]
    ) {
        this.subscribers = Ref.unsafeMake(new Set<Queue.Queue<AgentRecord>>());
    }

    private this = this

    /**
     * Creates a new EffectorInstance
     */
    static create = <S, E = never, R = never>(
        id: EffectorId,
        initialState: S,
        processingLogic: ProcessingLogic<S, E, R>,
        config: EffectorConfig["mailbox"]
    ): Effect.Effect<EffectorInstance<S, E, R>, never, R> =>
        Effect.gen(function* () {
            // Create state ref with initial state
            const stateRef = yield* Ref.make<EffectorState<S>>({
                id,
                state: initialState,
                status: EffectorStatus.IDLE,
                lastUpdated: Date.now(),
                processing: {
                    processed: 0,
                    failures: 0,
                    avgProcessingTime: 0
                }
            })

            // Create mailbox
            const mailbox = yield* PrioritizedMailbox.create(config)

            return new EffectorInstance(id, stateRef, mailbox, processingLogic, config)
        })

    /**
     * Starts the processing loop for this instance
     */
    startProcessing = (): Effect.Effect<Fiber.RuntimeFiber<never, E | EffectorProcessingError>, never, R> => {
        const self = this
        return pipe(
            Effect.gen(function* () {
                // Set initial status
                yield* self.updateStatus(EffectorStatus.IDLE)

                while (true) {
                    try {
                        // Take next message from mailbox with error handling
                        const record = yield* pipe(
                            self.mailbox.take(),
                            Effect.tap(() => self.updateStatus(EffectorStatus.PROCESSING)),
                            Effect.mapError(error => new EffectorProcessingError({
                                effectorId: self.id,
                                recordId: "unknown",
                                cause: error,
                                message: `Failed to take message from mailbox: ${error.message}`
                            }))
                        )

                        // Get current state
                        const currentState = yield* pipe(
                            Ref.get(self.state),
                            Effect.map(state => state as EffectorState<S>)
                        )

                        const startTime = Date.now()

                        // Execute processing logic with proper error handling
                        yield* pipe(
                            self.processingLogic(record, currentState.state),
                            Effect.matchCauseEffect({
                                onFailure: cause => pipe(
                                    Ref.update(self.state, (state: EffectorState<S>) => ({
                                        ...state,
                                        status: EffectorStatus.ERROR,
                                        error: cause,
                                        processing: {
                                            processed: state.processing?.processed ?? 0,
                                            failures: (state.processing?.failures ?? 0) + 1,
                                            avgProcessingTime: state.processing?.avgProcessingTime ?? 0,
                                            lastError: cause
                                        }
                                    })),
                                    Effect.zipRight(
                                        Effect.fail(new EffectorProcessingError({
                                            effectorId: self.id,
                                            recordId: record.id,
                                            cause,
                                            message: `Error processing record ${record.id} in Effector ${self.id}`
                                        }))
                                    )
                                ),
                                onSuccess: newState => {
                                    return pipe(
                                        Effect.gen(function* () {
                                            // Update state
                                            yield* Ref.update(self.state, (state: EffectorState<S>) => ({
                                                ...state,
                                                state: newState,
                                                status: EffectorStatus.IDLE,
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
                                            const stateChangeRecord: AgentRecord = {
                                                id: crypto.randomUUID(),
                                                effectorId: self.id,
                                                timestamp: Date.now(),
                                                type: AgentRecordType.STATE_CHANGE,
                                                payload: newState,
                                                metadata: {
                                                    operation: record.type === AgentRecordType.COMMAND
                                                        ? (record.payload as { type: string }).type
                                                        : undefined
                                                }
                                            }

                                            // Send state change to subscribers
                                            const subscribers = yield* Ref.get(self.subscribers)
                                            yield* Effect.forEach(
                                                Array.from(subscribers.values()),
                                                queue => Queue.offer(queue, stateChangeRecord)
                                            )
                                        }),
                                        Effect.map(() => void 0)
                                    )
                                }
                            })
                        )

                        // Update status back to IDLE
                        yield* self.updateStatus(EffectorStatus.IDLE)
                    } catch (error) {
                        // Log error and continue processing
                        yield* Effect.logError("Error in processing loop", { error })
                    }
                }
            }),
            Effect.fork
        ) as Effect.Effect<Fiber.RuntimeFiber<never, E | EffectorProcessingError>, never, R>
    }

    /**
     * Updates the status of this instance
     */
    private updateStatus = (status: EffectorStatus): Effect.Effect<void> =>
        Ref.update(this.state, state => ({
            ...state,
            status,
            lastUpdated: Date.now()
        }))

    /**
     * Calculates new average processing time
     */
    private calculateAvgTime = (currentAvg: number, currentCount: number, newTime: number): number => {
        const total = currentAvg * currentCount + newTime
        return total / (currentCount + 1)
    }

    /**
     * Gets the current state
     */
    getState = (): Effect.Effect<EffectorState<S>> =>
        Ref.get(this.state)

    /**
     * Sends a record to this instance
     */
    send = (record: AgentRecord): Effect.Effect<void, Error> =>
        this.mailbox.offer(record)

    /**
     * Subscribes to records from this instance
     */
    subscribe = (): Stream.Stream<AgentRecord, Error> => {
        const self = this
        return Stream.unwrap(
            Effect.gen(function* () {
                // Create queue for this subscriber
                const queue = yield* Queue.bounded<AgentRecord>(100)

                // Add to subscribers
                yield* self.addSubscriber(queue)

                // Create stream from queue
                return pipe(
                    Stream.fromQueue(queue),
                    Stream.ensuring(self.removeSubscriber(queue))
                )
            })
        )
    }

    /**
     * Terminates this instance
     */
    terminate = (): Effect.Effect<void> => {
        const self = this
        return Effect.gen(function* () {
            // Clear subscribers
            yield* pipe(
                self.subscribers,
                Ref.set(new Set())
            )

            // Shutdown mailbox
            yield* self.mailbox.shutdown()

            // Update status
            yield* pipe(
                self.state,
                Ref.update(state => ({
                    ...state,
                    status: EffectorStatus.TERMINATED,
                    lastUpdated: Date.now()
                }))
            )
        })
    }
}
