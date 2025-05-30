/**
 * @file Implements the Persona service for managing persona configurations.
 * @module services/capabilities/persona/service
 */

import { AgentRuntimeService, makeAgentRuntimeId } from "@/agent-runtime/index.js";
import { Effect, Option, Ref, Schema as S } from "effect";
import type { PersonaServiceApi } from "./api.js";
import { PersonaConfigError } from "./errors.js";
import { Persona, PersonasFile } from "./schema.js";
import type { PersonaDefinition, PersonaDefinitionInput } from "./types.js";

/**
 * Persona service agent state
 */
export interface PersonaAgentState {
  readonly loadCount: number
  readonly lastLoad: Option.Option<number>
  readonly personas: ReadonlyArray<PersonaDefinition>
}

/**
 * Default implementation of the PersonaService with AgentRuntime integration.
 */
export class PersonaService extends Effect.Service<PersonaServiceApi>()("PersonaService", {
  effect: Effect.gen(function* () {
    const agentRuntimeService = yield* AgentRuntimeService;
    const agentId = makeAgentRuntimeId("persona-service-agent");

    const initialState: PersonaAgentState = {
      loadCount: 0,
      lastLoad: Option.none(),
      personas: []
    };

    // Create internal state and agent runtime
    const internalStateRef = yield* Ref.make<PersonaAgentState>(initialState);
    const runtime = yield* agentRuntimeService.create(agentId, initialState);

    yield* Effect.log("PersonaService agent initialized");

    const service: PersonaServiceApi = {
      load: () => Effect.gen(function* () {
        // Get personas from AgentRuntime state
        const runtimeState = yield* runtime.getState();

        // Load personas from the agent runtime configuration
        const personas = runtimeState.state.personas || [];

        // Update internal state to track load
        const currentState = yield* Ref.get(internalStateRef);
        const newState: PersonaAgentState = {
          ...currentState,
          loadCount: currentState.loadCount + 1,
          lastLoad: Option.some(Date.now()),
          personas
        };
        yield* Ref.set(internalStateRef, newState);

        const personasFile: PersonasFile = {
          name: "agent-personas",
          version: "1.0.0",
          personas
        };

        yield* Effect.log("PersonaService: loaded personas from agent runtime", {
          personaCount: personas.length
        });

        return personasFile;
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
          return yield* service.make(merged);
        })
    };

    return service;
  }),
  dependencies: [AgentRuntimeService.Default]
}) { }
