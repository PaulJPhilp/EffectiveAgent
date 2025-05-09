import { EffectiveError } from "@/errors.js";
import { ExecutiveService } from "@/services/pipeline/service.js";
import { Duration, Effect, Schema } from "effect";
import { PipelineExecutionError } from "./errors.js";
import type { ImportedType } from "./types.js";

/**
 * Abstract base class for defining non-streaming AI interaction pipelines.
 *
 * Provides structure for input/output validation, configuration of an AI call via the ExecutiveService, and execution orchestration.
 *
 * @template In The type of the validated input object.
 * @template Out The type of the validated output data.
 * @template PipelineSpecificError Custom errors originating from the pipeline's configuration logic.
 * @template PipelineConfigServices Effect services required ONLY for the pipeline's configuration logic.
 */
export abstract class AiPipeline<
  In,
  Out,
  PipelineSpecificError extends EffectiveError,
  PipelineConfigServices = never,
> {
  // --- Abstract Properties/Methods (to be implemented by subclass) ---

  /** Effect Schema for validating raw input and deriving 'In' type. */
  abstract readonly inputSchema: Schema.Schema<unknown, In>;

  /** Effect Schema for validating the AI response and deriving 'Out' type. */
  abstract readonly outputSchema: Schema.Schema<unknown, Out>;

  /** Configuration for the executive call based on input and chat history */
  protected configureExecutiveCall(
    input: In,
  ): Effect.Effect<
    ExecutiveCallConfig<Out, EffectiveError, any>,
    EffectiveError,
    PipelineConfigServices
  > {
    return Effect.succeed({
      effect: this.executeProducer(input),
      parameters: {
        timeout: Duration.millis(30000)
      } as const
    });
  }

  /** Execute the producer for this pipeline */
  protected executeProducer(
    input: In,
  ): Effect.Effect<Out, EffectiveError, any> {
    return Effect.succeed(input as unknown as Out);
  }

  // --- Public Run Method ---

  /** Executes the AI pipeline for the given raw input. */
  public run(
    input: In,
  ): Effect.Effect<Out, EffectiveError, PipelineConfigServices | ExecutiveService> {
    const self = this;
    return Effect.gen(function* () {
      // Get executive service
      const executiveService = yield* ExecutiveService;

      // Configure and execute
      const config = yield* self.configureExecutiveCall(input);
      const result = yield* executiveService.execute(
        config.effect,
        config.parameters
      );

      return result as Out;
    }).pipe(
      Effect.mapError((error) => {
        if (error instanceof EffectiveError) return error;
        return new PipelineExecutionError(`Failed to execute pipeline: ${error}`);
      })
    );
  }
} { }