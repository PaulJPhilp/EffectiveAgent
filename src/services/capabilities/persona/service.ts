/**
 * @file Implements the Persona service for managing persona configurations.
 * @module services/capabilities/persona/service
 */

import { ConfigurationService } from "@/services/core/configuration/service.js";
import { Effect, Ref, Schema as S } from "effect";
import { PersonaConfigError } from "./errors.js";
import { Persona, PersonasFile } from "./schema.js";

/**
 * Default implementation of the PersonaService.
 */
export class PersonaService extends Effect.Service<PersonaServiceApi>()("PersonaService", {
  effect: Effect.gen(function* () {
    // Configuration provider for loading persona config
    const personaRef = yield* Ref.make<PersonasFile | undefined>(undefined);

    return {
      load: () => Effect.gen(function* () {
        const configService = yield* ConfigurationService;

        // 1. Load raw config string
        const rawConfig = yield* configService.readConfig("personas").pipe(
          Effect.mapError(cause => new PersonaConfigError({
            description: "Failed to load persona configuration",
            module: "PersonaService",
            method: "load",
            cause
          }))
        );

        // 2. Parse JSON
        const parsedConfig = yield* Effect.try({
          try: () => JSON.parse(rawConfig as string),
          catch: (error) => new PersonaConfigError({
            description: "Failed to parse persona configuration JSON",
            module: "PersonaService",
            method: "load",
            cause: error
          })
        });

        // 3. Validate schema
        const validConfig = yield* Effect.mapError(
          S.decode(PersonasFile)(parsedConfig),
          (error) => new PersonaConfigError({
            description: "Failed to validate persona configuration",
            module: "PersonaService",
            method: "load",
            cause: error
          })
        );

        // 4. Store in ref and return
        yield* Ref.set(personaRef, validConfig);
        return validConfig;
      }),

      make: (definition: unknown) => Effect.mapError(
        S.decode(Persona)(definition),
        (error) => new PersonaConfigError({
          description: "Failed to validate persona definition",
          module: "PersonaService",
          method: "make",
          cause: error
        })
      ),

      update: (currentData: PersonaDefinition, updates: Partial<PersonaDefinitionInput>) =>
        Effect.gen(function* () {
          const merged = { ...currentData, ...updates };
          return yield* PersonaService.prototype.make(merged);
        })
    };
  }),
  dependencies: []
}) { }
