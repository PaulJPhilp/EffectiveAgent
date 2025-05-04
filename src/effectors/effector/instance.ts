import { Effect, Fiber, Queue, Ref, Stream, pipe } from "effect"
import type { AgentRecord, EffectorId, EffectorState, ProcessingLogic } from "./types.js"
import { EffectorStatus } from "./types.js"
import { PrioritizedMailbox } from "./mailbox.js"
import type { EffectorConfig } from "./types.js"
import { EffectorProcessingError } from "./errors.js"

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
    startProcessing = (): Effect.Effect<Fiber.RuntimeFiber<never, E | EffectorProcessingError>, never, R> =>
        pipe(
            Effect.gen(function* (this: EffectorInstance<S, E, R>) {
                while (true) {
                    // Update status to PROCESSING
                    yield* this.updateStatus(EffectorStatus.IDLE)

                    // Take next message from mailbox with error handling
                    const record = yield* pipe(
                        this.mailbox.take(),
                        Effect.tap(() => this.updateStatus(EffectorStatus.PROCESSING)),
                        Effect.mapError(error => new EffectorProcessingError({
                            effectorId: this.id,
                            recordId: "unknown",
                            cause: error,
                            message: `Failed to take message from mailbox: ${error.message}`
                        }))
                    )

                    // Get current state
                    const currentState = yield* pipe(
                        Ref.get(this.state),
                        Effect.map(state => state as EffectorState<S>)
                    )

                    const startTime = Date.now()

                    // Execute processing logic with proper error handling
                    yield* pipe(
                        this.processingLogic(record, currentState.state),
                        Effect.matchCauseEffect({
                            onFailure: cause => pipe(
                                Ref.update(this.state, (state: EffectorState<S>) => ({
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
                                        effectorId: this.id,
                                        recordId: record.id,
                                        cause,
                                        message: `Error processing record ${record.id} in Effector ${this.id}`
                                    }))
                                )
                            ),
                            onSuccess: newState => pipe(
                                Ref.update(this.state, (state: EffectorState<S>) => ({
                                    ...state,
                                    state: newState,
                                    status: EffectorStatus.IDLE,
                                    lastUpdated: Date.now(),
                                    processing: {
                                        processed: (state.processing?.processed ?? 0) + 1,
                                        failures: state.processing?.failures ?? 0,
                                        avgProcessingTime: this.calculateAvgTime(
                                            state.processing?.avgProcessingTime ?? 0,
                                            state.processing?.processed ?? 0,
                                            Date.now() - startTime
                                        )
                                    }
                                })),
                                Effect.map(() => void 0)
                            )
                        })
                    )
                }
            }.bind(this)),
            Effect.fork
        )

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
        pipe(
            Ref.get(this.state),
            Effect.map(state => state as EffectorState<S>)
        )

    /**
     * Sends a message to this instance's mailbox
     */
    send = (record: AgentRecord): Effect.Effect<void, Error> =>
        this.mailbox.offer(record)

    /**
     * Creates a subscription to this instance's mailbox
     */
    subscribe = (): Stream.Stream<AgentRecord, Error> =>
        this.mailbox.stream()

    /**
     * Terminates this instance
     */
    terminate = (): Effect.Effect<void> => {
        const self = this
        return Effect.gen(function* () {
            // Update status to TERMINATED
            yield* self.updateStatus(EffectorStatus.TERMINATED)

            // Shutdown mailbox
            yield* pipe(
                self.mailbox.shutdown(),
                Effect.map(() => void 0)
            )
        })
    }
}
