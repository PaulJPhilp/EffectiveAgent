/**
 * Defines the TextCompletionPipeline, a specific implementation of AiPipeline for text generation tasks.
 * @module framework/pipeline/text-completion
 */

import { EffectiveError } from "@/errors.js";
import { ModelService } from "@/services/ai/model/service.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import { AiPipeline } from "@/services/pipeline/pipeline/base.js";
import { TextCompletionError } from "@/services/pipeline/producers/text/errors.js";
import { TextCompletionInput, TextCompletionOutput } from "@/services/pipeline/producers/text/schema.js";
import TextService from "@/services/pipeline/producers/text/service.js";
import { Effect, Option, Schema, pipe } from "effect";

/**
 * Pipeline for text completion using an AI model.
 */
export class TextCompletionPipeline extends AiPipeline<
  TextCompletionInput,
  TextCompletionOutput,
  TextCompletionError,
  never
> {
  readonly inputSchema = TextCompletionInput as Schema.Schema<unknown, TextCompletionInput>;
  readonly outputSchema = TextCompletionOutput as Schema.Schema<unknown, TextCompletionOutput>;

  /**
   * Execute the producer to generate text completion.
   * @param input The text completion input parameters
   * @returns Effect containing the text completion output
   */
  protected override executeProducer(
    input: TextCompletionInput,
  ): Effect.Effect<TextCompletionOutput, EffectiveError, never> {
    return pipe(
      Effect.gen(function* () {
        const service = yield* TextService;
        const result = yield* service.generate({
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
          text: result.text,
          usage: result.usage ?? {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0
          }
        } satisfies TextCompletionOutput;
      }),
      Effect.mapError((error): EffectiveError => new TextCompletionError({
        description: "Failed to generate text completion",
        cause: error
      })),
      Effect.provide(TextService.Default),
      Effect.provide(ProviderService.Default),
      Effect.provide(ModelService.Default),
      Effect.provide(ConfigurationService.Default)
    );
  }
}
