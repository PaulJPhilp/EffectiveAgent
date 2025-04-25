/**
 * @file Live implementation of the SkillApi service.
 * Step 1: Parameterizing the prompt string.
 */

import { HttpClient } from "@effect/platform";
import { FileSystem } from "@effect/platform/FileSystem";
import { Path } from "@effect/platform/Path";
import { Effect, Layer } from "effect";
import type { ConfigError } from "effect/ConfigError";
import { ConfigLoaderApi, ConfigLoaderOptions } from "../../core/configuration/index.js";
import { LoggingApi } from "../../core/logging/index.js";

// --- @effect/ai Imports ---
import { Completions } from "@effect/ai";
import { AnthropicCompletions } from "@effect/ai-anthropic";
import { OpenAiCompletions } from "@effect/ai-openai";
// --- End @effect/ai Imports ---

import { IntelligenceConfiguration, IntelligenceProfile } from "@/services/core/intelligence/index.js";
import { PersonaConfiguration } from "@/services/core/persona/index.js";
import { ProviderNameValues } from "@/services/schema.js";
import { AnthropicClient } from "@effect/ai-anthropic/AnthropicClient";
import { OpenAiClient } from "@effect/ai-openai/OpenAiClient";
import { AiModels } from "@effect/ai/AiModels";
import { SkillError, SkillExecutionError } from "./errors.js";
import type { SkillExecutionParams } from "./schema.js";
import { SkillApi, SkillConfiguration, type SkillInput, type SkillOutput } from "./types.js";

function getModelAndProvider(profile: IntelligenceProfile) {
    // Extract model from the first model preference
    const modelPref = profile.modelPreferences[0];
    const modelId = typeof modelPref === 'string' ? modelPref : profile.metadata?.["defaultModel"] as string || "gpt-4o";
    const modelIdParts = modelId.split(":");
    const providerName = modelIdParts.length > 1 ? modelIdParts[0] : ProviderNameValues.OpenAI; // Default if no prefix
    const modelName = modelIdParts.length > 1 ? modelIdParts[1] : modelIdParts[0];
    return { providerName, modelName };
}

function getModelFactory(providerName: string, modelName: string, mergedParams: Partial<SkillExecutionParams>) {
    switch (providerName) {
        case ProviderNameValues.OpenAI:
            return OpenAiCompletions.model(modelName, mergedParams);
        case ProviderNameValues.Anthropic:
            return AnthropicCompletions.model(modelName, mergedParams);
        default:
            throw new Error(`Unsupported provider: ${providerName}`);
    }
}

function applyIntelligenceConstraints(
    params: Partial<SkillExecutionParams>,
    constraints?: IntelligenceProfile["parameterConstraints"] // Use the type from IntelligenceProfile
): Partial<SkillExecutionParams> {
    const constrainedParams = { ...params }; // Copy params

    if (constraints) {
        // Apply temperature constraints
        if (constraints.minTemperature !== undefined && (constrainedParams.temperature ?? -Infinity) < constraints.minTemperature) {
            constrainedParams.temperature = constraints.minTemperature;
        }
        if (constraints.maxTemperature !== undefined && (constrainedParams.temperature ?? +Infinity) > constraints.maxTemperature) {
            constrainedParams.temperature = constraints.maxTemperature;
        }
        // TODO: Add logic for other constraints (e.g., maxTokens, allowed values for other params)
    }
    return constrainedParams;
}

// In main.ts or a helper file
function mergeSkillAndOverrideParams(
    skillDefParams?: Partial<SkillExecutionParams>,
    overrideParams?: Partial<SkillExecutionParams>
): Partial<SkillExecutionParams> {
    return {
        ...(skillDefParams || {}),
        ...(overrideParams || {})
    };
}

// --- Live Implementation ---

class SkillApiLive implements SkillApi {

    // Helper to map errors
    private mapAiError = (cause: unknown, skillName: string): SkillExecutionError => {
        const message = cause instanceof Error ? cause.message : "Unknown AI execution error";
        return new SkillExecutionError({ skillName, message, cause });
    };

    // --- invokeSkill Method (Parameterizing Prompt) ---
    invokeSkill = (params: {
        skillName: string;
        input: SkillInput; // Input should contain the prompt text for this step
        overrideParams?: Partial<SkillExecutionParams>; // Ignored for now
    }): Effect.Effect<
        SkillOutput, // Expecting string | JsonObject, returning string here
        SkillError | ConfigError,
        // Update to include all services needed by the implementation
        LoggingApi | HttpClient.HttpClient | IntelligenceConfiguration |
        SkillConfiguration | PersonaConfiguration |
        FileSystem | Path | ConfigLoaderApi | ConfigLoaderOptions |
        OpenAiClient | AnthropicClient | AiModels
    > => {

        // Implement the logic to merge parameters(skillDef.defaultParams, intelligenceProfile.parameterConstraints, params.overrideParams).
        // This should be a new function that takes the skill definition, intelligence profile, and override parameters, and returns a new object with the merged parameters.
        // The merged parameters should be used to generate the prompt for the AI model. 


        const skillEffect = Effect.gen(function* () {
            const intelligenceConfig = yield* IntelligenceConfiguration;
            const skillConfig = yield* SkillConfiguration.pipe(
                Effect.flatMap(service => service.getSkillDefinitionByName(params.skillName))
            );
            const personaConfig = yield* PersonaConfiguration.pipe(
                Effect.flatMap(service => skillConfig.personaName ?
                    service.getPersonaByName(skillConfig.personaName) :
                    Effect.succeed(undefined)) // Assuming persona can be undefined
            );
            // First get the intelligence profile
            const model = yield* intelligenceConfig.getIntelligenceProfileByName(skillConfig.intelligenceName);
            const initialParams = mergeSkillAndOverrideParams(
                skillConfig.defaultParams,
                params.overrideParams
            );

            // 2. Apply constraints from the Intelligence profile
            const finalParams = applyIntelligenceConstraints(
                initialParams,
                model.parameterConstraints // model is the IntelligenceProfile
            );
            // Prepare the config object for the model factory using verified names
            // Filter out undefined values before passing to the factory
            const modelConfig = Object.fromEntries(
                Object.entries({
                    temperature: finalParams.temperature,
                    max_tokens: finalParams.maxTokens, // Use max_tokens if that's what the factory expects
                    top_p: finalParams.topP,           // Use top_p
                    top_k: finalParams.topK,           // Use top_k
                    stop_sequences: finalParams.stopSequences, // Use stop_sequences
                    // Add presence/frequency penalty if supported/needed
                }).filter(([, value]) => value !== undefined)
            );

            const { providerName, modelName } = getModelAndProvider(model);
            const modelFactory = getModelFactory(providerName, modelName, modelConfig);
            const prompt = skillConfig.systemPrompt || skillConfig.promptTemplate || `Default prompt for ${params.skillName}`;

            // Define the AiModel factory
            const modelProvider = yield* modelFactory;

            const effectToRun = generateCompletionEffect(prompt);
            // Log parameters and then call the provider directly
            const log = yield* LoggingApi;
            yield* log.debug("Invoking model", {
                skillName: params.skillName,
                modelName: modelName,
                providerName: providerName,
                parameters: modelConfig
            });

            // Apply the provider to the effect
            const responseText = yield* modelProvider.provide(effectToRun);
            return responseText; // Return the final string
        });

        // 1. Define the core logic requiring Completions.Completions
        //    This effect now takes the prompt as an argument.
        const generateCompletionEffect = (prompt: string) => Effect.gen(function* () {
            const log = yield* LoggingApi;
            const completions = yield* Completions.Completions;

            // const options = { temperature: 0.7 }; // Options if needed by .create()

            yield* log.debug("Calling Completions.create", { prompt });
            const response = yield* completions.create(prompt);

            // Assuming response has .text property
            const responseText = response.text ?? `No response for prompt: ${prompt}`;
            yield* log.debug("Completions successful", { responseText });
            return responseText; // Return the string result
        });

        // Return the skill effect instead of the main effect
        //    and mapping errors.
        return skillEffect.pipe(
            // Ensure correct return type
            Effect.map((result): SkillOutput => result as string),
            // Handle errors properly to return SkillError | ConfigError type
            Effect.mapError((error: unknown): SkillError | ConfigError => {
                // Check if it's already a SkillError or ConfigError
                if (error instanceof SkillExecutionError) return error;

                // Let ConfigError pass through
                if (error && typeof error === 'object' && '_tag' in error &&
                    typeof error._tag === 'string' &&
                    ['SourceUnavailable', 'MissingData', 'InvalidData'].includes(error._tag as string)) {
                    return error as ConfigError;
                }

                // Convert all other errors to SkillExecutionError
                return new SkillExecutionError({
                    skillName: params.skillName,
                    message: error instanceof Error ? error.message : "AI execution error",
                    cause: error
                });
            }),
            // Add logging taps (require LoggingApi)
            Effect.tapError((e: SkillError | ConfigError) => LoggingApi.pipe(Effect.flatMap(log =>
                log.error(`Error in invokeSkill ${params.skillName}`, {
                    message: e instanceof Error ? e.message : "Unknown error",
                    tag: e && typeof e === 'object' && '_tag' in e ? e._tag : undefined
                })
            ))),
            Effect.provideServiceEffect(LoggingApi, LoggingApi) // Provide Logging for taps
        );

    }; // End invokeSkill


} // End SkillApiLive Class


// --- Layer Definition ---
export const SkillApiLiveLayer: Layer.Layer<SkillApi> = Layer.succeed(
    SkillApi,
    new SkillApiLive()
);

// NOTE: Final App Layer Composition Needs:
// - SkillApiLiveLayer
// - LoggingApiLiveLayer
// - HttpClient Layer
// - OpenAI.layer (or other provider layers)
// - Config service

// - Config service
