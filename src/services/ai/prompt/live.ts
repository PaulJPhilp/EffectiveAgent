/**
 * @file Live implementation of the PromptApi service using LiquidJS
 * and the layer providing loaded PromptConfigData.
 */

import { Config, ConfigProvider, Effect, HashMap, Layer, Schema } from "effect";
import { Liquid } from "liquidjs";
import {
    PromptConfigError,
    RenderingError,
    TemplateNotFoundError
} from "./errors.js";
import {
    type PromptDefinition,
    PromptsConfigFileSchema
} from "./schema.js";
import {
    PromptApi,
    PromptConfig,
    type RenderStringParams,
    type RenderTemplateParams
} from "./types.js";

// --- PromptConfig Layer Definition ---

/**
 * Factory function to create the PromptConfig service implementation.
 */
const makePromptConfig = Effect.gen(function* () {
    // 1. Get ConfigProvider and load raw config
    const configProvider = yield* ConfigProvider.ConfigProvider;
    const rawConfig = yield* configProvider.load(Config.string("prompts")).pipe(
        Effect.mapError(cause => new PromptConfigError({
            message: "Failed to load prompt config",
            cause: cause instanceof Error ? cause : new Error(String(cause))
        }))
    );
    const parsedConfig = JSON.parse(rawConfig);

    // 2. Load and validate config using the schema directly
    const validConfig = yield* Schema.decode(PromptsConfigFileSchema)(parsedConfig).pipe(
        Effect.mapError(cause => new PromptConfigError({
            message: "Failed to validate prompt config",
            cause
        }))
    );

    // 3. Transform to HashMap
    const promptEntries = validConfig.prompts.map(
        (def): [string, PromptDefinition] => [def.name, def]
    );
    return HashMap.fromIterable(promptEntries);
});

/**
 * Live Layer for the PromptConfig service.
 */
export const PromptConfigLiveLayer = Layer.effect(
    PromptConfig,
    makePromptConfig
);

// --- PromptApi Implementation Factory ---

/**
 * Factory function for creating the PromptApi service implementation.
 */
export const makePromptApi = Effect.gen(function* () {
    const promptMap = yield* PromptConfig;
    const liquid = new Liquid();

    const renderString = (
        params: RenderStringParams,
    ): Effect.Effect<string, RenderingError> =>
        Effect.try({
            try: () =>
                liquid.parseAndRenderSync(
                    params.templateString,
                    params.context as Record<string, any>,
                ),
            catch: (error) =>
                new RenderingError({
                    message: "Failed to render Liquid template string",
                    cause: error instanceof Error ? error : new Error(String(error)),
                    templateSnippet: params.templateString.slice(0, 100),
                }),
        });

    const renderTemplate = (
        params: RenderTemplateParams,
    ): Effect.Effect<string, RenderingError | TemplateNotFoundError> =>
        HashMap.get(promptMap, params.templateName).pipe(
            Effect.mapError(() => new TemplateNotFoundError({ templateName: params.templateName })),
            Effect.flatMap((promptDefinition) =>
                renderString({
                    templateString: promptDefinition.template,
                    context: params.context,
                }),
            ),
            Effect.mapError((error: unknown) => {
                if (error instanceof TemplateNotFoundError) {
                    return error;
                }
                if (error instanceof RenderingError) {
                    return new RenderingError({
                        ...error,
                        templateName: params.templateName,
                    });
                }
                return new RenderingError({
                    message: `Unexpected error rendering template ${params.templateName}`,
                    cause: error instanceof Error ? error : new Error(String(error)),
                    templateName: params.templateName,
                });
            }),
        );

    return {
        renderTemplate,
        renderString,
    };
});

/**
 * Live Layer for the PromptApi service.
 */
export const PromptApiLiveLayer = Layer.effect(
    PromptApi,
    makePromptApi
);
