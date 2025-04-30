/**
 * @file Types for the Logging service.
 */

import type { LoggingServiceApi } from "@core/logging/api.js";

// Re-export the service API for backward compatibility
export type { LoggingServiceApi };

// Re-export LogLevel for convenience
export type { LogLevel } from "effect";
