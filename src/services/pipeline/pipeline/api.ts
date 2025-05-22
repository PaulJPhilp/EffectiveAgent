import { Effect } from "effect";
import {
  ExecutiveParameters,
  ExecutiveServiceError,
} from "../executive-service/index.js";

/**
 * Interface for the Pipeline Service
 */
export interface PipelineServiceInterface {
  readonly _tag: "PipelineService";
  readonly execute: <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    parameters?: ExecutiveParameters,
  ) => Effect.Effect<A, E | ExecutiveServiceError, R>;
}