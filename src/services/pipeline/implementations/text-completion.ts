/**
 * Defines the TextCompletionPipeline, a specific implementation of AiPipeline for text generation tasks.
 * @module framework/pipeline/text-completion
 */

import { EffectiveError } from "@/errors.js";
import type { GenerateTextResult } from "@/services/ai/provider/types.js";
import { AiPipeline } from "@/services/pipeline/pipeline/base.js";
import { TextCompletionError } from "@/services/pipeline/producers/text/errors.js";
import { TextCompletionInput, TextCompletionOutput } from "@/services/pipeline/producers/text/schema.js";
import { TextService } from "@/services/pipeline/producers/text/service.js";
// PipelineService import removed
import { Effect, Option, Schema, pipe } from "effect";

/**
 * Pipeline for text completion using an AI model.
 */
export class TextCompletionPipeline extends AiPipeline<
  TextCompletionInput,
  TextCompletionOutput,
  TextCompletionError,
  never // PipelineConfigServices - assuming none for TextCompletionPipeline itself
> {
  readonly inputSchema = TextCompletionInput as Schema.Schema<unknown, TextCompletionInput>;
  readonly outputSchema = TextCompletionOutput as Schema.Schema<unknown, TextCompletionOutput>;

  constructor(
    // pipelineService: PipelineService, // Removed
    private readonly textService: TextService,
    // Assuming ProviderService, ModelService, ConfigurationService are implicitly 
    // provided to TextService or are not direct dependencies here.
    // If they were direct dependencies of TextCompletionPipeline's logic beyond TextService,
    // they would be injected here too.
  ) {
    super(); // Call base constructor without arguments
  }

  /**
   * Execute the producer to generate text completion.
   * @param input The text completion input parameters
   * @returns Effect containing the text completion output
   */
  protected override executeProducer(
    input: TextCompletionInput,
  ): Effect.Effect<TextCompletionOutput, EffectiveError, TextService> { // R changed from 'never' to 'TextService'
    // Get the injected TextService instance
    const textServiceInstance = this.textService;

    // Create the effect that uses the TextService instance
    const generationEffect = Effect.gen(function* () {
      // Now 'service' refers to the instance, not a yielded Tag
      const result = yield* textServiceInstance.generate({ // USE INJECTED SERVICE
        prompt: input.prompt,
        modelId: input.modelId,
        system: Option.fromNullable(input.systemPrompt),
        span: {} as any, // TODO: Add proper span handling
        parameters: {
          maxSteps: input.maxTokens,
          maxRetries: input.maxRetries,
          temperature: input.temperature,
          topP: input.topP,
          topK: input.topK,
          presencePenalty: input.presencePenalty,
          frequencyPenalty: input.frequencyPenalty,
          seed: input.seed,
          stop: input.stop ? [...input.stop] : undefined,
        },
      });

      return {
        text: (result.data as unknown as GenerateTextResult).text,
        usage: result.usage ?? {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0
        }
      } satisfies TextCompletionOutput;
    });

    return pipe(
      generationEffect, // This effect requires TextService (or TextServiceApi)
      Effect.mapError((error): EffectiveError => new TextCompletionError({
        description: "Failed to generate text completion",
        cause: error
      }))
    );
  }
}
