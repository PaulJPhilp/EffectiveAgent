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
        // Static instance for all service instances
        const liquid = new Liquid();

        // Initialize in constructor
        const promptRef = yield* Ref.make(HashMap.empty<string, Prompt>());

        return {
            load: () => Effect.gen(function* () {
                const configProvider = yield* ConfigProvider.ConfigProvider;
                const rawConfig = yield* configProvider.load(Config.string("prompts")).pipe(
                    Effect.mapError(cause => new PromptConfigError({
                        description: "Failed to read prompts.json",
                        module: "PromptService",
                        method: "load",
                        cause: cause instanceof Error ? cause : new Error(String(cause))
                    }))
                );

                const parsedConfig = yield* Effect.try(() => JSON.parse(rawConfig)).pipe(
                    Effect.mapError(error => new PromptConfigError({
                        description: "Invalid JSON in prompts.json",
                        module: "PromptService",
                        method: "load",
                        cause: error instanceof Error ? error : new Error(String(error))
                    }))
                );

                const validConfig = yield* S.decode(PromptFile)(parsedConfig).pipe(
                    Effect.mapError(cause => new PromptConfigError({
                        description: "Schema validation failed",
                        module: "PromptService",
                        method: "load",
                        cause
                    }))
                );

                const promptEntries = validConfig.prompts.map(
                    (def): [string, Prompt] => [def.name, def]
                );

                yield* Ref.set(promptRef, HashMap.fromIterable(promptEntries));
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
                Effect.try(() => {
                    if (!params.templateString?.trim()) {
                        throw new Error("Empty template string");
                    }
                    return liquid.parseAndRenderSync(
                        params.templateString,
                        params.context as Record<string, any>,
                    );
                }).pipe(
                    Effect.mapError(error => new RenderingError({
                        description: `Template rendering failed. Template snippet: ${params.templateString?.slice(0, 100)}`,
                        module: "PromptService",
                        method: "renderString",
                        cause: error instanceof Error ? error : new Error(String(error))
                    }))
                ),

            renderTemplate: (params: RenderTemplateParams): Effect.Effect<string, RenderingError | TemplateNotFoundError> =>
                promptRef.get.pipe(
                    Effect.flatMap((map) =>
                        HashMap.get(map, params.templateName).pipe(
                            Effect.mapError(() => new TemplateNotFoundError(params.templateName)),
                            Effect.flatMap((promptDefinition) =>
                                Effect.try(() => {
                                    if (!promptDefinition.template?.trim()) {
                                        throw new Error("Empty template");
                                    }
                                    return liquid.parseAndRenderSync(
                                        promptDefinition.template,
                                        params.context as Record<string, any>,
                                    );
                                }).pipe(
                                    Effect.mapError(error => new RenderingError({
                                        description: `Template '${params.templateName}' rendering failed. Template snippet: ${promptDefinition.template?.slice(0, 100)}`,
                                        module: "PromptService",
                                        method: "renderTemplate",
                                        cause: error instanceof Error ? error : new Error(String(error))
                                    }))
                                )
                            )
                        )
                    )
                )
        };
    })
}) { }