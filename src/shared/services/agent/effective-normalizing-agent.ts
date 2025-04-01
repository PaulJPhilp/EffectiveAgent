import { Duration, Effect } from "effect"
import { z } from "zod"
import { ConfigurationService } from "../configuration/configuration-service.js"
import { AgentImplementationError, AgentRateLimitError } from "./errors.js"
import type { AgentConfig } from "./types.js"

interface NormalizationResult {
    normalized: boolean
    data: Record<string, unknown>
    validationErrors: string[]
    processingTimeMs?: number
}

export class EffectiveNormalizingAgent {
    private readonly schema: z.ZodSchema
    private readonly maxBatchSize: number
    private readonly timeoutMs: number

    constructor(
        private readonly configService: ConfigurationService,
        public readonly config: AgentConfig
    ) {
        if (!config) {
            throw new AgentImplementationError({
                message: "Agent configuration is required",
                agentId: "effective-normalizing-agent"
            })
        }

        if (!config.schema || !(config.schema instanceof z.ZodType)) {
            throw new AgentImplementationError({
                message: "Valid Zod schema is required in agent configuration",
                agentId: config.id
            })
        }

        this.schema = config.schema
        this.maxBatchSize = config.overrides?.maxBatchSize ?? 1000
        this.timeoutMs = config.overrides?.timeoutMs ?? 30000
    }

    get agentId(): string {
        return this.config.id
    }

    normalizeData(
        data: Record<string, unknown>
    ): Effect.Effect<NormalizationResult, AgentImplementationError | AgentRateLimitError> {
        const startTime = performance.now()

        return Effect.try({
            try: () => {
                const result = this.schema.parse(data)
                const processingTimeMs = Math.max(1, Math.round(performance.now() - startTime))

                return {
                    normalized: true,
                    data: result,
                    validationErrors: [],
                    processingTimeMs
                }
            },
            catch: (error) => {
                if (error instanceof z.ZodError) {
                    throw new AgentImplementationError({
                        message: `Validation failed: ${error.errors.map(err => `${err.path.join(".")}: ${err.message}`).join(", ")}`,
                        agentId: this.agentId,
                        cause: error
                    })
                }

                if (error instanceof Error && error.message.includes("rate limit")) {
                    throw new AgentRateLimitError({
                        message: error.message,
                        agentId: this.agentId,
                        retryAfterMs: 1000,
                        cause: error
                    })
                }

                throw new AgentImplementationError({
                    message: "Unexpected error during normalization",
                    agentId: this.agentId,
                    cause: error as Error
                })
            }
        })
    }

    normalizeBatch(
        dataArray: Record<string, unknown>[]
    ): Effect.Effect<NormalizationResult[], AgentImplementationError | AgentRateLimitError> {
        const startTime = performance.now()

        if (dataArray.length > this.maxBatchSize) {
            return Effect.fail(
                new AgentImplementationError({
                    message: `Batch size ${dataArray.length} exceeds maximum of ${this.maxBatchSize}`,
                    agentId: this.agentId
                })
            )
        }

        const self = this
        return Effect.gen(function* (_) {
            const results = yield* _(
                Effect.forEach(
                    dataArray,
                    (data) => Effect.timeout(self.normalizeData(data), Duration.millis(self.timeoutMs)),
                    { concurrency: 5 }
                )
            )

            const processingTimeMs = Math.max(1, Math.round(performance.now() - startTime))

            // Add processing time to each result
            return results.map(result => ({
                ...result,
                processingTimeMs: result.processingTimeMs ?? processingTimeMs
            }))
        })
    }
} 