/**
 * @file Defines the Persona Service API for managing persona configurations.
 */

import { Effect } from "effect";
import type { PersonaConfigError } from "./errors.js";
import type { PersonasFile } from "./schema.js";
import type { PersonaDefinition, PersonaDefinitionInput } from "./types.js";

/**
 * Service API for managing persona configurations.
 * Handles loading, validation, and updates of persona definitions.
 */
export interface PersonaServiceApi {
    /**
     * Loads and validates the persona configuration from the environment.
     * 
     * @returns An Effect that yields the validated PersonasFile configuration or fails with PersonaConfigError
     */
    readonly load: () => Effect.Effect<PersonasFile, PersonaConfigError>;

    /**
     * Validates raw persona definition data against the schema.
     * 
     * @param definition - The raw persona definition to validate
     * @returns An Effect that yields the validated PersonaDefinition or fails with PersonaConfigError
     */
    readonly make: (definition: unknown) => Effect.Effect<PersonaDefinition, PersonaConfigError>;

    /**
     * Updates an existing persona definition with partial changes.
     * 
     * @param currentData - The current validated persona definition
     * @param updates - Partial updates to apply to the definition
     * @returns An Effect that yields the updated and validated PersonaDefinition or fails with PersonaConfigError
     */
    readonly update: (
        currentData: PersonaDefinition,
        updates: Partial<PersonaDefinitionInput>
    ) => Effect.Effect<PersonaDefinition, PersonaConfigError>;
} 