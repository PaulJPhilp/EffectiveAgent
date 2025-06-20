/**
 * @file Defines the StructuredOutputPipeline, a pipeline for generating structured data using AI.
 * @module framework/pipeline/structured-output
 */

import { EffectiveError } from "@/errors.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { AiPipeline } from "@/services/pipeline/pipeline/base.js";
import { PipelineExecutionError } from "@/services/pipeline/pipeline/errors.js";
import { ObjectServiceApi } from "@/services/producers/object/api.js";
import { ObjectService } from "@/services/producers/object/service.js";
import { TextGenerationOptions } from "@/services/producers/text/types.js";
import { Effect, Option, Schema as S } from "effect";
import { ExecutiveServiceError } from "@/services/executive/errors.js";

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
        usage: S.Class<{ promptTokens: number; completionTokens: number; totalTokens: number }>("Usage")({
            promptTokens: S.Number,
            completionTokens: S.Number,
            totalTokens: S.Number,
        })
    });

export type StructuredOutputOutput<T> = {
    data: T;
    usage: { promptTokens: number; completionTokens: number; totalTokens: number };
};

export interface StructuredOutputOptions<T extends S.Schema<any, any>> {
    readonly input: string;
    readonly responseSchema: T;
    readonly textOptions?: Partial<TextGenerationOptions>;
    readonly span?: any;
    readonly modelId?: string;
}

// Update StructuredOutputResult to properly extend EffectiveResponse structure
export interface StructuredOutputResult<T> {
    readonly result: T;
    readonly metadata: {
        readonly executiveParameters: {
            readonly retryPolicy: "standard" | "aggressive" | "conservative";
            readonly timeoutMs: number;
            readonly enableLogging: boolean;
        };
    };
    readonly usage?: {
        readonly promptTokens: number;
        readonly completionTokens: number;
        readonly totalTokens: number;
    };
}

export function executeStructuredOutput<
    T,
    S extends S.Schema<any, any>
>(
    objectService: ObjectServiceApi<S>,
    options: StructuredOutputOptions<S>
): Effect.Effect<StructuredOutputResult<T>, ExecutiveServiceError> {
    return Effect.gen(function* () {
        try {
            yield* Effect.logInfo("Executing structured output generation", {
                modelId: options.modelId,
                hasSchema: !!options.responseSchema
            });

            // Generate the structured object
            const result = yield* objectService.generate({
                prompt: options.input,
                schema: options.responseSchema,
                modelId: options.modelId || "gpt-4o-mini",
                span: options.span,
                ...options.textOptions
            });

            yield* Effect.logInfo("Structured output generated successfully");

            return {
                result: result.data as T,
                metadata: {
                    executiveParameters: {
                        retryPolicy: "standard" as const,
                        timeoutMs: 30000,
                        enableLogging: true
                    }
                },
                usage: result.usage
            };

        } catch (error) {
            yield* Effect.logError("Structured output generation failed", { error });

            // Create a new error with the required properties
            const pipelineError = new PipelineExecutionError(
                `module=structured-output method=executeProducer error=${String(error)}`
            );

            return yield* Effect.fail(pipelineError);
        }
    });
}

export class StructuredOutputPipeline<T> extends AiPipeline<
    StructuredOutputInput,
    StructuredOutputOutput<T>,
    EffectiveError
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
    ): Effect.Effect<StructuredOutputOutput<T>, EffectiveError, any> {
        const self = this;
        return Effect.gen(function* () {
            const objectService = yield* ObjectService;
            const result = yield* objectService.generate({
                prompt: input.prompt,
                modelId: input.modelId,
                system: Option.fromNullable(input.systemPrompt),
                schema: self.schema,
                span: {} as any, // TODO: Add proper span handling
                parameters: {
                    temperature: input.temperature,
                    topP: input.topP
                },
            });
            return {
                data: result.data as T,
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
            Effect.provide(ConfigurationService.Default),
            Effect.mapError((error): EffectiveError => {
                if (error instanceof EffectiveError) {
                    return error;
                }
                const pipelineError = new PipelineExecutionError(String(error));
                return pipelineError as EffectiveError
            })
        );
    }
}