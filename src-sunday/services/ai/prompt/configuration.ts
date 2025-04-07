/**
 * @file Loads prompt definitions and provides the Layer for PromptConfiguration.
 * Uses the 'make + typeof make' pattern for type inference.
 */

import { Effect, Layer, Option, Context } from "effect";
import * as Record from "effect/Record";
import { ConfigLoaderApi, ConfigLoaderOptions } from "../../core/configuration/index.js";
import { FileSystem } from "@effect/platform/FileSystem";
import { Path } from "@effect/platform/Path";
import type { PromptDefinition, PromptsConfig } from "./schema.js";
import { PromptsConfigSchema } from "./schema.js";
import { PromptConfiguration } from "./types.js"; // Import only the Tag
import { PromptConfigurationError, TemplateNotFoundError } from "./errors.js";

const CONFIG_FILENAME = "prompts.json";

type LoadedPromptsConfig = {
    prompts: Readonly<Record<string, PromptDefinition>>;
};

const loadPromptsConfigEffect: Effect.Effect<
    LoadedPromptsConfig,
    PromptConfigurationError,
    ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions
> = Effect.gen(function* () {
    const configLoader = yield* ConfigLoaderApi;
    const loadedConfig = yield* configLoader.loadConfig<PromptsConfig>(CONFIG_FILENAME, {
        schema: PromptsConfigSchema,
    });
    const promptsRecord = Record.fromEntries(
        loadedConfig.prompts.map((p) => [p.name, p])
    );
    return { prompts: promptsRecord };
}).pipe(
    Effect.mapError(
        (cause) => new PromptConfigurationError({ message: `Failed to load or parse ${CONFIG_FILENAME}`, cause })
    )
    // Caching removed
);


// --- Implementation Object ('make') ---
const make = Effect.map(loadPromptsConfigEffect, (loadedConfig) => {
    // Return the object implementing the service methods
    return {
        // --- CORRECTED getPromptDefinitionByName ---
        getPromptDefinitionByName: (name: string): Effect.Effect<PromptDefinition, TemplateNotFoundError | PromptConfigurationError, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions> => {
            // Get the Option synchronously from the loaded config
            const promptOption = Record.get(loadedConfig.prompts, name);
            // Use synchronous Option.match to return the appropriate Effect
            return Option.match(promptOption, {
                onNone: () => Effect.fail(new TemplateNotFoundError({ templateName: name })),
                onSome: (definition) => Effect.succeed(definition) // Return Effect<PromptDefinition, never, never>
            });
            // The R requirement comes from loadPromptsConfigEffect implicitly via closure
        },
        // --- End Correction ---

        listPromptDefinitions: (): Effect.Effect<ReadonlyArray<PromptDefinition>, PromptConfigurationError, ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions> =>
            // Access loadedConfig via closure
            // Return type R is inferred correctly from loadPromptsConfigEffect
            Effect.succeed(Record.values(loadedConfig.prompts))

    }; // satisfies Context.Tag.Service<typeof PromptConfiguration>; // Optional 'satisfies' check
});

// --- Export Inferred Type and Live Layer ---

/** The inferred type of the PromptConfiguration service implementation. */
export type PromptConfigurationLive = Effect.Effect.Success<typeof make>;

/** Live Layer for the PromptConfiguration service. */
export const PromptConfigurationLiveLayer: Layer.Layer<
    Context.Tag.Service<typeof PromptConfiguration>, // Use inferred type via Tag
    PromptConfigurationError, // Error from 'make' effect (loading)
    ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions // Requirements from 'make' effect
> = Layer.effect(
    PromptConfiguration, // The Tag
    make // The Effect that builds the implementation object
);

