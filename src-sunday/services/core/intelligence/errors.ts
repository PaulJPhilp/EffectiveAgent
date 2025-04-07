/**
 * @file Defines errors specific to the IntelligenceConfiguration Service.
 */

import { AppError } from "../../errors.js"; // Import global base error

/** Base error for IntelligenceConfiguration service operations. */
export class IntelligenceConfigurationError extends AppError {
  constructor(params: {
    message: string;
    profileName?: string; // Optional: name of the profile involved
    cause?: unknown;
    context?: Record<string, unknown>;
  }) {
    super({
      message: `Intelligence Configuration Error${params.profileName ? ` ('${params.profileName}')` : ''}: ${params.message}`,
      cause: params.cause,
      context: { ...params.context, profileName: params.profileName, errorType: "IntelligenceConfigurationError" },
    });
  }
}

/** Error indicating a requested Intelligence Profile definition was not found. */
export class IntelligenceProfileNotFoundError extends IntelligenceConfigurationError {
  constructor(params: { profileName: string; message?: string; cause?: unknown }) {
    super({
      profileName: params.profileName,
      message: params.message ?? `Intelligence profile definition not found.`,
      cause: params.cause,
      context: { errorType: "IntelligenceProfileNotFoundError" },
    });
  }
}

// Add other specific errors if needed (e.g., validation errors during loading, though ConfigLoader handles most)
