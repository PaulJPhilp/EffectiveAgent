import { Effect, Queue, Stream } from "effect"
import { describe, expect, it } from "vitest"
import { MailboxError } from "../../errors.js"
import { AgentActivity, MessagePriority, makeAgentRuntimeId } from "../../types.js"
import { PrioritizedMailbox } from "../prioritized-mailbox.js"

describe("PrioritizedMailbox", () => {
  const createTestActivity = (priority?: MessagePriority): AgentActivity => ({
    id: "test-activity",
    agentRuntimeId: makeAgentRuntimeId("test-agent"),
    type: "COMMAND",
    payload: { test: true },
    sequence: 1,
    timestamp: Date.now(),
    metadata: {
      priority,
      timeout: 100
    }
  })

  const createTestMailbox = (config = { 
    size: 10, 
    priorityQueueSize: 5, 
    enablePrioritization: true 
  }) => PrioritizedMailbox.create(config)

  it("should create a prioritized mailbox with default configuration", () =>
    Effect.gen(function* () {
      const mailbox = yield* createTestMailbox()
      expect(mailbox).toBeInstanceOf(PrioritizedMailbox)
    })
  )

  it("should offer and take activities with priority handling", () =>
    Effect.gen(function* () {
      const mailbox = yield* createTestMailbox()
      const activity = createTestActivity(MessagePriority.HIGH)

      yield* mailbox.offer(activity)
      const received = yield* mailbox.take()

      expect(received).toEqual(activity)
    })
  )

  it("should respect priority order when taking activities", () =>
    Effect.gen(function* () {
      const mailbox = yield* createTestMailbox()
      const highPriority = createTestActivity(MessagePriority.HIGH)
      const normalPriority = createTestActivity(MessagePriority.NORMAL)
      const lowPriority = createTestActivity(MessagePriority.LOW)

      // Offer in reverse priority order
      yield* mailbox.offer(lowPriority)
      yield* mailbox.offer(normalPriority)
      yield* mailbox.offer(highPriority)

      // Should receive in priority order
      const first = yield* mailbox.take()
      const second = yield* mailbox.take()
      const third = yield* mailbox.take()

      expect(first).toEqual(highPriority)
      expect(second).toEqual(normalPriority)
      expect(third).toEqual(lowPriority)
    })
  )

  it("should handle backpressure with timeouts", () =>
    Effect.gen(function* () {
      const mailbox = yield* createTestMailbox({ 
        size: 1, 
        priorityQueueSize: 1, 
        enablePrioritization: true 
      })

      // Fill the queue
      yield* mailbox.offer(createTestActivity(MessagePriority.HIGH))
      
      // This should timeout
      const error = yield* Effect.either(mailbox.offer(createTestActivity(MessagePriority.HIGH))).pipe(
        Effect.match({
          onFailure: (e: MailboxError) => e,
          onSuccess: () => null
        })
      )
      expect(error).toBeInstanceOf(MailboxError)
      if (error) {
        expect(error.message).toContain("timed out")
      }
    })
  )

  it("should track mailbox statistics", () =>
    Effect.gen(function* () {
      const mailbox = yield* createTestMailbox()
      const activity = createTestActivity()

      // Initial stats
      const initialStats = yield* mailbox.getStats()
      expect(initialStats.processed).toBe(0)
      expect(initialStats.timeouts).toBe(0)
      expect(initialStats.size).toBe(0)

      // Process an activity
      yield* mailbox.offer(activity)
      yield* mailbox.take()

      // Updated stats
      const updatedStats = yield* mailbox.getStats()
      expect(updatedStats.processed).toBe(1)
      expect(updatedStats.size).toBe(0)
    })
  )

  it("should create a prioritized subscription stream", () =>
    Effect.gen(function* () {
      const mailbox = yield* createTestMailbox()
      const highPriority = createTestActivity(MessagePriority.HIGH)
      const lowPriority = createTestActivity(MessagePriority.LOW)

      yield* mailbox.offer(lowPriority)
      yield* mailbox.offer(highPriority)
      
      const stream = mailbox.subscribe()
      const first = yield* Stream.runHead(stream)
      
      expect(first).toEqual(highPriority)
    })
  )

  it("should handle non-prioritized mode correctly", () =>
    Effect.gen(function* () {
      const mailbox = yield* createTestMailbox({ 
        size: 10, 
        priorityQueueSize: 5, 
        enablePrioritization: false 
      })
      const highPriority = createTestActivity(MessagePriority.HIGH)
      const lowPriority = createTestActivity(MessagePriority.LOW)

      yield* mailbox.offer(lowPriority)
      yield* mailbox.offer(highPriority)

      const first = yield* mailbox.take()
      const second = yield* mailbox.take()

      expect(first).toEqual(lowPriority)
      expect(second).toEqual(highPriority)
    })
  )

  it("should shutdown all queues cleanly", () =>
    Effect.gen(function* () {
      const mailbox = yield* createTestMailbox()
      
      // Offer activities to multiple priority queues
      yield* mailbox.offer(createTestActivity(MessagePriority.HIGH))
      yield* mailbox.offer(createTestActivity(MessagePriority.NORMAL))
      yield* mailbox.offer(createTestActivity(MessagePriority.LOW))

      // Shutdown
      yield* mailbox.shutdown()
      
      // Should fail to offer after shutdown
      const result = yield* Effect.either(mailbox.offer(createTestActivity()))
      expect(result._tag).toBe("Left")
    })
  )
})
