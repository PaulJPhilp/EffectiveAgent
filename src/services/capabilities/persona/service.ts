/**
 * @file Implements the Persona service for managing persona configurations.
 * @module services/capabilities/persona/service
 */

import { Config, ConfigProvider, Effect, Ref, Schema as S } from "effect";
import { PersonaConfigError } from "./errors.js";
import { PersonasFile } from "./schema.js";

export class PersonaService extends Effect.Service<PersonaService>()(
  "PersonaService",
  {
    effect: Effect.gen(function* () {
      // Configuration provider for loading persona config
      const config = yield* ConfigProvider.ConfigProvider;
      // Ref to store loaded configuration
      let personaRef: Ref.Ref<PersonasFile> | null = null;
      
      return {
        load: () => Effect.gen(function* () {
          // 1. Load raw config string
          const rawConfig = yield* config.load(Config.string("personas")).pipe(
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
          personaRef = yield* Ref.make<PersonasFile>(validConfig);
          return yield* Ref.get(personaRef);
        })
      };
    })
  }
) { }
