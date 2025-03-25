import { AgentNode } from '../../agent-service/AgentNode.js'
import type { NormalizingAgentState } from '../types.js'

/**
 * Node for initializing a normalization run
 */
export class InitializeRunNode extends AgentNode<NormalizingAgentState> {
    public readonly name = 'initialize_run'
    public readonly description = 'Initializes the normalization run and sets up directories'

    /**
     * Executes the node's logic
     * @param state Current agent state
     * @returns Updated agent state
     */
    public async execute(state: NormalizingAgentState): Promise<NormalizingAgentState> {
        try {
            // Create initial state with input
            return {
                ...state,
                status: {
                    ...state.status,
                    currentNode: this.name,
                    overallStatus: 'running'
                },
                agentState: {
                    profiles: [],
                    normalizedProfiles: [],
                    normalizationResults: []
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            return {
                ...state,
                status: {
                    ...state.status,
                    currentNode: this.name,
                    overallStatus: 'failed'
                },
                errors: {
                    errors: [...state.errors.errors, errorMessage],
                    errorCount: state.errors.errorCount + 1
                }
            }
        }
    }
} 