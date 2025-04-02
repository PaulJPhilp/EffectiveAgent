import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Effect, Schedule, Duration, pipe, Fiber, FiberStatus } from 'effect';
import type { Task } from '../schema/schedule.ts';

type TaskSuccess = number | void;
type TaskError = Error | TestError;

describe('Effect Scheduling', () => {
  class TestError extends Error {
    readonly _tag = 'TestError';
    constructor(message: string) {
      super(message);
      this.name = 'TestError';
    }
  }
  const createTestError = (message: string): TestError => new TestError(message);
  beforeEach(() => {
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('scheduleTask', () => {
    it('should schedule and execute a task with monitoring', async () => {
      const task: Task<string, TaskSuccess> = {
        id: 'test-task',
        name: 'test-task',
        execute: (input: string) => Effect.sync(() => input.length) as Effect.Effect<number, never, never>
      };

      let count = 0;
      const fiber = await Effect.runPromise(
        Effect.gen(function* () {
          const countTask: Task<void, number> = {
            id: 'count-task',
            name: 'count-task',
            execute: () => Effect.sync(() => {
              count++;
              return count;
            }) as Effect.Effect<number, never, never>
          };
          const f = yield* Effect.fork(
            pipe(
              Effect.sync(() => task.execute('')),
              Effect.flatMap(effect => effect),
              Effect.schedule(Schedule.fixed(Duration.millis(100))),
              Effect.map(() => void 0)
            ) as Effect.Effect<void, never, never>
          );
          return f;
        })
      );

      await Effect.runPromise(Effect.sleep(Duration.millis(250)));
      const result = await Effect.runPromise(
        pipe(
          Effect.interrupt(fiber),
          Effect.map(() => Effect.sync(() => {}))
        )
      );
      expect(result).toBeDefined();

      // Clean up
      await pipe(
        Effect.gen(function* () {
          const task: Task<void, void> = {
            id: 'test-task',
            name: 'test-task',
            execute: () => Effect.sync(() => {})
          };
          yield* Effect.sleep(Duration.millis(100));
          yield* Effect.interrupt(fiber);
          yield* task.execute();
          return Effect.sync(() => {});
        }),
        Effect.flatten,
        Effect.mapError((e) => e as Error),
        Effect.orDie,
        Effect.runPromise
      );
    });

    it('should handle and monitor task failures', async () => {
      const error = createTestError('Test error');
      const taskFn: Task<void, TaskSuccess> = {
        id: 'failing-task',
        name: 'failing-task',
        execute: () => Effect.fail(error)
      };

      let attempts = 0;
      const fiber = await pipe(
        Effect.gen(function* () {
          const task: Task<void, number> = {
            id: 'attempt-task',
            name: 'attempt-task',
            execute: () => Effect.sync(() => {
              attempts++;
              return attempts;
            })
          };
          return yield* pipe(
            taskFn.execute(),
            Effect.schedule(Schedule.recurs(3)),
            Effect.map((result) => result as TaskSuccess),
            Effect.mapError((e) => e as Error),
            Effect.map(() => void 0),
            Effect.fork
          );
        }),
        Effect.mapError((e) => e as Error),
        Effect.map(() => void 0),
        Effect.map((fiber) => fiber as RuntimeFiber<void, Error>),
        Effect.orDie,
        Effect.runPromise
      );

      // Wait for retry attempts
      await Effect.runPromise(Effect.sleep(Duration.millis(500)));

      expect(attempts).toBe(3); // maxAttempts

      // Clean up
      await Effect.runPromise(
        Effect.gen(function* () {
          yield* Effect.interrupt(fiber);
        })
      );
    });

    describe('cancelScheduledTask', () => {
      it('should cancel a scheduled task', async () => {
        const taskFn: Task<void, number> = {
          id: 'test-task',
          name: 'test-task',
          execute: () => Effect.sync(() => 1) as Effect.Effect<number, never, void>
        };

        const fiber = await pipe(
          taskFn.execute(),
          Effect.schedule(Schedule.fixed(Duration.millis(100))),
          Effect.fork,
          Effect.runPromise
        )

        // Wait for some executions
        await Effect.runPromise(Effect.sleep(Duration.millis(250)));

        // Cancel the task
        await pipe(
          Effect.interrupt,
          Effect.map(() => void 0),
          Effect.map(() => void 0),
          Effect.runPromise
        );

        // Verify fiber is interrupted
        const status = await pipe(
          fiber.status,
          Effect.map((s) => s._tag),
          Effect.runPromise
        );
        expect(status).toBe('Done');
      });
    });
  });
