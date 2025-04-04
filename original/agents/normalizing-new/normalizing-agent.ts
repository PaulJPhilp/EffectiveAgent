import type { LangGraphConfig, LangGraphEdge } from '../agent-service/Agent.js'
import { Agent } from '../agent-service/Agent.js'
import type { AgentGraphConfig, AgentGraphImplementation } from '../agent-service/AgentGraph.js'
import { createLangGraphAgentGraph } from '../agent-service/LangGraphAgentGraph.js'
import { InitializeRunNode } from './nodes/initialize-run.js'
import { LoadProfilesNode } from './nodes/load-profiles.js'
import { NormalizeProfilesNode } from './nodes/normalize-profiles.js'
import { SaveResultsNode } from './nodes/save-results.js'
import type { NormalizingAgentState, NormalizingDomainState, NormalizingInput, NormalizingOutput } from './types.js'

/**
 * Agent for normalizing and extracting metadata from PDF content
 */
export class NormalizingAgent extends Agent<NormalizingInput, NormalizingOutput, NormalizingDomainState> {
    /**
     * Builds the agent graph with nodes and edges
     * @returns The compiled agent graph
     */
    protected buildGraph(): AgentGraphImplementation<NormalizingAgentState> {
        // Create nodes
        const initializeRun = new InitializeRunNode(
            this.taskService,
            this.providerService,
            this.modelService,
            this.promptService
        )
        const loadProfiles = new LoadProfilesNode(
            this.taskService,
            this.providerService,
            this.modelService,
            this.promptService
        )
        const normalizeProfiles = new NormalizeProfilesNode(
            this.taskService,
            this.providerService,
            this.modelService,
            this.promptService
        )
        const saveResults = new SaveResultsNode(
            this.taskService,
            this.providerService,
            this.modelService,
            this.promptService
        )

        // Define graph structure
        const graph = {
            'initialize_run': {
                node: initializeRun,
                next: ['load_profiles']
            },
            'load_profiles': {
                node: loadProfiles,
                next: ['normalize_profiles']
            },
            'normalize_profiles': {
                node: normalizeProfiles,
                next: ['save_results']
            },
            'save_results': {
                node: saveResults,
                next: ['END']
            }
        }

        // Create and return the graph implementation
        return createLangGraphAgentGraph(
            graph,
            'initialize_run',
            this.taskService,
            this.providerService,
            this.modelService,
            this.promptService
        )
    }

    /**
     * Generates LangGraph configuration for visualization and debugging
     * @returns LangGraph configuration object
     */
    protected generateLangGraphConfig(): LangGraphConfig {
        const nodes = [
            {
                id: 'initialize_run',
                type: 'InitializeRunNode',
                next: ['load_profiles'],
                data: {
                    description: 'Initializes the normalization run and sets up directories',
                    input_type: 'void',
                    output_type: 'void'
                }
            },
            {
                id: 'load_profiles',
                type: 'LoadProfilesNode',
                next: ['normalize_profiles'],
                data: {
                    description: 'Loads and processes PDF files from input directory',
                    input_type: 'string',
                    output_type: 'BaseProfile[]'
                }
            },
            {
                id: 'normalize_profiles',
                type: 'NormalizeProfilesNode',
                next: ['save_results'],
                data: {
                    description: 'Normalizes profile data using LLM',
                    input_type: 'BaseProfile[]',
                    output_type: 'NormalizedProfile[]'
                }
            },
            {
                id: 'save_results',
                type: 'SaveResultsNode',
                next: ['END'],
                data: {
                    description: 'Saves normalized profiles and results to disk',
                    input_type: 'NormalizedProfile[]',
                    output_type: 'void'
                }
            }
        ]

        const edges: LangGraphEdge[] = [
            {
                from: 'initialize_run',
                to: 'load_profiles',
                conditions: [
                    {
                        field: 'status.overallStatus',
                        operator: 'eq',
                        value: 'running'
                    }
                ]
            },
            {
                from: 'load_profiles',
                to: 'normalize_profiles',
                conditions: [
                    {
                        field: 'agentState.profiles.length',
                        operator: 'gt',
                        value: 0
                    }
                ]
            },
            {
                from: 'normalize_profiles',
                to: 'save_results',
                conditions: [
                    {
                        field: 'agentState.normalizedProfiles.length',
                        operator: 'gt',
                        value: 0
                    }
                ]
            },
            {
                from: 'save_results',
                to: 'END'
            }
        ]

        return {
            nodes,
            edges,
            start_node_id: 'initialize_run'
        }
    }

    /**
     * Runs the normalization process
     * @param input Input parameters for the agent
     * @param config Optional graph configuration
     * @returns Final state after normalization
     */
    public async run(input: NormalizingInput, config?: AgentGraphConfig): Promise<NormalizingAgentState> {
        return super.run(input, config)
    }
} 