import { Effect } from 'effect';
import { v4 as uuidv4 } from 'uuid';
import type { Task } from '../schema/schedule.ts';
import { TaskExecutionError } from '../errors/schedule-errors.ts';

export interface TaskConfig<In, Out> {
  name: string;
  execute: (input: In) => Effect.Effect<Out, Error, void>;
}

export interface TaskService {
  createTask<In, Out>(config: TaskConfig<In, Out>): Effect.Effect<Task<In, Out>, TaskExecutionError, void>;
}

export class TaskServiceImpl implements TaskService {
  createTask<In, Out>(config: TaskConfig<In, Out>): Effect.Effect<Task<In, Out>, TaskExecutionError, void> {
    return Effect.try({
      try: () => ({
        id: uuidv4(),
        name: config.name,
        execute: (input: In): Effect.Effect<Out, TaskExecutionError, void> => 
          Effect.tryPromise({
            try: () => config.execute(input)(),
            catch: (error) => new TaskExecutionError(`Task ${config.name} failed: ${error}`)
          })
      }),
      catch: (error) => new TaskExecutionError(`Failed to create task: ${error}`)
    });
  }

  static create(): TaskService {
    return new TaskServiceImpl();
  }
}
