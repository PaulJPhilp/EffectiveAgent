import { Effect, Option, pipe, Schema } from "effect";
import type { EffectiveError } from "@/errors.js";
import TextService from "@/services/pipeline/producers/text/service.js";
import { TextCompletionError } from "@/services/pipeline/producers/text/errors.js";
import { TextCompletionInput, TextCompletionOutput } from "@/services/pipeline/producers/text/schema.js";
import { AiPipeline } from "./base.js";

/**
 * Input type for Gemini Pro pipeline, excluding fixed parameters
 */
export type GeminiProInput = Omit<TextCompletionInput, "modelId" | "temperature" | "systemPrompt">;

/**
 * Schema for Gemini Pro input
 */
export const GeminiProInput: Schema.Schema<unknown, GeminiProInput> = pipe(
  TextCompletionInput,
  Schema.omit("modelId", "temperature", "systemPrompt")
);

/**
 * Base pipeline for Gemini 2.5 Pro model with fixed parameters
 */
export abstract class GeminiProPipeline extends AiPipeline<
  GeminiProInput,
  TextCompletionOutput,
  TextCompletionError,
  never
> {
  readonly inputSchema = GeminiProInput;
  readonly outputSchema = TextCompletionOutput as Schema.Schema<unknown, TextCompletionOutput>;

  // Fixed parameters for Gemini Pro
  private static readonly MODEL_ID = "gemini-2.5-pro";
  private static readonly TEMPERATURE = 0.7;
  protected abstract readonly SYSTEM_PROMPT: string;

  protected override executeProducer(
    input: GeminiProInput,
  ): Effect.Effect<TextCompletionOutput, EffectiveError, never> {
    return pipe(
      Effect.gen(function* () {
        const service = yield* TextService;
        const result = yield* service.generate({
          prompt: input.prompt,
          modelId: GeminiProPipeline.MODEL_ID,
          system: Option.some(this.SYSTEM_PROMPT),
          parameters: {
            maxSteps: input.maxTokens,
            maxRetries: input.maxRetries,
            temperature: GeminiProPipeline.TEMPERATURE,
            topP: input.topP,
            topK: input.topK,
            presencePenalty: input.presencePenalty,
            frequencyPenalty: input.frequencyPenalty,
            seed: input.seed,
            stop: input.stop,
          },
        });

        return {
          text: result.data.text,
          usage: result.metadata.usage ?? {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0
          }
        } satisfies TextCompletionOutput;
      }),
      Effect.mapError((error): EffectiveError => new TextCompletionError({
        description: "Failed to generate text completion",
        cause: error
      }))
    );
  }
}
