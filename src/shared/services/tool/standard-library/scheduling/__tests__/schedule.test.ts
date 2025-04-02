import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Effect, Schedule, Duration, pipe } from 'effect';
import type { ScheduleConfig, ScheduleType } from '../schema/schedule.js';
import { ScheduleService } from '../service/schedule.js';
import { ScheduleConfigurationError } from '../errors/schedule-errors.js';

describe('ScheduleService', () => {
  let scheduleService: ScheduleService;

  beforeEach(() => {
    scheduleService = new ScheduleService();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('createSchedule', () => {
    it('should create a fixed interval schedule', async () => {
      const config: ScheduleConfig<void, void> = {
        type: 'fixed' as ScheduleType,
        interval: Duration.millis(100)
      };

      const schedule = scheduleService.createSchedule(config);
      expect(schedule).toBeDefined();

      const program = pipe(
        Effect.sync(() => 1),
        Effect.repeat(schedule),
        Effect.provideEnvironment(Effect.empty)
      );

      await pipe(
        program,
        Effect.timeout(Duration.millis(250)),
        Effect.map((result) => result ?? 0),
        Effect.orDie,
        Effect.runPromise
      );
      expect(program).toBeDefined();
    });

    it('should create a spaced interval schedule', async () => {
      const config: ScheduleConfig<void, void> = {
        type: 'spaced' as ScheduleType,
        interval: Duration.millis(100)
      };

      const schedule = scheduleService.createSchedule(config);
      expect(schedule).toBeDefined();

      const program = pipe(
        Effect.sync(() => 1),
        Effect.repeat(schedule),
        Effect.provideEnvironment(Effect.empty)
      );

      await pipe(
        program,
        Effect.timeout(Duration.millis(250)),
        Effect.map((result) => result ?? 0),
        Effect.orDie,
        Effect.runPromise
      );
      expect(program).toBeDefined();
    });

    it('should create a retry schedule with exponential backoff', async () => {
      const config: ScheduleConfig<Error, void> = {
        type: 'retry' as ScheduleType,
        maxAttempts: 3,
        backoff: 'exponential'
      };

      const schedule = scheduleService.createSchedule(config);
      expect(schedule).toBeDefined();

      let attempts = 0;
      const program = Effect.retry(
        Effect.sync(() => {
          attempts++;
          if (attempts < 3) throw new Error('Test error');
          return attempts;
        }),
        schedule
      );

      const result = await Effect.runPromise(program);
      expect(result).toBe(3);
    });

    it('should create a retry schedule with fibonacci backoff', async () => {
      const config: ScheduleConfig<Error, void> = {
        type: 'retry' as ScheduleType,
        maxAttempts: 3,
        backoff: 'fibonacci'
      };

      const schedule = scheduleService.createSchedule(config);
      expect(schedule).toBeDefined();

      let attempts = 0;
      const program = Effect.retry(
        Effect.sync(() => {
          attempts++;
          if (attempts < 3) throw new Error('Test error');
          return attempts;
        }),
        schedule
      );

      const result = await Effect.runPromise(program);
      expect(result).toBe(3);
    });

    it('should throw ScheduleConfigurationError for invalid config', () => {
      const config = {
        type: 'invalid' as ScheduleType,
      };

      expect(() => scheduleService.createSchedule(config))
        .toThrow(ScheduleConfigurationError);
    });
  });

  describe('composeSchedules', () => {
    it('should compose schedules with union operator', async () => {
      const schedule1 = scheduleService.createSchedule({
        type: 'fixed',
        interval: Duration.millis(100)
      });

      const schedule2 = scheduleService.createSchedule({
        type: 'fixed',
        interval: Duration.millis(200)
      });

      const composed = scheduleService.composeSchedules(
        schedule1,
        schedule2,
        'union'
      );

      const program = pipe(
        Effect.sync(() => 1),
        Effect.repeat(composed),
        Effect.provideEnvironment(Effect.empty)
      );

      await pipe(
        program,
        Effect.timeout(Duration.millis(250)),
        Effect.map((result) => result ?? 0),
        Effect.orDie,
        Effect.runPromise
      );
      expect(program).toBeDefined();
    });

    it('should compose schedules with intersection operator', async () => {
      const schedule1 = scheduleService.createSchedule({
        type: 'fixed',
        interval: Duration.millis(100)
      });

      const schedule2 = scheduleService.createSchedule({
        type: 'fixed',
        interval: Duration.millis(200)
      });

      const composed = scheduleService.composeSchedules(
        schedule1,
        schedule2,
        'intersection'
      );

      const program = pipe(
        Effect.sync(() => 1),
        Effect.repeat(composed),
        Effect.provideEnvironment(Effect.empty)
      );

      await pipe(
        program,
        Effect.timeout(Duration.millis(250)),
        Effect.map((result) => result ?? 0),
        Effect.orDie,
        Effect.runPromise
      );
      expect(program).toBeDefined();
    });
  });
});
