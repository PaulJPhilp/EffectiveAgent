/**
 * @file Loads and provides access to Persona definitions (e.g., from personas.json).
 * Defines the Layer for the PersonaConfiguration service Tag.
 * NOTE: Effect.cached removed due to persistent type inference issues.
 */

import { Effect, Layer, Option, Context } from "effect";
import * as Record from "effect/Record"; // Use effect/Record utilities
import { ConfigLoaderApi, ConfigLoaderOptions } from "../configuration/index.js"; // Import ConfigLoader
import { FileSystem } from "@effect/platform/FileSystem"; // Import deps for R type
import { Path } from "@effect/platform/Path"; // Import deps for R type
import type { Persona, PersonasConfig } from "./schema.js"; // Import schema types
import { PersonasConfigSchema } from "./schema.js"; // Import schema for validation
import { PersonaConfiguration } from "./types.js"; // Import the Tag/Interface for this service
import { PersonaConfigurationError, PersonaNotFoundError } from "./errors.js"; // Import specific errors

// Define the expected filename for the persona configuration
const CONFIG_FILENAME = "personas.json";

// --- Implementation ---

// Define the structure of the processed config
type LoadedPersonasConfig = {
    personas: Readonly<Record<string, Persona>>;
    // defaultPersonaName?: string; // If we add a default later
};

/**
 * Effect to load and validate the persona configuration.
 * NOTE: Caching removed. This runs on every call.
 * Requires ConfigLoaderApi and its transitive dependencies.
 */
const loadPersonasConfigEffect: Effect.Effect< // Renamed variable
    LoadedPersonasConfig,
    PersonaConfigurationError, // Use specific error type
    ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions // Requirements
> = Effect.gen(function* () {
    const configLoader = yield* ConfigLoaderApi;
    // Load and validate using the schema defined in this module
    const loadedConfig = (yield* configLoader.loadConfig(CONFIG_FILENAME, {
        schema: PersonasConfigSchema,
    })) as PersonasConfig;

    // Convert personas array to a Readonly Record for efficient lookup by name
    const personasRecord = Record.fromEntries(
        loadedConfig.personas.map((p) => [p.name, p])
    );

    // Return the processed configuration data
    return {
        personas: personasRecord,
        // defaultPersonaName: loadedConfig.defaultPersonaName, // If default exists
    };
}).pipe(
    // Map ConfigLoader errors to PersonaConfigurationError for context
    Effect.mapError(
        (cause) => new PersonaConfigurationError({ message: `Failed to load or parse ${CONFIG_FILENAME}`, cause })
    )
    // REMOVED: .pipe(Effect.cached)
);


/** Live implementation of the PersonaConfiguration service. */
class PersonaConfigurationLive implements PersonaConfiguration {
    // Helper Effect now points directly to the loading effect (no cache)
    private getConfig = (): Effect.Effect<LoadedPersonasConfig, PersonaConfigurationError, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions> =>
        loadPersonasConfigEffect; // Use the non-cached effect

    // Implementation of getPersonaByName
    getPersonaByName = (
        name: string
    ): Effect.Effect<Persona, PersonaConfigurationError, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions> =>
        this.getConfig().pipe(
            Effect.flatMap((config) => {
                const personaOption = Record.get(config.personas, name);
                // Use direct tag check pattern which worked before
                return personaOption._tag === "Some"
                    ? Effect.succeed(personaOption.value)
                    : Effect.fail(new PersonaNotFoundError({ personaName: name }));
            })
        );

    // Implementation of listPersonas
    listPersonas = (): Effect.Effect<ReadonlyArray<Persona>, PersonaConfigurationError, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions> =>
        this.getConfig().pipe(
            // Extract the values (Persona[]) from the record
            Effect.map((config) => Record.values(config.personas))
        );

    // Optional: Implement getDefaultPersonaName if added to schema/interface
}

// --- Layer Definition ---

/**
 * Live Layer for the PersonaConfiguration service.
 * Requires ConfigLoaderApi AND its dependencies (FileSystem, Path, ConfigLoaderOptions).
 */
export const PersonaConfigurationLiveLayer: Layer.Layer<PersonaConfiguration, never, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions> =
    Layer.succeed(
        PersonaConfiguration, // The Tag for this service
        new PersonaConfigurationLive() // The implementation instance
    );
