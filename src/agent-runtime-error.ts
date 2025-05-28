import { EffectiveError } from './effective-error.js';

/**
 * Base error for issues originating from the AgentRuntime.
 */
export class AgentRuntimeError extends EffectiveError {
  constructor(params: { message: string; cause?: unknown }) {
    super({
      description: params.message, // Correctly map message to description
      cause: params.cause,
      module: 'AgentRuntime',
      method: 'unknown', // Or a more specific method if applicable when error is thrown
    });
    this.name = 'AgentRuntimeError'; // Ensure correct error name
  }
}

