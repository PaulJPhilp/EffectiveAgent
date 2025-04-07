/**
 * @file Live implementation of the PromptApi service using LiquidJS.
 */

import { Effect, Layer, Context, Option } from "effect";
import { Liquid } from "liquidjs"; // Import the LiquidJS engine
import type { LiquidOptions } from "liquidjs"; // Import options type if needed
import type { JsonObject } from "../../types.js"; // Adjust path if needed
import { PromptApi, PromptConfiguration } from "./types.js"; // Import Tag/Interface
import { PromptError, RenderingError, TemplateNotFoundError, PromptConfigurationError } from "./errors.js"; // Import errors
// Import dependencies needed by renderTemplate's R type
import type { ConfigLoaderApi, ConfigLoaderOptions } from "../../core/configuration/types.js";
import type { FileSystem } from "@effect/platform/FileSystem";
import type { Path } from "@effect/platform/Path";

// --- Live Implementation ---

export class PromptApiLive implements PromptApi {
    // Create a LiquidJS engine instance when the service is instantiated
    private liquid: Liquid;

    constructor(
        // Optionally inject Liquid options via Layer context if needed later
        liquidOptions?: LiquidOptions
    ) {
        this.liquid = new Liquid(liquidOptions);
        // TODO: Consider adding custom Liquid filters/tags if needed
    }

    // Implementation for rendering a provided string
    renderString = (params: {
        templateString: string;
        context: JsonObject;
    }): Effect.Effect<string, RenderingError> => { // E = RenderingError, R = never
        return Effect.try({
            try: () => this.liquid.parseAndRenderSync(
                params.templateString,
                params.context as Record<string, any> // Cast context for LiquidJS
            ),
            // Catch synchronous errors from LiquidJS (parsing or rendering)
            catch: (error) => new RenderingError({
                message: "Failed to render Liquid template string",
                cause: error,
                context: { templateSnippet: params.templateString.slice(0, 100) } // Include snippet for debugging
            })
        });
    };

    // Implementation for rendering a named template
    renderTemplate = (params: {
        templateName: string;
        context: JsonObject;
        // Requires PromptConfiguration service (and its deps) in context
    }): Effect.Effect<
        string, // A = string
        RenderingError | TemplateNotFoundError | PromptConfigurationError, // E = Possible errors
        PromptConfiguration | ConfigLoaderApi | FileSystem | Path | ConfigLoaderOptions // R = Requirements
    > => {
        // Start pipeline by getting the PromptConfiguration service
        return PromptConfiguration.pipe(
            // Get the PromptDefinition by name
            Effect.flatMap(configService => configService.getPromptDefinitionByName(params.templateName)),
            // If successful (found definition), attempt to render its template string
            Effect.flatMap(promptDefinition =>
                Effect.try({
                    try: () => this.liquid.parseAndRenderSync(
                        promptDefinition.template, // Use template string from definition
                        params.context as Record<string, any> // Cast context
                    ),
                    // Catch rendering errors
                    catch: (error) => new RenderingError({
                        message: `Failed to render Liquid template named '${params.templateName}'`,
                        cause: error,
                        context: { templateName: params.templateName }
                    })
                })
            )
            // The error channel E correctly includes TemplateNotFoundError/PromptConfigurationError (from getPromptDefinitionByName)
            // and RenderingError (from the Effect.try catch).
            // The requirement channel R correctly includes PromptConfiguration and its dependencies.
        );
    };
}

// --- Layer Definition ---

/**
 * Live Layer for the PromptApi service.
 * This layer has no requirements itself, but the renderTemplate method
 * requires the PromptConfiguration service (and its dependencies) to be provided separately.
 */
export const PromptApiLiveLayer: Layer.Layer<PromptApi> = Layer.succeed(
    PromptApi, // The Tag
    new PromptApiLive() // The implementation instance
);

// NOTE: To use renderTemplate, the final application layer must provide BOTH
// PromptApiLiveLayer AND PromptConfigurationLiveLayer (and its dependencies).
// Example:
// const PromptServiceLayer = Layer.provide(
//   PromptApiLiveLayer,
//   PromptConfigurationLiveLayer // Assuming this layer exists and provides PromptConfiguration
// );
