import { Effect, Stream, pipe } from "effect"
import type { AgentRuntime } from "./api.js"
import { Mailbox } from "./mailbox.js"
import type { AgentRecord, AgentRuntimeConfig, AgentRuntimeId, AgentRuntimeState, ProcessingLogic } from "./types.js"
import { AgentRuntimeStatus } from "./types.js"

/**
 * Implementation of an individual AgentRuntime instance.
 */
export class AgentRuntimeInstance<S, E = never, R = never> implements AgentRuntime<S> {
    private readonly mailbox: Mailbox
    private state: AgentRuntimeState<S>

    constructor(
        readonly id: AgentRuntimeId,
        initialState: S,
        private readonly processingLogic: ProcessingLogic<S, E, R>,
        config: AgentRuntimeConfig
    ) {
        this.mailbox = new Mailbox(config.mailbox)
        this.state = {
            id,
            state: initialState,
            status: AgentRuntimeStatus.IDLE,
            lastUpdated: Date.now(),
            processing: {
                processed: 0,
                failures: 0,
                avgProcessingTime: 0
            },
            mailbox: {
                size: 0,
                processed: 0,
                timeouts: 0,
                avgProcessingTime: 0
            }
        }
    }

    send(record: AgentRecord): Effect.Effect<void, Error> {
        if (this.state.status === AgentRuntimeStatus.TERMINATED) {
            return Effect.fail(new Error("AgentRuntime is terminated"))
        }
        return this.mailbox.enqueue(record)
    }

    getState(): Effect.Effect<AgentRuntimeState<S>, never> {
        return Effect.succeed(this.state)
    }

    subscribe(): Stream.Stream<AgentRecord, Error> {
        return pipe(
            this.mailbox.subscribe(),
            Stream.tap(record => this.processRecord(record))
        )
    }

    private processRecord(record: AgentRecord): Effect.Effect<void, Error> {
        const startTime = Date.now()

        return pipe(
            Effect.try(() => {
                this.state.status = AgentRuntimeStatus.PROCESSING
                return this.processingLogic(record, this.state.state)
            }),
            Effect.map(newState => {
                const endTime = Date.now()
                const processingTime = endTime - startTime

                // Update state
                this.state = {
                    ...this.state,
                    state: newState,
                    status: AgentRuntimeStatus.IDLE,
                    lastUpdated: endTime,
                    processing: {
                        processed: this.state.processing!.processed + 1,
                        failures: this.state.processing!.failures,
                        avgProcessingTime: (
                            (this.state.processing!.avgProcessingTime * this.state.processing!.processed + processingTime) /
                            (this.state.processing!.processed + 1)
                        )
                    }
                }
            }),
            Effect.catchAll(error => {
                this.state = {
                    ...this.state,
                    status: AgentRuntimeStatus.ERROR,
                    error,
                    processing: {
                        ...this.state.processing!,
                        failures: this.state.processing!.failures + 1,
                        lastError: error
                    }
                }
                return Effect.fail(error)
            })
        )
    }
}