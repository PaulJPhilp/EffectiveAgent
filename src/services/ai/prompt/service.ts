/**
 * @file Live implementation of the PromptApi service using LiquidJS
 * and the layer providing loaded PromptConfigData.
 */

import { ConfigurationService } from "@/services/core/configuration/service.js";
import { Config, ConfigProvider, Effect, HashMap, Ref } from "effect";
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

const PROMPTS_CONFIG_PATH_KEY = "PROMPT_SERVICE_PROMPT_FILE_PATH";

export class PromptService extends Effect.Service<PromptService>()("PromptService", {
    effect: Effect.gen(function* () {
        const liquid = new Liquid();
        const promptRef = yield* Ref.make(HashMap.empty<string, Prompt>());
        const configService = yield* ConfigurationService;
        const configProvider = yield* ConfigProvider.ConfigProvider;

        const promptFilePath = yield* configProvider.load(Config.string(PROMPTS_CONFIG_PATH_KEY)).pipe(
            Effect.mapError(cause => new PromptConfigError({
                description: `Failed to load prompt file path from config key: '${PROMPTS_CONFIG_PATH_KEY}'`,
                module: "PromptService",
                method: "constructor", // Or a dedicated init phase
                cause
            }))
        );

        return {
            load: () => Effect.gen(function* () {
                const loadedConfig = yield* configService.loadConfig(
                    promptFilePath,
                    PromptFile
                ).pipe(
                    Effect.mapError(cause => new PromptConfigError({
                        description: `Failed to load or validate prompts file from path: ${promptFilePath}`,
                        module: "PromptService",
                        method: "load",
                        cause // This will be ConfigReadError, ConfigParseError, or ConfigValidationError
                    }))
                );
                // Explicitly cast/assert type if necessary, or ensure loadConfig returns typed data
                const validConfig = loadedConfig as PromptFile;

                const promptEntries = validConfig.prompts.map(
                    (def: Prompt): [string, Prompt] => [def.name, def]
                );

                yield* Ref.set(promptRef, HashMap.fromIterable(promptEntries));
                return validConfig;
            }),

            getPrompt: (name: string): Effect.Effect<Prompt, TemplateNotFoundError> =>
                promptRef.get.pipe(
                    Effect.flatMap((map) =>
                        HashMap.get(map, name).pipe(
                            Effect.mapError(() => new TemplateNotFoundError({
                                description: `Template '${name}' not found`,
                                templateName: name,
                                module: "PromptService",
                                method: "getPrompt"
                            }))
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
                            Effect.mapError(() => new TemplateNotFoundError({
                                description: `Template '${params.templateName}' not found`,
                                templateName: params.templateName,
                                module: "PromptService",
                                method: "renderTemplate"
                            })),
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