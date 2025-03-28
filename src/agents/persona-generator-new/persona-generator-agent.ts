import { Agent, type LangGraphConfig } from '../agent-service/Agent.js'
import { type AgentGraphImplementation } from '../agent-service/AgentGraph.js'
import { createLangGraphAgentGraph } from '../agent-service/LangGraphAgentGraph.js'
import type { AgentState } from '../agent-service/types.js'
import { ClusterPersonasNode } from './nodes/cluster-personas.js'
import { ElaboratePersonasNode } from './nodes/elaborate-personas.js'
import { InitializeRunNode } from './nodes/initialize-run.js'
import { LoadProfilesNode } from './nodes/load-profiles.js'
import { SaveResultsNode } from './nodes/save-results.js'
import type { PersonaDomainState, PersonaInput, PersonaOutput } from './types.js'

export type PersonaGeneratorState = AgentState<PersonaInput, PersonaOutput, PersonaDomainState>

/**
 * Agent that generates personas from user profiles
 */
export class PersonaGeneratorAgent extends Agent<PersonaInput, PersonaOutput, PersonaDomainState> {
    constructor(agentName: string) {
        super(agentName)
        if (this.debug)console.log(`PersonaGeneratorAgent(${agentName})`)
    }

    protected buildGraph(): AgentGraphImplementation<PersonaGeneratorState> {
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

        const clusterPersonas = new ClusterPersonasNode(
            this.taskService,
            this.providerService,
            this.modelService,
            this.promptService
        )

        const elaboratePersonas = new ElaboratePersonasNode(
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

        // Create graph
        const graph = {
            'initialize_run': {
                node: initializeRun,
                next: ['load_profiles']
            },
            'load_profiles': {
                node: loadProfiles,
                next: ['cluster_personas']
            },
            'cluster_personas': {
                node: clusterPersonas,
                next: ['elaborate_personas']
            },
            'elaborate_personas': {
                node: elaboratePersonas,
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

    protected generateLangGraphConfig(): LangGraphConfig {
        return {
            nodes: [
                {
                    id: 'initialize_run',
                    type: 'initialize-run',
                    next: ['load_profiles'],
                    data: {
                        description: 'Initializes a new persona generation run',
                        input_type: 'PersonaInput',
                        output_type: 'void'
                    }
                },
                {
                    id: 'load_profiles',
                    type: 'load-profiles',
                    next: ['cluster_personas'],
                    data: {
                        description: 'Loads and validates user profiles',
                        input_type: 'void',
                        output_type: 'Profile[]'
                    }
                },
                {
                    id: 'cluster_personas',
                    type: 'cluster-personas',
                    next: ['elaborate_personas'],
                    data: {
                        description: 'Clusters similar profiles together',
                        input_type: 'Profile[]',
                        output_type: 'Cluster[]'
                    }
                },
                {
                    id: 'elaborate_personas',
                    type: 'elaborate-personas',
                    next: ['save_results'],
                    data: {
                        description: 'Elaborates clusters into detailed personas',
                        input_type: 'Cluster[]',
                        output_type: 'Persona[]'
                    }
                },
                {
                    id: 'save_results',
                    type: 'save-results',
                    next: ['END'],
                    data: {
                        description: 'Saves final personas and generates summary',
                        input_type: 'Persona[]',
                        output_type: 'void'
                    }
                }
            ],
            edges: [
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
                    to: 'cluster_personas',
                    conditions: [
                        {
                            field: 'agentState.profiles.length',
                            operator: 'gt',
                            value: 0
                        }
                    ]
                },
                {
                    from: 'cluster_personas',
                    to: 'elaborate_personas',
                    conditions: [
                        {
                            field: 'agentState.clusters.length',
                            operator: 'gt',
                            value: 0
                        }
                    ]
                },
                {
                    from: 'elaborate_personas',
                    to: 'save_results',
                    conditions: [
                        {
                            field: 'agentState.personas.length',
                            operator: 'gt',
                            value: 0
                        }
                    ]
                },
                {
                    from: 'save_results',
                    to: 'END'
                }
            ],
            start_node_id: 'initialize_run'
        }
    }

    public async run(input: PersonaInput): Promise<PersonaGeneratorState> {
        return super.run(input)
    }
} 