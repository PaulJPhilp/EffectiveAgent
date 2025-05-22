import { Effect } from "effect";
import {
  ExecutiveParameters,
  ExecutiveService, // Added import
  ExecutiveServiceError,
} from "../executive-service/index.js"; 
import { PipelineServiceInterface } from "./api.js";

/**
 * Implementation of the Pipeline Service using Effect.Service pattern
 */
export class PipelineService
  extends Effect.Service<PipelineServiceInterface>()("PipelineService", {
    effect: Effect.gen(function* () { // Changed to Effect.gen
      const executiveService = yield* ExecutiveService; // Get ExecutiveService

      return {
        _tag: "PipelineService" as const,
        execute: <A, E, R>(
          effectToRun: Effect.Effect<A, E, R>,
          parameters?: ExecutiveParameters,
        ): Effect.Effect<A, E | ExecutiveServiceError, R> => {
          // Resiliency logic (retries, timeout) removed.
          // These should be handled by the shared/Pipeline service if needed by the caller.
          
          // Directly delegate to ExecutiveService.
          return executiveService.execute(effectToRun, parameters);
        },
      };
    }),
    dependencies: [ExecutiveService.Default], 
  }) {}
