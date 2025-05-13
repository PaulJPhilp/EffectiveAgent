/**
 * @file Defines the StructuredOutputPipeline, a pipeline for generating structured data using AI.
 * @module framework/pipeline/structured-output
 */

import { EffectiveError } from "@/errors.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { AiPipeline } from "@/services/pipeline/pipeline/base.js";
import { PipelineExecutionError } from "@/services/pipeline/pipeline/errors.js";
import { ObjectService } from "@/services/pipeline/producers/object/service.js";
import { type Usage } from "@/types.js";
import { ConfigProvider, Effect, Option, Schema as S } from "effect";

/**
 * Input schema for the structured output pipeline
 */
export class StructuredOutputInput extends S.Class<StructuredOutputInput>("StructuredOutputInput")({
    prompt: S.String,
    modelId: S.optional(S.String),
    systemPrompt: S.optional(S.String),
    maxTokens: S.optional(S.Number),
    temperature: S.optional(S.Number),
    topP: S.optional(S.Number),
    topK: S.optional(S.Number),
    presencePenalty: S.optional(S.Number),
    frequencyPenalty: S.optional(S.Number),
    seed: S.optional(S.Number),
    stop: S.optional(S.Array(S.String)),
}) { }

/**
 * Output schema for structured output
 */
export const makeOutputSchema = <T>(schema: S.Schema<T>) =>
    S.Class<StructuredOutputOutput<T>>("StructuredOutputOutput")({
        data: schema,
        usage: S.Class<Usage>("Usage")({
            promptTokens: S.Number,
            completionTokens: S.Number,
            totalTokens: S.Number,
        })
    });

export type StructuredOutputOutput<T> = {
    data: T;
    usage: Usage;
};

export class StructuredOutputPipeline<T> extends AiPipeline<
    StructuredOutputInput,
    StructuredOutputOutput<T>,
    EffectiveError,
    never
> {
    readonly inputSchema = StructuredOutputInput as S.Schema<unknown, StructuredOutputInput>;
    readonly outputSchema: S.Schema<unknown, StructuredOutputOutput<T>>;

    constructor(private readonly schema: S.Schema<T>) {
        super();
        this.outputSchema = makeOutputSchema(schema) as S.Schema<unknown, StructuredOutputOutput<T>>;
    }

    /**
     * Execute the producer to generate structured output
     * @param input The structured output input parameters
     * @returns Effect containing the structured output result
     */
    protected override executeProducer(
        input: StructuredOutputInput,
    ): Effect.Effect<StructuredOutputOutput<T>, EffectiveError, ConfigProvider.ConfigProvider> {
        const self = this;
        return Effect.gen(function* () {
            const objectService = yield* ObjectService;
            const result = yield* objectService.generate<T>({
                prompt: input.prompt,
                modelId: input.modelId,
                system: Option.fromNullable(input.systemPrompt),
                schema: self.schema,
                span: {} as any, // TODO: Add proper span handling
                parameters: {
                    maxSteps: input.maxTokens,
                    temperature: input.temperature,
                    topP: input.topP,
                    topK: input.topK,
                    presencePenalty: input.presencePenalty,
                    frequencyPenalty: input.frequencyPenalty,
                    seed: input.seed,
                    stop: [...(input.stop || [])]
                },
            });
            return {
                data: result.object,
                usage: result.usage ?? {
                    promptTokens: 0,
                    completionTokens: 0,
                    totalTokens: 0
                }
            };
        }).pipe(
            Effect.provide(ObjectService.Default),
            Effect.provide(ModelService.Default),
            Effect.provide(ProviderService.Default),
            Effect.mapError((error): EffectiveError => {
                if (error instanceof EffectiveError) {
                    return error;
                }
                const pipelineError = new PipelineExecutionError("Failed to generate structured output");
                pipelineError.module = "structured-output"
                pipelineError.method = "executeProducer"
                pipelineError.description = String(error)
                return pipelineError as EffectiveError
            })
        );
    }
}