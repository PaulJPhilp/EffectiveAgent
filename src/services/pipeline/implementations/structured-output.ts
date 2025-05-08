/**
 * @file Defines the StructuredOutputPipeline, a pipeline for generating structured data using AI.
 * @module framework/pipeline/structured-output
 */

import { EffectiveError } from "@/errors.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { PipelineExecutionError } from "@/services/pipeline/pipeline/errors.js";
import { ObjectService } from "@/services/pipeline/producers/object/service.js";
import { type Usage } from "@/types.js";
import { ConfigProvider, Effect, Option, Schema, pipe } from "effect";
import { AiPipeline } from "../pipeline/base.js";

/**
 * Input schema for the structured output pipeline
 */
export class StructuredOutputInput extends Schema.Class<StructuredOutputInput>("StructuredOutputInput")({
    prompt: Schema.String,
    modelId: Schema.optional(Schema.String),
    systemPrompt: Schema.optional(Schema.String),
    maxTokens: Schema.optional(Schema.Number),
    temperature: Schema.optional(Schema.Number),
    topP: Schema.optional(Schema.Number),
    topK: Schema.optional(Schema.Number),
    presencePenalty: Schema.optional(Schema.Number),
    frequencyPenalty: Schema.optional(Schema.Number),
    seed: Schema.optional(Schema.Number),
    stop: Schema.optional(Schema.Array(Schema.String)),
}) { }

/**
 * Output schema for structured output
 */
export const makeOutputSchema = <T>(schema: Schema.Schema<T>) =>
    Schema.Class<StructuredOutputOutput<T>>("StructuredOutputOutput")({
        data: schema,
        usage: Schema.Class<Usage>("Usage")({
            promptTokens: Schema.Number,
            completionTokens: Schema.Number,
            totalTokens: Schema.Number,
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
    readonly inputSchema = StructuredOutputInput as Schema.Schema<unknown, StructuredOutputInput>;
    readonly outputSchema: Schema.Schema<unknown, StructuredOutputOutput<T>>;

    constructor(private readonly schema: Schema.Schema<T>) {
        super();
        this.outputSchema = makeOutputSchema(schema) as Schema.Schema<unknown, StructuredOutputOutput<T>>;
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
        return pipe(
            Effect.gen(function* () {
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
                    data: result.data,
                    usage: result.usage ?? {
                        promptTokens: 0,
                        completionTokens: 0,
                        totalTokens: 0
                    }
                };
            }),
            Effect.provide(ObjectService.Default),
            Effect.provide(ModelService.Default),
            Effect.provide(ProviderService.Default),
            Effect.mapError((error): EffectiveError =>
                error instanceof EffectiveError ? error :
                    new PipelineExecutionError("Failed to generate structured output")
            )
        );
    }
}