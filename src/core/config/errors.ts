import { EffectiveError } from '../../effective-error.js';

/**
 * Error for issues related to loading or validating the master configuration.
 */
export class MasterConfigurationError extends EffectiveError {
  constructor(
    params: {
      message: string;
      filePath?: string;
      cause?: unknown;
    }
  ) {
    super({
      description: params.message,
      cause: params.cause,
      module: 'CoreConfig',
      method: 'loadMasterConfig', // Or more specific when used
      // You can add filePath to the `meta` property of EffectiveError if needed
      // meta: { filePath: params.filePath }
    });
    this.name = 'MasterConfigurationError';
    if (params.filePath) {
      // If you want to store filePath directly on the error instance (optional)
      // (this as any).filePath = params.filePath;
    }
  }
}

