import { Effect, Schedule, Duration } from 'effect';

export type ScheduleType = 'fixed' | 'spaced' | 'retry';
export type BackoffStrategy = 'exponential' | 'fibonacci';

export interface ScheduleConfig<In, Out> {
  readonly type: ScheduleType;
  readonly interval?: Duration.Duration;
  readonly maxAttempts?: number;
  readonly backoff?: BackoffStrategy;
  readonly onError?: (error: Error) => Effect.Effect<never, Error, void>;
}

export interface TaskConfig<In, Out> {
  readonly name: string;
  readonly execute: (input: In) => Effect.Effect<Out, Error, void>;
}

export type TaskId = string & { readonly _: unique symbol };
export type ScheduleId = string & { readonly _: unique symbol };

export interface ExecutionRecord<In, Out> {
  readonly taskId: TaskId;
  readonly scheduleId: ScheduleId;
  readonly input: In;
  readonly output?: Out;
  readonly error?: Error;
  readonly duration: Duration.Duration;
  readonly timestamp: Date;
}
