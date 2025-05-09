/**
 * @file Implements the Intelligence service for managing AI intelligence configurations.
 * @module services/capabilities/intelligence/service
 */

import { Config, ConfigProvider, Effect, Layer, Schema as S } from "effect";
import type { ImportedType } from "./api.js";
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
      const configProvider = yield* ConfigProvider.ConfigProvider;
      
      // Prepare service methods
      const loadConfig = () =>
        Effect.gen(function* () {
          // 1. Load the raw config string
          const rawConfig = yield* configProvider.load(Config.string("intelligence")).pipe(
            Effect.mapError(error => new IntelligenceConfigError({
              description: "Failed to load intelligence configuration",
              module: "IntelligenceService",
              method: "load",
              cause: error
            }))
          );
          
          // 2. Parse JSON
          const parsedConfig = yield* Effect.try({
            try: () => JSON.parse(rawConfig as string),
            catch: error => new IntelligenceConfigError({
              description: "Failed to parse intelligence configuration JSON",
              module: "IntelligenceService",
              method: "load",
              cause: error
            })
          });
          
          // 3. Validate schema
          return yield* S.decode(IntelligenceFile)(parsedConfig).pipe(
            Effect.mapError(error => new IntelligenceConfigError({
              description: "Failed to validate intelligence configuration",
              module: "IntelligenceService",
              method: "load",
              cause: error
            }))
          );
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