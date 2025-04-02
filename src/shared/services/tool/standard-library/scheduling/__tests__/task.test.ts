import { describe, it, expect, beforeEach } from 'vitest';
import { Effect, pipe } from 'effect';
import type { Task } from '../schema/schedule';
import { TaskExecutionError } from '../errors/schedule-errors';
import { TaskService, TaskServiceImpl } from '../service/task';

describe('TaskService', () => {
  let taskService: TaskService;

  beforeEach(() => {
    taskService = new TaskServiceImpl();
  });

  describe('createTask', () => {
    it('should create a task with the given configuration', async () => {
      const taskConfig = {
        name: 'test-task',
        execute: () => Effect.succeed(1) as Effect.Effect<number, never, void>
      };

      const task = await pipe(
        taskService.createTask(taskConfig),
        Effect.runPromise
      );

      expect(task.id).toBeDefined();
      expect(task.name).toBe('test-task');
    });

    it('should execute the task with the given input', async () => {
      const taskConfig = {
        name: 'test-task',
        execute: (input: number) => Effect.succeed(input * 2) as Effect.Effect<number, never, void>
      };

      const task = await pipe(
        taskService.createTask(taskConfig),
        Effect.runPromise
      );

      const result = await pipe(
        task.execute(2),
        Effect.runPromise
      );

      expect(result).toBe(4);
    });

    it('should handle task execution errors', async () => {
      const error = new Error('Task failed');
      const taskConfig = {
        name: 'failing-task',
        execute: () => Effect.fail(error) as Effect.Effect<never, Error, void>
      };

      const task = await pipe(
        taskService.createTask(taskConfig),
        Effect.runPromise
      );

      await expect(pipe(
        task.execute(undefined),
        Effect.runPromise
      )).rejects.toThrow(TaskExecutionError);
    });
  });
});
