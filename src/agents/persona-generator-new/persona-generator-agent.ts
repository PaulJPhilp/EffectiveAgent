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

/**
 * Agent that generates personas from user profiles
 */
export class PersonaGeneratorAgent extends Agent<PersonaInput, PersonaOutput, PersonaDomainState> {
    constructor({ configPath }: { configPath: string }) {
        super({ configPath })
    }

    protected buildGraph(): AgentGraphImplementation<AgentState<PersonaInput, PersonaOutput, PersonaDomainState>> {
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
            'initialize': {
                node: initializeRun,
                next: ['load-profiles']
            },
            'load-profiles': {
                node: loadProfiles,
                next: ['cluster-personas']
            },
            'cluster-personas': {
                node: clusterPersonas,
                next: ['elaborate-personas']
            },
            'elaborate-personas': {
                node: elaboratePersonas,
                next: ['save-results']
            },
            'save-results': {
                node: saveResults,
                next: ['END']
            }
        }

        // Create and return the graph implementation
        return createLangGraphAgentGraph(
            graph,
            'initialize',
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
                    id: 'initialize',
                    type: 'initialize-run',
                    next: ['load-profiles'],
                    data: {
                        description: 'Initializes a new persona generation run',
                        input_type: 'PersonaInput',
                        output_type: 'void'
                    }
                },
                {
                    id: 'load-profiles',
                    type: 'load-profiles',
                    next: ['cluster-personas'],
                    data: {
                        description: 'Loads and validates user profiles',
                        input_type: 'void',
                        output_type: 'Profile[]'
                    }
                },
                {
                    id: 'cluster-personas',
                    type: 'cluster-personas',
                    next: ['elaborate-personas'],
                    data: {
                        description: 'Clusters similar profiles together',
                        input_type: 'Profile[]',
                        output_type: 'Cluster[]'
                    }
                },
                {
                    id: 'elaborate-personas',
                    type: 'elaborate-personas',
                    next: ['save-results'],
                    data: {
                        description: 'Elaborates clusters into detailed personas',
                        input_type: 'Cluster[]',
                        output_type: 'Persona[]'
                    }
                },
                {
                    id: 'save-results',
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
                    from: 'initialize',
                    to: 'load-profiles',
                    conditions: [
                        {
                            field: 'status.overallStatus',
                            operator: 'eq',
                            value: 'running'
                        }
                    ]
                },
                {
                    from: 'load-profiles',
                    to: 'cluster-personas',
                    conditions: [
                        {
                            field: 'agentState.profiles.length',
                            operator: 'gt',
                            value: 0
                        }
                    ]
                },
                {
                    from: 'cluster-personas',
                    to: 'elaborate-personas',
                    conditions: [
                        {
                            field: 'agentState.clusters.length',
                            operator: 'gt',
                            value: 0
                        }
                    ]
                },
                {
                    from: 'elaborate-personas',
                    to: 'save-results',
                    conditions: [
                        {
                            field: 'agentState.personas.length',
                            operator: 'gt',
                            value: 0
                        }
                    ]
                }
            ],
            start_node_id: 'initialize'
        }
    }

    async run(input: PersonaInput): Promise<AgentState<PersonaInput, PersonaOutput, PersonaDomainState>> {
        const graph = this.buildGraph()
        const initialState: AgentState<PersonaInput, PersonaOutput, PersonaDomainState> = {
            config: this.config,
            agentRun: {
                runId: crypto.randomUUID(),
                startTime: new Date().toISOString(),
                outputDir: '',
                inputDir: '',
                description: 'Persona generation run',
                completedSteps: []
            },
            status: {
                overallStatus: 'running',
                currentNode: '',
                nodeHistory: []
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
            output: {
                clusters: [],
                personas: []
            },
            agentState: {
                profiles: [],
                clusters: [],
                personas: []
            }
        }
        return await graph.runnable()(initialState)
    }
} 