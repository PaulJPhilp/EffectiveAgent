import { Effect, Layer, Queue, Schedule } from "effect"
import { createConfig } from "./config.js"
import { AgentRuntimeError } from "./errors.js"
import type {
    AgentRecord,
    AgentRuntimeConfig,
    AgentRuntimeId,
    AgentRuntimeState,
    ProcessingLogic
} from "./types.js"
import { createInitialState, makeAgentRuntimeId, updateState } from "./utils.js"

export interface AgentRuntimeService {
    create: <S>(
        initialState: S,
        logic: ProcessingLogic<S>,
        config?: Partial<AgentRuntimeConfig>
    ) => Effect.Effect<AgentRuntimeId, AgentRuntimeError>

    terminate: (
        id: AgentRuntimeId
    ) => Effect.Effect<void, AgentRuntimeError>

    send: (
        id: AgentRuntimeId,
        record: AgentRecord
    ) => Effect.Effect<void, AgentRuntimeError>

    getState: <S>(
        id: AgentRuntimeId
    ) => Effect.Effect<AgentRuntimeState<S>, AgentRuntimeError>
}

class AgentRuntimeServiceImpl implements AgentRuntimeService {
    private runtimes = new Map<AgentRuntimeId, Effect.Runtime<never>>()
    private states = new Map<AgentRuntimeId, AgentRuntimeState<unknown>>()
    private queues = new Map<AgentRuntimeId, Queue.Queue<AgentRecord>>()

    create<S>(
        initialState: S,
        logic: ProcessingLogic<S>,
        config?: Partial<AgentRuntimeConfig>
    ): Effect.Effect<AgentRuntimeId, AgentRuntimeError> {
        return Effect.gen(function* ($) {
            const id = makeAgentRuntimeId()
            const fullConfig = createConfig(config ?? {})

            const queue = yield* $(Queue.bounded<AgentRecord>(fullConfig.mailbox.size))
            const state = createInitialState(id, initialState)

            this.queues.set(id, queue)
            this.states.set(id, state)

            const runtime = yield* $(Effect.runtime<never>())
            this.runtimes.set(id, runtime)

            // Start processing loop
            const processing = Effect.repeat(
                Effect.gen(function* ($) {
                    const record = yield* $(Queue.take(queue))
                    const currentState = this.states.get(id)!
                    const newState = yield* $(logic(record, currentState.state))
                    yield* $(updateState(currentState, { state: newState }))
                }),
                Schedule.forever
            )

            yield* $(Effect.fork(processing))

            return id
        })
    }

    terminate(
        id: AgentRuntimeId
    ): Effect.Effect<void, AgentRuntimeError> {
        return Effect.try({
            try: () => {
                const runtime = this.runtimes.get(id)
                if (!runtime) {
                    throw new AgentRuntimeError(`Runtime ${id} not found`)
                }

                runtime.interrupt()
                this.runtimes.delete(id)
                this.states.delete(id)
                this.queues.delete(id)
            },
            catch: (error) => new AgentRuntimeError(`Failed to terminate runtime: ${error}`)
        })
    }

    send(
        id: AgentRuntimeId,
        record: AgentRecord
    ): Effect.Effect<void, AgentRuntimeError> {
        return Effect.gen(function* ($) {
            const queue = this.queues.get(id)
            if (!queue) {
                throw new AgentRuntimeError(`Runtime ${id} not found`)
            }

            yield* $(Queue.offer(queue, record))
        })
    }

    getState<S>(
        id: AgentRuntimeId
    ): Effect.Effect<AgentRuntimeState<S>, AgentRuntimeError> {
        return Effect.try({
            try: () => {
                const state = this.states.get(id)
                if (!state) {
                    throw new AgentRuntimeError(`Runtime ${id} not found`)
                }
                return state as AgentRuntimeState<S>
            },
            catch: (error) => new AgentRuntimeError(`Failed to get state: ${error}`)
        })
    }
}

export const AgentRuntimeService = new AgentRuntimeServiceImpl()

export const AgentRuntimeServiceLive = Layer.succeed(
    AgentRuntimeService,
    new AgentRuntimeServiceImpl()
)