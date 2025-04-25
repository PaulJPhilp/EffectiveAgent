/**
 * @file Defines interfaces, Tags, and types for the PersonaConfiguration service.
 */

import type { FileSystem } from "@effect/platform/FileSystem";
import type { Path } from "@effect/platform/Path";
import { Context, Effect, Layer } from "effect";
import type { ConfigError } from "effect/ConfigError";
import type { Id, JsonObject } from "../../types.js"; // Adjust path if needed
// Import dependencies needed for R type
import type { ConfigLoaderApi, ConfigLoaderOptions } from "../configuration/types.js";
import type { PersonaConfigurationError } from "./errors.js"; // Import specific errors
import type {  Persona } from "./schema.js"; // Import schema type

// --- Service Interfaces & Tags ---

/** Service interface for accessing loaded Persona definitions. */
export interface PersonaConfiguration {
  /** Retrieves a specific Persona definition by its unique name. */
  readonly getPersonaByName: (
    name: string
  ) => Effect.Effect<Persona, PersonaConfigurationError, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions>; // Requires ConfigLoader + deps

  /** Retrieves all loaded Persona definitions. */
  readonly listPersonas: () => Effect.Effect<ReadonlyArray<Persona>, PersonaConfigurationError, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions>; // Requires ConfigLoader + deps

  // Optional: Method to get a default persona name if defined in config?
  // readonly getDefaultPersonaName: () => Effect.Effect<string | undefined, PersonaConfigurationError, ConfigLoaderApi | ...>;
}
/** Tag for the PersonaConfiguration service. */
export const PersonaConfiguration = Context.GenericTag<PersonaConfiguration>(
  "PersonaConfiguration"
);

export { Persona };

// NOTE: There is no "PersonaApi" service. Personality is a configuration entity
// used by other services (like SkillApi or ThreadApi) to assemble prompts.
// This service only provides access to the definitions.
