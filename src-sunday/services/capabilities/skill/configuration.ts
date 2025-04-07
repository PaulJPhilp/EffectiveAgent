/**
 * @file Loads and provides access to Skill definitions (e.g., from skills.json).
 * Defines the Layer for the SkillConfiguration service Tag.
 * NOTE: Effect.cached removed due to persistent type inference issues.
 */

import { FileSystem } from "@effect/platform/FileSystem"; // Import deps for R type
import { Path } from "@effect/platform/Path"; // Import deps for R type
import { Effect, Layer } from "effect";
import * as Record from "effect/Record"; // Use effect/Record utilities
import { ConfigLoaderApi, ConfigLoaderOptions } from "../../core/configuration/index.js"; // Import ConfigLoader
import { SkillConfigurationError, SkillNotFoundError } from "./errors.js"; // Import specific errors (assuming SkillConfigurationError exists)
import type { SkillDefinition, SkillsConfig } from "./schema.js"; // Import schema types
import { SkillsConfigSchema } from "./schema.js"; // Import schema for validation
import { SkillConfiguration } from "./types.js"; // Import the Tag/Interface for this service

// Define the expected filename for the skill configuration
const CONFIG_FILENAME = "skills.json";

// --- Implementation ---

// Define the structure of the processed config
type LoadedSkillsConfig = {
    skills: Readonly<Record<string, SkillDefinition>>;
    // defaultSkillName?: string; // If we add a default later
};

/**
 * Effect to load and validate the skill configuration.
 * NOTE: Caching removed. This runs on every call.
 * Requires ConfigLoaderApi and its transitive dependencies.
 */
const loadSkillsConfigEffect: Effect.Effect< // Renamed variable
    LoadedSkillsConfig,
    SkillConfigurationError, // Use specific error type
    ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions // Requirements
> = Effect.gen(function* () {
    const configLoader = yield* ConfigLoaderApi;
    // Load and validate using the schema defined in this module
    const loadedConfig = (yield* configLoader.loadConfig(CONFIG_FILENAME, {
        schema: SkillsConfigSchema,
    })) as SkillsConfig;

    // Convert skills array to a Readonly Record for efficient lookup by name
    const skillsRecord = Record.fromEntries(
        loadedConfig.skills.map((s) => [s.name, s])
    );

    // Return the processed configuration data
    return {
        skills: skillsRecord,
        // defaultSkillName: loadedConfig.defaultSkillName, // If default exists
    };
}).pipe(
    // Map ConfigLoader errors to SkillConfigurationError for context
    Effect.mapError(
        (cause) => new SkillConfigurationError({ // Assuming SkillConfigurationError exists in errors.ts
            message: `Failed to load or parse ${CONFIG_FILENAME}`,
            cause
        })
    )
    // REMOVED: .pipe(Effect.cached)
);


/** Live implementation of the SkillConfiguration service. */
class SkillConfigurationLive implements SkillConfiguration {
    // Helper Effect now points directly to the loading effect (no cache)
    private getConfig = (): Effect.Effect<LoadedSkillsConfig, SkillConfigurationError, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions> =>
        loadSkillsConfigEffect; // Use the non-cached effect

    // Implementation of getSkillDefinitionByName
    getSkillDefinitionByName = (
        name: string
    ): Effect.Effect<SkillDefinition, SkillConfigurationError, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions> =>
        this.getConfig().pipe(
            Effect.flatMap((config) => {
                const skillOption = Record.get(config.skills, name);
                // Use direct tag check pattern
                return skillOption._tag === "Some"
                    ? Effect.succeed(skillOption.value)
                    : Effect.fail(new SkillNotFoundError({ skillName: name })); // Use specific SkillNotFoundError
            })
        );

    // Implementation of listSkillDefinitions
    listSkillDefinitions = (): Effect.Effect<ReadonlyArray<SkillDefinition>, SkillConfigurationError, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions> =>
        this.getConfig().pipe(
            // Extract the values (SkillDefinition[]) from the record
            Effect.map((config) => Record.values(config.skills))
        );

}

// --- Layer Definition ---

/**
 * Live Layer for the SkillConfiguration service.
 * Requires ConfigLoaderApi AND its dependencies (FileSystem, Path, ConfigLoaderOptions).
 */
export const SkillConfigurationLiveLayer: Layer.Layer<SkillConfiguration, never, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions> =
    Layer.succeed(
        SkillConfiguration, // The Tag for this service
        new SkillConfigurationLive() // The implementation instance
    );

// --- Placeholder Error (if not defined in errors.ts yet) ---
// class SkillConfigurationError extends Error { constructor(o: {message: string, cause?: unknown}) { super(o.message); this.cause = o.cause; }}
// class SkillNotFoundError extends SkillConfigurationError { constructor(o: {skillName: string}) { super({message: `Skill ${o.skillName} not found`}); }}
