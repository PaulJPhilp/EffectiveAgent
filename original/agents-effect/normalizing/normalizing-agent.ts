import { Context, Effect, Layer } from "effect"
import type { BaseProfile, NormalizedProfile } from "../../agents/types.js"
import { AgentExecutionError, AgentService, type AgentState } from "../../shared/services/agent/types.js"
import type { JSONObject } from "../../types.js"
import type { NormalizingAgentConfig } from "./config/schema.js"
import type {
    NormalizingDomainState,
    NormalizingInput,
    NormalizingOutput
} from "./types.js"

/**
 * Converts a NormalizedProfile to a JSON-safe object
 */
function toJSONSafeProfile(profile: NormalizedProfile): JSONObject {
    return {
        id: profile.id,
        name: profile.name,
        sourceProfileId: profile.sourceProfileId,
        content: profile.content,
        normalizedFields: Object.fromEntries(
            Object.entries(profile.normalizedFields)
                .map(([k, v]) => [k, JSON.stringify(v)])
        )
    } as JSONObject
}

/**
 * Effect.ts-based implementation of the normalizing agent
 */
export class NormalizingAgent implements AgentService<NormalizingInput, NormalizingOutput, NormalizingDomainState> {
    constructor(
        private readonly config: NormalizingAgentConfig
    ) { }

    /**
     * Runs the agent graph with the given input
     */
    run = (
        input: NormalizingInput
    ): Effect.Effect<AgentState<NormalizingInput, NormalizingOutput, NormalizingDomainState>, never> => {
        return Effect.gen(function* (this: NormalizingAgent) {
            // Initialize services and validate input
            yield* Effect.succeed(undefined)

            // Load profiles
            const profiles = yield* Effect.succeed<BaseProfile[]>([])

            // Normalize profiles
            const normalizedProfiles = yield* Effect.succeed<NormalizedProfile[]>([])

            // Save results
            yield* Effect.succeed(undefined)

            // Return state
            const output: NormalizingOutput = {
                normalizedProfiles: normalizedProfiles.map(toJSONSafeProfile) as unknown as NormalizedProfile[],
                summary: {
                    totalProfiles: profiles.length,
                    successfulNormalizations: normalizedProfiles.length,
                    failedNormalizations: profiles.length - normalizedProfiles.length,
                    totalDuration: 0,
                    totalTokensUsed: 0
                }
            } as NormalizingOutput

            const state: AgentState<NormalizingInput, NormalizingOutput, NormalizingDomainState> = {
                config: {
                    name: this.config.name,
                    version: this.config.version,
                    tags: ["normalizing"],
                    graph: {
                        nodes: [],
                        edges: [],
                        start_node_id: "start",
                        metadata: {}
                    },
                    settings: {
                        model: this.config.defaultModel,
                        batchSize: this.config.batchSize,
                        retryConfig: this.config.retryConfig,
                        paths: this.config.paths,
                        validation: this.config.validation
                    }
                },
                agentRun: {
                    id: crypto.randomUUID(),
                    startTime: new Date().toISOString(),
                    endTime: new Date().toISOString(),
                    status: "completed"
                },
                status: {
                    overallStatus: "completed",
                    nodeHistory: [],
                    currentNode: undefined
                },
                logs: {
                    logs: [],
                    logCount: 0
                },
                errors: {
                    errors: [],
                    errorCount: 0
                },
                input,
                output,
                agentState: {
                    profiles,
                    normalizedProfiles,
                    normalizationResults: []
                }
            }
            return state
        }.bind(this))
    }

    /**
     * Builds the agent's execution graph
     */
    buildGraph = (): Effect.Effect<void, AgentExecutionError> => {
        return Effect.succeed(undefined)
    }

    /**
     * Saves the LangGraph configuration to a file
     */
    saveLangGraphConfig = (outputPath?: string): Effect.Effect<void, AgentExecutionError> => {
        return Effect.succeed(undefined)
    }

    /**
     * Creates a Layer for the NormalizingAgent
     */
    static readonly Tag = Context.GenericTag<NormalizingAgent>("NormalizingAgent")

    static live = (config: NormalizingAgentConfig) =>
        Layer.succeed(
            NormalizingAgent.Tag,
            new NormalizingAgent(config)
        )

    // Private helper methods
    private validateInput = (input: NormalizingInput): Effect.Effect<void, never> => {
        return Effect.succeed(undefined)
    }

    private loadProfiles = (input: NormalizingInput): Effect.Effect<BaseProfile[], never> => {
        return Effect.succeed([])
    }

    private normalizeProfiles = (profiles: BaseProfile[]): Effect.Effect<NormalizedProfile[], never> => {
        return Effect.succeed([])
    }

    private saveResults = (profiles: NormalizedProfile[], input: NormalizingInput): Effect.Effect<void, never> => {
        return Effect.succeed(undefined)
    }
} 