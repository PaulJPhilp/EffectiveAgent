/**
 * @file Implements the live Layers for SkillService and SkillApi.
 * @module services/capabilities/skill/live
 */

import { Effect, Layer, Schema, Context, Data, Option } from "effect";
import type { ParseError } from "effect/ParseResult";
import { makeCapabilityMake, makeCapabilityUpdate } from "@/services/capabilities/helpers.js";
import {
    SkillDefinitionSchema,
    type SkillDefinition,
    type SkillDefinitionInput,
    type SkillExecutionParams,
} from "./schema.js";
import {
    SkillService,
    SkillServiceTag,
    SkillApi,
    SkillApiTag,
    SkillDataTag, // Need access to loaded skills (RegisteredSkill)
    type RegisteredSkill,
    type SkillInput,
    type SkillOutput,
    type InvokeSkillError,
} from "./types.js";
import {
    SkillConfigError,
    SkillExecutionError,
    SkillInputValidationError,
    SkillNotFoundError,
    SkillOutputValidationError,
} from "./errors.js";

// Import dependencies for invokeSkill
import { PersonaDataTag, type PersonaDefinition } from "@/services/capabilities/persona/types"; // Adjust path
import { IntelligenceDataTag, type IntelligenceDefinition, type ModelPreference } from "@/services/capabilities/intelligence/types"; // Adjust path
import { PromptApiTag } from "@/services/ai/prompt/types"; // Adjust path
import { LoggingApiTag } from "@/services/core/logging/types"; // Adjust path
import { ProviderConfigDataTag } from "@/services/ai/provider/types"; // Needed for model availability check?
// Import @effect/ai core and providers
import { Completions } from "@effect/ai";
import * as OpenAI from "@effect/ai-openai"; // Use namespace import
import * as Anthropic from "@effect/ai-anthropic"; // Use namespace import
// Import ToolExecutor if skills can use tools
// import { ToolExecutorServiceTag } from "@/services/tools/types";

// --- SkillService Implementation (make/update for definitions) ---

const wrapSkillConfigError = (cause: ParseError): SkillConfigError =>
    new SkillConfigError({ message: "Skill definition validation failed", cause });

// Define the service implementation using Effect.Service
const SkillServiceImpl = Effect.Service<SkillService>()(
    "@services/SkillService",
    Effect.succeed({
        make: makeCapabilityMake(SkillDefinitionSchema, wrapSkillConfigError),
        update: makeCapabilityUpdate(SkillDefinitionSchema, wrapSkillConfigError),
    })
);

// Layer providing the SkillService
export const SkillServiceLiveLayer = Layer.effect(
    SkillServiceTag,
    SkillServiceImpl
);


// --- SkillApi Implementation (invokeSkill) ---

// Helper to select model based on Intelligence preferences and availability
// TODO: Refine availability check - currently just checks provider config existence
const selectModel = (
    intelligence: IntelligenceDefinition,
    providerConfigData: ProviderConfigData // From ProviderConfigDataTag
): Effect.Effect<ModelPreference, SkillExecutionError> => Effect.gen(function* () {
    // Sort preferences by priority (lower first)
    const sortedPrefs = [...intelligence.modelPreferences].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

    for (const pref of sortedPrefs) {
        // Basic check: Does the provider exist in the loaded provider config?
        const providerExists = HashMap.has(providerConfigData.providers, pref.provider);
        if (providerExists) {
            // TODO: Add more sophisticated checks? (API key env var set?)
            // For now, assume existence means potentially usable
            yield* Effect.logDebug(`Selected model based on preference: ${pref.provider}:${pref.model}`);
            return pref;
        } else {
            yield* Effect.logWarning(`Provider "${pref.provider}" from intelligence profile "${intelligence.name}" not found in provider configuration. Skipping.`);
        }
    }
    // If no suitable provider found
    return yield* Effect.fail(new SkillExecutionError({
        skillName: "unknown", // Skill name not available here easily
        message: `No configured/available model provider found matching preferences in intelligence profile "${intelligence.name}"`,
        cause: "Model selection failed"
    }));
});

// Helper to get the correct @effect/ai model factory
const getAiModelEffect = (
    modelPreference: ModelPreference,
    mergedParams: SkillExecutionParams // Use the merged params
): Effect.Effect<Completions.Completions, SkillExecutionError> => {
    // Filter out undefined values before passing to the factory
    const modelConfig = Object.fromEntries(
        Object.entries({
            temperature: mergedParams.temperature,
            maxTokens: mergedParams.maxTokens, // Map to provider-specific name if needed
            topP: mergedParams.topP,
            topK: mergedParams.topK,
            stopSequences: mergedParams.stopSequences,
            presencePenalty: mergedParams.presencePenalty,
            frequencyPenalty: mergedParams.frequencyPenalty,
        }).filter(([, value]) => value !== undefined)
    );

    switch (modelPreference.provider) {
        case "openai": // Assuming ProviderNameValues.OpenAI is "openai"
            // Need to handle potential errors from .model() if config is invalid
            return OpenAI.Completions.make(modelPreference.model, modelConfig).pipe(
                Effect.mapError(cause => new SkillExecutionError({ skillName: "unknown", message: "Failed to create OpenAI model", cause }))
            );
        case "anthropic": // Assuming ProviderNameValues.Anthropic is "anthropic"
            return Anthropic.Completions.make(modelPreference.model, modelConfig).pipe(
                Effect.mapError(cause => new SkillExecutionError({ skillName: "unknown", message: "Failed to create Anthropic model", cause }))
            );
        // Add cases for other providers
        default:
            return Effect.fail(new SkillExecutionError({
                skillName: "unknown",
                message: `Unsupported provider in model preference: ${modelPreference.provider}`
            }));
    }
};


// Define the SkillApi implementation logic
// This Effect requires all dependencies needed by invokeSkill
const SkillApiLiveImplementationLogic = Effect.gen(function* () {
    // Get dependencies from context
    const skillData = yield* SkillDataTag;
    const personaData = yield* PersonaDataTag;
    const intelligenceData = yield* IntelligenceDataTag;
    const promptApi = yield* PromptApiTag;
    const log = yield* LoggingApiTag;
    const providerConfigData = yield* ProviderConfigDataTag; // For model selection check
    // const toolExecutor = yield* ToolExecutorServiceTag; // Inject if tools are used

    // --- invokeSkill Method Implementation ---
    const invokeSkill = (params: {
        skillName: SkillName;
        input: SkillInput;
        overrideParams?: Partial<SkillExecutionParams>;
        executionContext?: Record<string, unknown>;
    }): Effect.Effect<SkillOutput, InvokeSkillError, never> => // R should be never as deps are in closure
        Effect.gen(function* () {
            yield* log.debug(`Invoking skill: ${params.skillName}`);

            // 1. Get Registered Skill (includes resolved schemas)
            const registeredSkillOpt = HashMap.get(skillData.skills, params.skillName);
            if (Option.isNone(registeredSkillOpt)) {
                return yield* Effect.fail(new SkillNotFoundError({ skillName: params.skillName }));
            }
            const registeredSkill: RegisteredSkill = registeredSkillOpt.value;
            const skillDef = registeredSkill.definition;

            // 2. Validate Input
            // Use Effect.logError from LoggingApiTag?
            const validatedInput = yield* validateInput(params.skillName, registeredSkill.inputSchema, params.input);

            // 3. Get Persona & Intelligence Definitions
            const personaDefOpt = skillDef.personaName
                ? HashMap.get(personaData.personas, skillDef.personaName)
                : Option.none(); // Handle optional persona
            if (skillDef.personaName && Option.isNone(personaDefOpt)) {
                return yield* Effect.fail(new SkillConfigError({ message: `Referenced Persona "${skillDef.personaName}" not found`, skillName: params.skillName }));
            }
            const personaDef = Option.getOrUndefined(personaDefOpt); // Allow undefined persona

            const intelligenceDefOpt = HashMap.get(intelligenceData.intelligences, skillDef.intelligenceName);
            if (Option.isNone(intelligenceDefOpt)) {
                return yield* Effect.fail(new SkillConfigError({ message: `Referenced Intelligence "${skillDef.intelligenceName}" not found`, skillName: params.skillName }));
            }
            const intelligenceDef = intelligenceDefOpt.value;

            // 4. Merge Execution Parameters
            // Order: Skill Defaults <- Intelligence Defaults (from pref) <- Invocation Overrides
            // Model selection needed first to get intelligence defaults
            const selectedModelPref = yield* selectModel(intelligenceDef, providerConfigData);
            const baseParams = selectedModelPref.parameters ?? {}; // Defaults from selected model pref
            const skillParams = skillDef.defaultParams ?? {};
            const overrideParams = params.overrideParams ?? {};
            let mergedParams: SkillExecutionParams = {
                ...baseParams,
                ...skillParams,
                ...overrideParams, // Invocation overrides have highest precedence
            };
            // Apply constraints (currently just temp) - TODO: Refine constraints
            // mergedParams = applyIntelligenceConstraints(mergedParams, intelligenceDef.parameterConstraints);

            // 5. Render Prompt
            // Combine persona instructions and skill system prompt override
            const systemPrompt = `${personaDef?.instructions ?? ''}\n${skillDef.systemPromptOverride ?? ''}`.trim();
            // Render the main template
            const renderedPrompt = yield* promptApi.renderTemplate(
                skillDef.promptTemplateName,
                {
                    // Provide input, context, potentially persona/intelligence details
                    input: validatedInput,
                    context: params.executionContext ?? {},
                    persona: personaDef,
                    intelligence: intelligenceDef,
                }
            ).pipe(
                // Map PromptApiError to SkillExecutionError
                Effect.mapError(cause => new SkillExecutionError({ skillName: params.skillName, message: "Prompt rendering failed", cause }))
            );

            // Construct final messages (example for chat model)
            const messages = [
                ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
                { role: "user" as const, content: renderedPrompt } // Assuming renderedPrompt is user message
            ];
            yield* log.debug("Constructed messages for LLM", { skillName: params.skillName, messageCount: messages.length });


            // 6. Select Model & Get AI Provider Effect
            // We already selected the preference, now get the factory/provider
            const aiModelProviderEffect = getAiModelEffect(selectedModelPref, mergedParams).pipe(
                // Add skillName to error context if factory fails
                Effect.mapError(err => ({ ...err, skillName: params.skillName }))
            );

            // 7. Define Core AI Logic Effect (using Completions Tag)
            const generateCompletionEffect = Effect.gen(function* () {
                const completions = yield* Completions.Completions; // Access the core capability
                yield* log.debug("Calling AI Completions.create", { skillName: params.skillName });
                // Use the constructed messages array
                const response = yield* completions.create({ messages });
                // Assuming simple text response for now
                const responseText = response.choices[0]?.message?.content ?? "";
                yield* log.debug("AI Completions successful", { skillName: params.skillName });
                return responseText; // Return raw string output
            });

            // 8. Execute AI Logic with Selected Provider
            yield* log.info(`Executing skill "${params.skillName}" with model ${selectedModelPref.provider}:${selectedModelPref.model}`);
            const rawOutput = yield* aiModelProviderEffect.pipe(
                // Provide the generateCompletionEffect to the selected model provider
                Effect.flatMap(modelProvider => modelProvider.provide(generateCompletionEffect)),
                // Map any error from the AI call to SkillExecutionError
                Effect.mapError(cause => new SkillExecutionError({ skillName: params.skillName, message: "AI execution failed", cause }))
            );

            // 9. Validate Output
            const validatedOutput = yield* validateOutput(params.skillName, registeredSkill.outputSchema, rawOutput);

            // 10. Return validated output
            return validatedOutput;

        }).pipe(
            // Add final logging taps if desired
            Effect.tapError(e => log.error(`Skill "${params.skillName}" failed`, { error: e })),
            // Provide LoggingApi to the whole invokeSkill workflow if taps are used
            // Effect.provideService(LoggingApiTag, log) // Already available via closure
        ); // End invokeSkill gen

    // Return the SkillApi implementation object
    return { invokeSkill } satisfies SkillApi;
});


// --- Layer Definition ---
// Layer providing the SkillApi service
export const SkillApiLiveLayer = Layer.effect(
    SkillApiTag,
    SkillApiLiveImplementationLogic // Run the effect that builds the service
);

// NOTE: Final App Layer Composition Needs:
// - SkillApiLiveLayer
// - SkillDataLiveLayer (provides SkillDataTag)
// - PersonaDataLiveLayer (provides PersonaDataTag)
// - IntelligenceDataLiveLayer (provides IntelligenceDataTag)
// - PromptApiLiveLayer (provides PromptApiTag)
// - LoggingApiLiveLayer (provides LoggingApiTag)
// - ProviderConfigLiveLayer (provides ProviderConfigDataTag)
// - ToolingLiveLayer (provides ToolExecutorServiceTag, if needed)
// - @effect/ai provider layers (e.g., OpenAI.layer(), Anthropic.layer())
// - Platform layer (e.g., BunContext.layer for HttpClient)
