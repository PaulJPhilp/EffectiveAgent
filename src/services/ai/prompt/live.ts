/**
 * @file Live implementation of the PromptApi service using LiquidJS
 * and the layer providing loaded PromptConfigData.
 */

import type { JsonObject } from "@/types.js";
import { Schema } from "@effect/schema"; // Import Schema for decodeUnknown
import {
    PromptConfigError,
    PromptError,
    RenderingError,
    TemplateNotFoundError,
} from "@services/ai/prompt/errors.js"; // Correct path alias
// Import the simple Struct schema
import {
    type PromptDefinition,
    type PromptsConfigFile,
    PromptsConfigFileSchema,
} from "@services/ai/prompt/schema.js"; // Correct path alias
import {
    PromptApi, // Import API Tag
    PromptConfig, // Import Config Data Tag
    type PromptConfigData, // Import Config Data Type
    RenderStringParams,
    RenderTemplateParams,
} from "@services/ai/prompt/types.js"; // Correct path alias
// Import the correct EntityLoaderApi Tag and Type
import {
    type EntityLoaderApi,
    EntityLoaderApiTag,
} from "@services/core/loader/types.js";
import { Effect, HashMap, Layer } from "effect";
import { Liquid } from "liquidjs";
import type { LiquidOptions } from "liquidjs";

// --- PromptConfig Layer Definition ---

// Note: Filename is now passed as argument to the factory function below

/**
 * Factory function to create the PromptConfig loading Effect.
 * Takes the filename as an argument.
 * Requires EntityLoaderApi.
 */
const makePromptConfigDataEffect = (configFilename: string) => Effect.gen(function* () {
    // Yield the loader service correctly using the Tag
    const loader = yield* EntityLoaderApiTag;

    // 1. Load raw data using loadRawEntity
    const rawData = yield* loader
        .loadRawEntity(configFilename, { skipValidation: true }) // Use loadRawEntity
        .pipe(
            // Map EntityLoader's Load/Parse errors to PromptConfigError
            Effect.mapError(
                (cause) =>
                    new PromptConfigError({
                        message: `Failed to load or parse ${configFilename}`,
                        cause,
                    }),
            ),
        );

    // 2. Validate raw data against the simple Struct schema
    const configFile = yield* Schema.decodeUnknown(PromptsConfigFileSchema)(rawData)
        .pipe(
            // Map Schema's ParseError (validation error) to PromptConfigError
            Effect.mapError(
                (cause) =>
                    new PromptConfigError({
                        message: `Schema validation failed for ${configFilename}`,
                        cause, // Include ParseError as cause
                    }),
            ),
        );
    // configFile is now correctly typed as PromptsConfigFile

    // 3. Transform array into HashMap
    const promptMap = HashMap.make(
        ...configFile.prompts.map(
            (def): [string, PromptDefinition] => [def.name, def],
        ),
    );
    return promptMap; // Return the HashMap (PromptConfigData)
});


/**
 * Live Layer factory for the PromptConfig service data.
 * Loads prompt definitions from a specified JSON file using EntityLoaderApi
 * and provides them as a HashMap<string, PromptDefinition>.
 *
 * @param configFilename The path to the prompts configuration file.
 */
export const PromptConfigLiveLayer = (configFilename: string): Layer.Layer<
    PromptConfigData,
    PromptConfigError, // Error type from this layer
    EntityLoaderApi // Requires EntityLoaderApi
> => Layer.effect(
    PromptConfig, // Provides data via PromptConfig Tag
    makePromptConfigDataEffect(configFilename) // Pass filename to effect factory
);


// --- PromptApi Implementation Factory ---

/**
 * Factory function (synchronous) for creating the PromptApi service implementation.
 * Requires the PromptConfigData (HashMap) to be provided via the PromptConfig Tag.
 */
export const make = (
    promptMap: PromptConfigData // Inject the HashMap directly
) => {
    // Create a LiquidJS engine instance
    // TODO: Allow configuration/injection of LiquidOptions if needed
    const liquid = new Liquid();

    // --- Service Methods ---

    const renderString = (
        params: RenderStringParams,
    ): Effect.Effect<string, RenderingError> => // R = never
        Effect.try({
            try: () =>
                liquid.parseAndRenderSync(
                    params.templateString,
                    params.context as Record<string, any>,
                ),
            catch: (error) =>
                new RenderingError({
                    message: "Failed to render Liquid template string",
                    cause: error,
                    templateSnippet: params.templateString.slice(0, 100),
                }),
        });

    const renderTemplate = (
        params: RenderTemplateParams,
    ): Effect.Effect<string, RenderingError | TemplateNotFoundError> => // R = never
        // 1. Get the prompt definition from the injected HashMap
        HashMap.get(promptMap, params.templateName).pipe(
            Effect.mapError(() => new TemplateNotFoundError({ templateName: params.templateName })),
            // 2. If found, render its template string using renderString logic
            Effect.flatMap((promptDefinition) =>
                renderString({
                    templateString: promptDefinition.template,
                    context: params.context,
                }),
            ),
            // 3. Map renderString errors to include templateName context
            Effect.mapError((error) => {
                // Pass through TemplateNotFoundError
                if (error instanceof TemplateNotFoundError) {
                    return error;
                }
                // Add templateName context to RenderingError
                if (error instanceof RenderingError) {
                    return new RenderingError({
                        ...error, // Spread existing error properties
                        templateName: params.templateName, // Add templateName
                    });
                }
                // Should not happen, but wrap unexpected errors
                return new RenderingError({
                    message: `Unexpected error rendering template ${params.templateName}`,
                    cause: error,
                    templateName: params.templateName,
                });
            }),
        );

    // Return the service implementation object
    return {
        renderTemplate,
        renderString,
    };
};

// Derive PromptApi type from synchronous make function
// This type alias is local to this file if needed, but types.ts already exports it.
// type PromptApiImpl = ReturnType<typeof make>;

/**
 * Live Layer for the PromptApi service.
 * Provides the prompt rendering implementation.
 * Requires the PromptConfig service (providing the HashMap).
 */
export const PromptApiLiveLayer: Layer.Layer<
    ReturnType<typeof make>, // Use derived type directly
    never, // No errors during layer construction itself
    PromptConfigData // Requires PromptConfigData (the HashMap)
> = Layer.effect(
    PromptApi, // Use the Tag from types.ts
    // Get the HashMap from the context and pass it to the synchronous make function
    Effect.map(PromptConfig, (promptMap) => make(promptMap))
);
