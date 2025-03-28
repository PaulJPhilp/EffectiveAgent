import fs from 'node:fs'
import path from 'node:path'
import { ModelService } from '../../../shared/services/model/modelService.js'
import { PromptService } from '../../../shared/services/prompt/promptService.js'
import type { IProviderService } from '../../../shared/services/provider/types.js'
import { TaskService } from '../../../shared/services/task/taskService.js'
import { AgentNode } from '../../agent-service/AgentNode.js'
import type { AgentState } from '../../agent-service/types.js'
import type { PersonaDomainState, PersonaInput, PersonaOutput } from '../types.js'

/**
 * Node that initializes a new persona generation run
 */
export class InitializeRunNode extends AgentNode<AgentState<PersonaInput, PersonaOutput, PersonaDomainState>> {
    constructor(
        taskService: TaskService,
        providerService: IProviderService,
        modelService: ModelService,
        promptService: PromptService
    ) {
        super(taskService, providerService, modelService, promptService)
    }

    async execute(state: AgentState<PersonaInput, PersonaOutput, PersonaDomainState>): Promise<AgentState<PersonaInput, PersonaOutput, PersonaDomainState>> {
        try {
            // Set up run directories
            const outputDir = this.setupRunDirectories(state.agentRun.runId, state.config)

            return {
                ...state,
                status: {
                    ...state.status,
                    overallStatus: 'running',
                    nodeHistory: [
                        ...state.status.nodeHistory,
                        {
                            nodeId: 'initialize_run',
                            status: 'completed',
                            timestamp: new Date().toISOString()
                        }
                    ]
                },
                agentRun: {
                    ...state.agentRun,
                    outputDir,
                    inputDir: state.config.inputPath
                }
            }
        } catch (error) {
            return {
                ...state,
                status: {
                    ...state.status,
                    overallStatus: 'error',
                    nodeHistory: [
                        ...state.status.nodeHistory,
                        {
                            nodeId: 'initialize_run',
                            status: 'error',
                            error: error instanceof Error ? error.message : 'Unknown error during initialization',
                            timestamp: new Date().toISOString()
                        }
                    ]
                },
                errors: {
                    ...state.errors,
                    errors: [...state.errors.errors, error instanceof Error ? error.message : 'Unknown error during initialization'],
                    errorCount: state.errors.errorCount + 1
                }
            }
        }
    }

    private setupRunDirectories(runId: string, config: any): string {
        const baseDir = path.join(config.outputPath, config.name, 'runs', runId)

        // Create main run directory
        fs.mkdirSync(baseDir, { recursive: true })

        // Create standard agent directories
        const dirs = ['logs', 'errors']
        for (const dir of dirs) {
            fs.mkdirSync(path.join(baseDir, dir), { recursive: true })
        }

        return baseDir
    }
} 