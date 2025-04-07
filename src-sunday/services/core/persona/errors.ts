/**
 * @file Defines errors specific to the PersonaConfiguration Service.
 */

import { AppError } from "../../errors.js"; // Adjust path as needed

/** Base error for PersonaConfiguration service operations. */
export class PersonaConfigurationError extends AppError {
  constructor(params: {
    message: string;
    personaName?: string; // Optional: name of the persona involved
    cause?: unknown;
    context?: Record<string, unknown>;
  }) {
    super({
      message: `Persona Configuration Error${params.personaName ? ` ('${params.personaName}')` : ''}: ${params.message}`,
      cause: params.cause,
      context: { ...params.context, personaName: params.personaName, errorType: "PersonaConfigurationError" },
    });
  }
}

/** Error indicating a requested Persona definition was not found. */
export class PersonaNotFoundError extends PersonaConfigurationError {
  constructor(params: { personaName: string; message?: string; cause?: unknown }) {
    super({
      personaName: params.personaName,
      message: params.message ?? `Persona definition not found.`,
      cause: params.cause,
      context: { errorType: "PersonaNotFoundError" },
    });
  }
}

// Add other specific errors if needed (e.g., validation errors during loading)
