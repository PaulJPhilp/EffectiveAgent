import { EffectiveError } from "@/errors.js";
import { Effect, Schema } from "effect";
// PipelineService import removed
import { ExecutiveCallConfig } from "./types.js";

/**
 * Abstract base class for defining non-streaming AI interaction pipelines.
 *
 * Provides structure for input/output validation, configuration of an AI call via the OrchestratorService, and execution orchestration.
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
  PipelineConfigServices = never // This R might need adjustment later
> {
  constructor() {
    // pipelineService removed
    // If pipelineService was used for other things, those need to be addressed.
    // For now, assuming it was only for execute.
  }

  // --- Abstract Properties/Methods (to be implemented by subclass) ---

  /** Effect Schema for validating raw input and deriving 'In' type. */
  abstract readonly inputSchema: Schema.Schema<unknown, In>;

  /** Effect Schema for validating the AI response and deriving 'Out' type. */
  abstract readonly outputSchema: Schema.Schema<unknown, Out>;

  /** Configuration for the executive call based on input and chat history */
  protected configureExecutiveCall(
    input: In
  ): Effect.Effect<
    ExecutiveCallConfig<Out, EffectiveError, any>,
    EffectiveError,
    PipelineConfigServices
  > {
    return Effect.succeed({
      effect: this.executeProducer(input),
      parameters: {
        timeoutMs: 30000,
      } as const,
    });
  }

  /** Execute the producer for this pipeline */
  protected executeProducer(
    input: In
  ): Effect.Effect<Out, EffectiveError, any> {
    return Effect.succeed(input as unknown as Out);
  }

  // --- Public Run Method ---

  /** Executes the AI pipeline for the given raw input. */
  public run(
    input: In
  ): Effect.Effect<Out, EffectiveError, PipelineConfigServices> {
    // OrchestratorService removed from R
    const self = this;
    return Effect.gen(function* () {
      // Configure and execute
      const config = yield* self.configureExecutiveCall(input);
      // Directly execute the effect from config. config.parameters are no longer used here.
      const result = yield* config.effect;

      return result as Out;
    }).pipe(
      Effect.mapError((error: unknown) => {
        // Explicitly type error as unknown
        // If error is already an instance of EffectiveError, return it as is.
        if (error instanceof EffectiveError) {
          return error;
        }

        // Otherwise, wrap it in a new EffectiveError.
        // The EffectiveError constructor is expected to set 'name' and 'message' appropriately.
        const description = `Failed to execute AiPipeline.run: ${
          error instanceof Error ? error.message : String(error)
        }`;
        return new EffectiveError({
          description: description,
          module: "AiPipeline",
          method: "run",
          cause: error,
        });
      })
    );
  }
}
{
}
