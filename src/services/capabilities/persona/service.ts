/**
 * @file Implements the Persona service for managing persona configurations.
 * @module services/capabilities/persona/service
 */

import { Effect, Option, Ref, Schema as S } from "effect";
import type { PersonaServiceApi } from "./api.js";
import { PersonaConfigError } from "./errors.js";
import { Persona, PersonasFile } from "./schema.js";
import type { PersonaDefinition, PersonaDefinitionInput } from "./types.js";

/**
 * Persona service internal state
 */
export interface PersonaServiceState {
  readonly loadCount: number;
  readonly lastLoad: Option.Option<number>;
  readonly personas: ReadonlyArray<PersonaDefinition>;
}

/**
 * Default implementation of the PersonaService.
 */
export class PersonaService extends Effect.Service<PersonaServiceApi>()(
  "PersonaService",
  {
    effect: Effect.gen(function* () {
      const initialState: PersonaServiceState = {
        loadCount: 0,
        lastLoad: Option.none(),
        personas: [],
      };

      // Create internal state
      const stateRef = yield* Ref.make<PersonaServiceState>(initialState);

      yield* Effect.log("PersonaService initialized");

      const service: PersonaServiceApi = {
        load: () =>
          Effect.gen(function* () {
            // For now, return empty personas array since we don't have external configuration loading
            const personas: ReadonlyArray<PersonaDefinition> = [];

            // Update internal state to track load
            const currentState = yield* Ref.get(stateRef);
            const newState: PersonaServiceState = {
              ...currentState,
              loadCount: currentState.loadCount + 1,
              lastLoad: Option.some(Date.now()),
              personas,
            };
            yield* Ref.set(stateRef, newState);

            const personasFile: PersonasFile = {
              name: "agent-personas",
              version: "1.0.0",
              personas,
            };

            yield* Effect.log("PersonaService: loaded personas", {
              personaCount: personas.length,
            });

            return personasFile;
          }),

        make: (definition: unknown) =>
          Effect.mapError(
            S.decode(Persona)(definition as any),
            (error) =>
              new PersonaConfigError({
                description: "Failed to validate persona definition",
                module: "PersonaService",
                method: "make",
                cause: error,
              })
          ),

        update: (
          currentData: PersonaDefinition,
          updates: Partial<PersonaDefinitionInput>
        ) =>
          Effect.gen(function* () {
            const merged = { ...currentData, ...updates };
            return yield* service.make(merged);
          }),
      };

      return service;
    }),
  }
) {}
