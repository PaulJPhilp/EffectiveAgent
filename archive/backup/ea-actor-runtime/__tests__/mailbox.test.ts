import { Effect, Stream } from "effect"
import { describe, expect, it } from "vitest"
import { Mailbox } from "../mailbox.js"
import { AgentActivity, MessagePriority } from "../types.js"

describe("Mailbox", () => {
  const createTestActivity = (priority?: MessagePriority): AgentActivity => ({
    agentRuntimeId: "test-agent",
    type: "COMMAND",
    payload: { test: true },
    sequence: 1,
    timestamp: Date.now(),
    metadata: {
      priority
    }
  })

  const createTestMailbox = (config = {
    size: 10,
    priorityQueueSize: 5,
    enablePrioritization: true
  }) => Mailbox.create(config)

  it("should create a mailbox with default configuration", () =>
    Effect.gen(function* () {
      const mailbox = yield* createTestMailbox()
      expect(mailbox).toBeInstanceOf(Mailbox)
    })
  )

  it("should offer and take activities", () =>
    Effect.gen(function* () {
      const mailbox = yield* createTestMailbox()
      const activity = createTestActivity()

      yield* mailbox.offer(activity)
      const received = yield* mailbox.take()

      expect(received).toEqual(activity)
    })
  )

  it("should handle priority queues when enabled", () =>
    Effect.gen(function* () {
      const mailbox = yield* createTestMailbox()
      const highPriority = createTestActivity(MessagePriority.HIGH)
      const normalPriority = createTestActivity(MessagePriority.NORMAL)

      yield* mailbox.offer(normalPriority)
      yield* mailbox.offer(highPriority)

      const first = yield* mailbox.take()
      const second = yield* mailbox.take()

      expect(first).toEqual(highPriority)
      expect(second).toEqual(normalPriority)
    })
  )

  it("should not use priority queues when disabled", () =>
    Effect.gen(function* () {
      const mailbox = yield* createTestMailbox({
        size: 10,
        priorityQueueSize: 5,
        enablePrioritization: false
      })
      const highPriority = createTestActivity(MessagePriority.HIGH)
      const normalPriority = createTestActivity(MessagePriority.NORMAL)

      yield* mailbox.offer(normalPriority)
      yield* mailbox.offer(highPriority)

      const first = yield* mailbox.take()
      const second = yield* mailbox.take()

      expect(first).toEqual(normalPriority)
      expect(second).toEqual(highPriority)
    })
  )

  it("should fail when offering to an invalid priority queue", () =>
    Effect.gen(function* () {
      const mailbox = yield* createTestMailbox()
      const activity = createTestActivity(99 as MessagePriority)

      const error = yield* Effect.either(mailbox.offer(activity)).pipe(
        Effect.match({
          onFailure: (e) => e,
          onSuccess: () => null
        })
      )
      expect(error).toBeInstanceOf(MailboxError)
    })
  )

  it("should create a subscription stream", () =>
    Effect.gen(function* () {
      const mailbox = yield* createTestMailbox()
      const activity = createTestActivity()

      yield* mailbox.offer(activity)

      const stream = mailbox.subscribe()
      const first = yield* Stream.runHead(stream)

      expect(first).toEqual(activity)
    })
  )

  it("should shutdown cleanly", () =>
    Effect.gen(function* () {
      const mailbox = yield* createTestMailbox()
      yield* mailbox.shutdown()

      const result = yield* Effect.either(mailbox.offer(createTestActivity()))
      expect(result._tag).toBe("Left")
    })
  )
})
