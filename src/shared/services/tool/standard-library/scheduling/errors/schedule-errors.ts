import { z } from 'zod';
import { BaseError } from '../../../errors/base-error.ts';

export class ScheduleConfigurationError extends BaseError {
  readonly _tag = 'ScheduleConfigurationError';

  constructor(message: string, cause?: Error) {
    super({
      name: 'ScheduleConfigurationError',
      message,
      cause
    });
  }

  static fromZodError(error: z.ZodError): ScheduleConfigurationError {
    return new ScheduleConfigurationError(
      'Invalid schedule configuration: ' + error.message
    );
  }
}

export class TaskExecutionError extends BaseError {
  readonly _tag = 'TaskExecutionError';

  constructor(message: string, cause?: Error) {
    super({
      name: 'TaskExecutionError',
      message,
      cause
    });
  }
}

export class ScheduleCompositionError extends BaseError {
  readonly _tag = 'ScheduleCompositionError';

  constructor(message: string, cause?: Error) {
    super({
      name: 'ScheduleCompositionError',
      message,
      cause
    });
  }
}

export class MonitoringError extends BaseError {
  readonly _tag = 'MonitoringError';

  constructor(message: string, cause?: Error) {
    super({
      name: 'MonitoringError',
      message,
      cause
    });
  }
}
