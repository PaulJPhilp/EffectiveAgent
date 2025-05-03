/**
 * @file Defines the API interface for the Intelligence service.
 * @module services/capabilities/intelligence/api
 */

import type { Effect } from "effect";
import type { IntelligenceConfigError } from "./errors.js";
import type { IntelligenceFile, IntelligenceType } from "./schema.js";

/**
 * API interface for the Intelligence service.
 * Provides methods for loading and managing intelligence configurations.
 */
export interface IntelligenceServiceApi {
  /**
   * Load and validate the intelligence configuration.
   * @returns Effect that resolves to the validated intelligence configuration
   */
  readonly load: () => Effect.Effect<IntelligenceFile, IntelligenceConfigError>;

  /**
   * Get a specific intelligence profile by name.
   * @param name The name of the intelligence profile to retrieve
   * @returns Effect that resolves to the intelligence profile if found
   */
  readonly getProfile: (name: string) => Effect.Effect<IntelligenceType, IntelligenceConfigError>;
}
