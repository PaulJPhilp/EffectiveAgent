import type { EffectiveError } from "@/errors.js"
import { Context, Effect, Schema } from "effect"
import type { ExecutiveParameters } from "./types.js"

/**
 * Core pipeline service interface for executing AI operations
 */
export interface PipelineServiceInterface {
    /**
     * Executes an AI pipeline with the given input
     */
    readonly execute: <In, Out>(
        input: In,
        schema: {
            input: Schema.Schema<In>,
            output: Schema.Schema<Out>
        },
        parameters?: ExecutiveParameters
    ) => Effect.Effect<Out, EffectiveError>
}

/**
 * Context Tag for the Pipeline Service
 */
export class PipelineService extends Context.Tag("PipelineService")<
    PipelineService,
    PipelineServiceInterface
>() { } 