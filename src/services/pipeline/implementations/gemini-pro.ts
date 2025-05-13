import { Effect } from "effect"
import { PipelineConfig } from "../shared/api.js"
import { Pipeline } from "../shared/service.js"
import { PipelineError } from "../shared/errors.js"

/**
 * Base Gemini Pro pipeline implementation
 */
export class GeminiProPipeline extends Pipeline {
    protected readonly SYSTEM_PROMPT: string = "You are a helpful AI assistant."

    readonly execute = <A, E, R>(
        effect: Effect.Effect<A, E, R>,
        config?: PipelineConfig
    ): Effect.Effect<A, PipelineError, R> => {
        return super.execute(effect, config)
    }
} 