import { Agent, type LangGraphConfig } from '../agent-service/Agent.js'
import type { AgentGraphConfig, AgentGraphImplementation } from '../agent-service/AgentGraph.js'
import { createLangGraphAgentGraph } from '../agent-service/LangGraphAgentGraph.js'
import type { AgentState } from '../agent-service/types.js'
import { CreateExecutiveSummariesNode } from './nodes/create-executive-summaries.js'
import { CreateFullProfilesNode } from './nodes/create-full-profiles.js'
import { ElaboratePersonaNode } from './nodes/elaborate-persona.js'
import { EvaluatePersonaNode } from './nodes/evaluate-persona.js'
import { InitializeRunNode } from './nodes/initialize-run.js'
import { SaveResultsNode } from './nodes/save-results.js'
import type { EvaluatorDomainState, EvaluatorInput, EvaluatorOutput } from './types.js'

/**
 * Agent that evaluates personas for completeness and quality
 */
export class PersonaEvaluatorAgent extends Agent<EvaluatorInput, EvaluatorOutput, EvaluatorDomainState> {
    constructor({ configPath }: { configPath: string }) {
        super({ configPath })
    }

    protected buildGraph(): AgentGraphImplementation<AgentState<EvaluatorInput, EvaluatorOutput, EvaluatorDomainState>> {
        // Create nodes
        const initializeRun = new InitializeRunNode(
            this.taskService,
            this.providerService,
            this.modelService,
            this.promptService
        )

        const elaboratePersona = new ElaboratePersonaNode(
            this.taskService,
            this.providerService,
            this.modelService,
            this.promptService
        )

        const evaluatePersona = new EvaluatePersonaNode(
            this.taskService,
            this.providerService,
            this.modelService,
            this.promptService
        )

        const createExecutiveSummaries = new CreateExecutiveSummariesNode(
            this.taskService,
            this.providerService,
            this.modelService,
            this.promptService
        )

        const createFullProfiles = new CreateFullProfilesNode(
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
                next: ['elaborate-persona']
            },
            'elaborate-persona': {
                node: elaboratePersona,
                next: ['evaluate-persona']
            },
            'evaluate-persona': {
                node: evaluatePersona,
                next: ['create-executive-summaries']
            },
            'create-executive-summaries': {
                node: createExecutiveSummaries,
                next: ['create-full-profiles']
            },
            'create-full-profiles': {
                node: createFullProfiles,
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
                    next: ['elaborate-persona'],
                    data: {
                        description: 'Initializes a new evaluation run',
                        input_type: 'EvaluatorInput',
                        output_type: 'void'
                    }
                },
                {
                    id: 'elaborate-persona',
                    type: 'elaborate-persona',
                    next: ['evaluate-persona'],
                    data: {
                        description: 'Elaborates the input persona with more details',
                        input_type: 'FullPersona',
                        output_type: 'ElaboratedPersona'
                    }
                },
                {
                    id: 'evaluate-persona',
                    type: 'evaluate-persona',
                    next: ['create-executive-summaries'],
                    data: {
                        description: 'Evaluates the elaborated persona',
                        input_type: 'ElaboratedPersona',
                        output_type: 'Evaluation'
                    }
                },
                {
                    id: 'create-executive-summaries',
                    type: 'create-executive-summaries',
                    next: ['create-full-profiles'],
                    data: {
                        description: 'Creates executive summaries',
                        input_type: 'ElaboratedPersona',
                        output_type: 'string'
                    }
                },
                {
                    id: 'create-full-profiles',
                    type: 'create-full-profiles',
                    next: ['save-results'],
                    data: {
                        description: 'Creates full profile documents',
                        input_type: 'ElaboratedPersona',
                        output_type: 'string'
                    }
                },
                {
                    id: 'save-results',
                    type: 'save-results',
                    next: ['END'],
                    data: {
                        description: 'Saves final results and generates summary',
                        input_type: 'void',
                        output_type: 'void'
                    }
                }
            ],
            edges: [
                {
                    from: 'initialize',
                    to: 'elaborate-persona',
                    conditions: [
                        {
                            field: 'status.overallStatus',
                            operator: 'eq',
                            value: 'running'
                        }
                    ]
                },
                {
                    from: 'elaborate-persona',
                    to: 'evaluate-persona',
                    conditions: [
                        {
                            field: 'agentState.elaboratedPersona',
                            operator: 'neq',
                            value: null
                        }
                    ]
                },
                {
                    from: 'evaluate-persona',
                    to: 'create-executive-summaries',
                    conditions: [
                        {
                            field: 'agentState.evaluation',
                            operator: 'neq',
                            value: null
                        }
                    ]
                },
                {
                    from: 'create-executive-summaries',
                    to: 'create-full-profiles',
                    conditions: [
                        {
                            field: 'agentState.executiveSummary',
                            operator: 'neq',
                            value: null
                        }
                    ]
                },
                {
                    from: 'create-full-profiles',
                    to: 'save-results',
                    conditions: [
                        {
                            field: 'agentState.fullProfile',
                            operator: 'neq',
                            value: null
                        }
                    ]
                }
            ],
            start_node_id: 'initialize'
        }
    }

    async run(input: EvaluatorInput, config?: AgentGraphConfig): Promise<AgentState<EvaluatorInput, EvaluatorOutput, EvaluatorDomainState>> {
        const graph = this.buildGraph()
        const initialState: AgentState<EvaluatorInput, EvaluatorOutput, EvaluatorDomainState> = {
            config: this.config,
            agentRun: {
                runId: crypto.randomUUID(),
                startTime: new Date().toISOString(),
                outputDir: input.outputDir,
                inputDir: input.inputDir,
                description: 'Persona evaluation run',
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
                evaluation: {
                    answer: 'no',
                    recommendation: ''
                },
                executiveSummary: '',
                fullProfile: '',
                summaryReport: '',
                summary: {
                    totalElaborations: 0,
                    finalEvaluation: '',
                    completedAt: ''
                }
            },
            agentState: {
                inputPersona: {},
                elaboratedPersona: {},
                evaluation: {},
                executiveSummary: '',
                fullProfile: '',
                summaryReport: '',
                elaborationCount: 0
            }
        }
        return await graph.runnable()(initialState, config)
    }
} 