/**
 * @file Implements the Intelligence service for managing AI intelligence configurations.
 * @module services/capabilities/intelligence/service
 */

import { ConfigurationService } from "@/services/core/configuration/service.js";
import { Effect } from "effect";
import type { IntelligenceServiceApi } from "./api.js";
import { IntelligenceConfigError } from "./errors.js";
import { IntelligenceFile, type IntelligenceType } from "./schema.js";

/**
 * Service implementation for managing intelligence configurations.
 */
export class IntelligenceService extends Effect.Service<IntelligenceServiceApi>()(
  "IntelligenceService",
  {
    effect: Effect.gen(function* () {
      // Get dependencies
      const configService = yield* ConfigurationService;

      // Prepare service methods
      const loadConfig = () =>
        Effect.gen(function* () {
          // 1. Load and validate the config object
          const config = yield* configService.loadConfig({ filePath: "intelligence", schema: IntelligenceFile }).pipe(
            Effect.mapError(error => new IntelligenceConfigError({
              description: "Failed to load intelligence configuration",
              module: "IntelligenceService",
              method: "load",
              cause: error
            }))
          );
          return config;
        });

      // Return the service implementation object
      return {
        // Load method implementation
        load: () => loadConfig(),

        // GetProfile method implementation
        getProfile: (name: string) =>
          Effect.gen(function* () {
            // First load the configuration
            const config = yield* loadConfig();

            // Find the profile by name
            const profile = config.intelligences.find((p: IntelligenceType) => p.name === name);

            // Return error if profile not found
            if (!profile) {
              return yield* Effect.fail(new IntelligenceConfigError({
                description: `Intelligence profile '${name}' not found`,
                module: "IntelligenceService",
                method: "getProfile"
              }));
            }

            // Return the found profile
            return profile;
          })
      };
    })
  }
) { }