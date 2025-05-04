import { Effect, Option, Queue, Ref, Stream, pipe } from "effect"
import { describe, expect, it } from "vitest"
import { EffectorError, EffectorNotFoundError, EffectorTerminatedError } from "../errors.js"
import type { Effector } from "../api.js"
import { EffectorService } from "../service.js"
import type { AgentRecord, EffectorId, EffectorState } from "../types.js"
import { AgentRecordType, makeEffectorId } from "../types.js"

// Test implementation factory
const createTestImpl = () => Effect.gen(function* () {
    // Create test state
    const instances = yield* Ref.make(new Map<EffectorId, {
        state: Ref.Ref<EffectorState<any>>,
        mailbox: Queue.Queue<AgentRecord>,
        subscribers: Set<Queue.Queue<AgentRecord>>
    }>())

    return {
        create: <S>(id: EffectorId, initialState: S) => Effect.gen(function* () {
            const existing = yield* pipe(
                Ref.get(instances),
                Effect.map(map => map.has(id))
            )

            if (existing) {
                return yield* Effect.fail(new EffectorError({
                    effectorId: id,
                    message: `Effector with ID ${id} already exists`
                }))
            }

            const state = yield* Ref.make<EffectorState<S>>({
                id,
                state: initialState,
                status: "IDLE" as const,
                lastUpdated: Date.now()
            })

            const mailbox = yield* Queue.bounded<AgentRecord>(100)

            yield* Ref.update(instances, map => map.set(id, {
                state,
                mailbox,
                subscribers: new Set()
            }))

            const effector: Effector<S> = {
                id,
                send: (record: AgentRecord) => Queue.offer(mailbox, record),
                getState: () => Ref.get(state),
                subscribe: () => Stream.fromQueue(mailbox, { shutdown: true })
            }

            return effector
        }),

        terminate: (id: EffectorId) => Effect.gen(function* () {
            const instance = yield* pipe(
                Ref.get(instances),
                Effect.map(map => map.get(id)),
                Effect.flatMap(instance =>
                    instance
                        ? Effect.succeed(instance)
                        : Effect.fail(new EffectorNotFoundError({ effectorId: id, message: `Effector ${id} not found` }))
                )
            )

            yield* Ref.update(instance.state, state => ({
                ...state,
                status: "TERMINATED" as const,
                lastUpdated: Date.now()
            }))

            yield* Queue.shutdown(instance.mailbox)
            yield* Ref.update(instances, map => {
                map.delete(id)
                return map
            })
        }),

        send: (id: EffectorId, record: AgentRecord) => Effect.gen(function* () {
            const instance = yield* pipe(
                Ref.get(instances),
                Effect.map(map => map.get(id)),
                Effect.flatMap(instance =>
                    instance
                        ? Effect.succeed(instance)
                        : Effect.fail(new EffectorNotFoundError({ effectorId: id, message: `Effector ${id} not found` }))
                )
            )

            const state = yield* Ref.get(instance.state)
            if (state.status === "TERMINATED") {
                return yield* Effect.fail(new EffectorTerminatedError({
                    effectorId: id,
                    terminatedAt: state.lastUpdated,
                    message: `Cannot send message to terminated Effector ${id}`
                }))
            }

            yield* Queue.offer(instance.mailbox, record)
        }),

        getState: <S>(id: EffectorId) => pipe(
            Ref.get(instances),
            Effect.map(map => map.get(id)),
            Effect.flatMap(instance =>
                instance
                    ? Ref.get(instance.state as Ref.Ref<EffectorState<S>>)
                    : Effect.fail(new EffectorNotFoundError({ effectorId: id, message: `Effector ${id} not found` }))
            )
        ),

        subscribe: (id: EffectorId) => pipe(
            Effect.gen(function* () {
                const instance = yield* pipe(
                    Ref.get(instances),
                    Effect.map(map => map.get(id)),
                    Effect.flatMap(instance =>
                        instance
                            ? Effect.succeed(instance)
                            : Effect.fail(new EffectorNotFoundError({ effectorId: id, message: `Effector ${id} not found` }))
                    )
                )
                return instance.mailbox
            }),
            Stream.fromEffect,
            Stream.flatMap(queue => Stream.fromQueue(queue, { shutdown: true }))
        )
    }
})

describe("EffectorService", () => {
    describe("create", () => {
        it("should create a new Effector with initial state", () =>
            Effect.gen(function* (_) {
                const service = yield* EffectorService
                const id = makeEffectorId("test")
                const initialState = { count: 0 }

                const effector = yield* service.create(id, initialState)
                expect(effector.id).toBe(id)

                const state = yield* effector.getState()
                expect(state.state).toEqual(initialState)
                expect(state.status).toBe("IDLE")
            })
        )

        it("should fail when creating an Effector with existing ID", () =>
            Effect.gen(function* (_) {
                const service = yield* EffectorService
                const id = makeEffectorId("test")
                const initialState = { count: 0 }

                yield* service.create(id, initialState)
                const result = yield* Effect.flip(service.create(id, initialState))
                expect(result).toBeInstanceOf(EffectorError)
            })
        )
    })

    describe("terminate", () => {
        it("should terminate an existing Effector", () =>
            Effect.gen(function* (_) {
                const service = yield* EffectorService
                const id = makeEffectorId("test")
                const initialState = { count: 0 }

                yield* service.create(id, initialState)
                yield* service.terminate(id)

                // Should fail to get state after termination
                const result = yield* Effect.flip(service.getState(id))
                expect(result).toBeInstanceOf(EffectorNotFoundError)
            })
        )

        it("should fail when terminating non-existent Effector", () =>
            Effect.gen(function* (_) {
                const service = yield* EffectorService
                const id = makeEffectorId("non-existent")
                const result = yield* Effect.flip(service.terminate(id))
                expect(result).toBeInstanceOf(EffectorNotFoundError)
            })
        )
    })

    describe("send", () => {
        it("should send messages to an Effector", () =>
            Effect.gen(function* (_) {
                const service = yield* EffectorService
                const id = makeEffectorId("test")
                const effector = yield* service.create(id, { count: 0 })

                const record: AgentRecord = {
                    id: "test-record",
                    effectorId: id,
                    timestamp: Date.now(),
                    type: "COMMAND",
                    payload: { type: "INCREMENT" },
                    metadata: {}
                }

                yield* service.send(id, record)

                // Verify message was received via subscription
                const messages: AgentRecord[] = []
                yield* pipe(
                    effector.subscribe(),
                    Stream.take(1),
                    Stream.runForEach(msg => Effect.sync(() => messages.push(msg)))
                )

                expect(messages).toHaveLength(1)
                expect(messages[0]).toEqual(record)
            })
        )

        it("should fail when sending message to terminated Effector", () =>
            Effect.gen(function* (_) {
                const service = yield* EffectorService
                const id = makeEffectorId("test")
                const initialState = { count: 0 }

                yield* service.create(id, initialState)
                yield* service.terminate(id)

                const record: AgentRecord = {
                    id: "test-record",
                    effectorId: id,
                    timestamp: Date.now(),
                    type: "COMMAND",
                    payload: { type: "INCREMENT" },
                    metadata: {}
                }

                const result = yield* Effect.flip(service.send(id, record))
                expect(result).toBeInstanceOf(EffectorTerminatedError)
            })
        )
    })

    describe("getState", () => {
        it("should get current state of an Effector", () =>
            Effect.gen(function* (_) {
                const service = yield* EffectorService
                const id = makeEffectorId("test")
                const initialState = { count: 0 }

                yield* service.create(id, initialState)
                const state = yield* service.getState<typeof initialState>(id)

                expect(state.state).toEqual(initialState)
            })
        )

        it("should fail when getting state of non-existent Effector", () =>
            Effect.gen(function* (_) {
                const service = yield* EffectorService
                const id = makeEffectorId("non-existent")
                const result = yield* Effect.flip(service.getState(id))
                expect(result).toBeInstanceOf(EffectorNotFoundError)
            })
        )
    })

    describe("subscribe", () => {
        it("should receive messages via subscription", () =>
            Effect.gen(function* (_) {
                const service = yield* EffectorService
                const id = makeEffectorId("test")
                yield* service.create(id, { count: 0 })

                // Create a promise to resolve when we receive the message
                let resolve: (value: AgentRecord) => void
                const received = new Promise<AgentRecord>(r => resolve = r)

                // Set up subscription to resolve promise on first message
                const subscription = pipe(
                    service.subscribe(id),
                    Stream.tap(message => Effect.sync(() => resolve(message))),
                    Stream.take(1)
                )

                // Start consuming the stream
                yield* Stream.runDrain(subscription)

                // Send test message
                const record: AgentRecord = {
                    id: "test-record",
                    effectorId: id,
                    timestamp: Date.now(),
                    type: AgentRecordType.EVENT,
                    payload: { value: 1 },
                    metadata: {}
                }
                yield* service.send(id, record)

                // Wait for message and verify
                const value = yield* Effect.promise(() => received)
                expect(value).toEqual(record)
            })
        )
    })
})