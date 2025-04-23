/**
 * @file Live implementation of the PromptApi service using LiquidJS
 * and the layer providing loaded PromptConfigData.
 */

import { Config, ConfigProvider, Effect, HashMap, Ref, Schema as S } from "effect";
import { Liquid } from "liquidjs";
import {
    PromptConfigError,
    RenderingError,
    TemplateNotFoundError
} from "../errors.js";
import {
    Prompt,
    PromptFile
} from "./schema.js";
import {
    type RenderStringParams,
    type RenderTemplateParams
} from "./types.js";

export class PromptService extends Effect.Service<PromptService>()("PromptService", {
    effect: Effect.gen(function* () {
        let promptRef: Ref.Ref<HashMap.HashMap<string, Prompt>>;
        const liquid = new Liquid();
        return {
            load: () => Effect.gen(function* () {
                const configProvider = yield* ConfigProvider.ConfigProvider;
                const rawConfig = yield* configProvider.load(Config.string("prompts")).pipe(
                    Effect.mapError(cause => new PromptConfigError("Failed to load prompt config", {
                        cause: cause instanceof Error ? cause : new Error(String(cause))
                    }))
                );
                const parsedConfig = Effect.try({
                    try: () => JSON.parse(rawConfig),
                    catch: (error) => new PromptConfigError("Failed to parse prompt config", {
                        cause: error instanceof Error ? error : new Error(String(error))
                    })
                });
                const data = yield* parsedConfig;
                const validConfig = yield* S.decode(PromptFile)(data).pipe(
                    Effect.mapError(cause => new PromptConfigError("Failed to validate prompt config", {
                        cause
                    }))
                );
                const promptEntries = validConfig.prompts.map(
                    (def): [string, Prompt] => [def.name, def]
                );
                promptRef = yield* Ref.make(HashMap.fromIterable(promptEntries));
                return validConfig;
            }),
            getPrompt: (name: string): Effect.Effect<Prompt, TemplateNotFoundError> =>
                promptRef.get.pipe(
                    Effect.flatMap((map) =>
                        HashMap.get(map, name).pipe(
                            Effect.mapError(() => new TemplateNotFoundError(name))
                        )
                    )
                ),
            renderString: (params: RenderStringParams): Effect.Effect<string, RenderingError> =>
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
                            templateSnippet: params.templateString.slice(0, 100)
                        })
                }),
            renderTemplate: (params: RenderTemplateParams): Effect.Effect<string, RenderingError | TemplateNotFoundError> =>
                promptRef.get.pipe(
                    Effect.flatMap((map) =>
                        HashMap.get(map, params.templateName).pipe(
                            Effect.mapError(() => new TemplateNotFoundError(params.templateName)),
                            Effect.flatMap((promptDefinition) =>
                                Effect.try({
                                    try: () =>
                                        liquid.parseAndRenderSync(
                                            promptDefinition.template,
                                            params.context as Record<string, any>,
                                        ),
                                    catch: (error) =>
                                        new RenderingError({
                                            message: "Failed to render Liquid template",
                                            cause: error instanceof Error ? error : new Error(String(error)),
                                            templateName: params.templateName,
                                            templateSnippet: promptDefinition.template.slice(0, 100)
                                        })
                                })
                            )
                        )
                    )
                )
        };
    })
}) { }
