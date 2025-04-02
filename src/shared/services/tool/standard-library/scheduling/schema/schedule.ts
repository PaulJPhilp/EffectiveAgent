import { z } from 'zod';
import { Effect, Duration } from 'effect';

// Primitive schemas
export const ScheduleTypeSchema = z.enum(['fixed', 'spaced', 'retry']);
export const BackoffStrategySchema = z.enum(['exponential', 'fibonacci']);

// Duration schema - validates that the value is a Duration instance
export const DurationSchema = z.custom<Duration.Duration>(
  (val): val is Duration.Duration => Duration.isDuration(val),
  'Must be a valid Duration'
);

// Error handler schema
export const ErrorHandlerSchema = z.function()
  .args(z.instanceof(Error))
  .returns(z.custom<Effect.Effect<never, Error, void>>(
    (val): val is Effect.Effect<never, Error, void> => Effect.isEffect(val),
    'Must return an Effect'
  ));

// Schedule configuration schema
export const ScheduleConfigSchema = <In, Out>() => z.object({
  type: ScheduleTypeSchema,
  interval: DurationSchema.optional(),
  maxAttempts: z.number().int().positive().optional(),
  backoff: BackoffStrategySchema.optional(),
  onError: ErrorHandlerSchema.optional()
}).strict();

// Task interface
export interface Task<In, Out> {
  id: string;
  name: string;
  execute: (input: In) => Effect.Effect<Out, Error, void>;
}

// Execution record schema
export const ExecutionRecordSchema = <In, Out>() => z.object({
  scheduleId: z.string().brand('ScheduleId'),
  input: z.custom<In>(),
  output: z.custom<Out>().optional(),
  error: z.instanceof(Error).optional(),
  duration: DurationSchema,
  timestamp: z.date()
}).strict();

// Type exports
export type ScheduleType = z.infer<typeof ScheduleTypeSchema>;
export type BackoffStrategy = z.infer<typeof BackoffStrategySchema>;
export type ScheduleConfig<In, Out> = z.infer<ReturnType<typeof ScheduleConfigSchema<In, Out>>>;

export type ExecutionRecord<In, Out> = z.infer<ReturnType<typeof ExecutionRecordSchema<In, Out>>>;

export type ScheduleId = string & { readonly _: unique symbol };
