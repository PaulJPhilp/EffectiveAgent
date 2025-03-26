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
        // Set up run directories
        const outputDir = this.setupRunDirectories(state.agentRun.runId, state.config)

        return {
            ...state,
            status: {
                ...state.status,
                overallStatus: 'running'
            },
            agentRun: {
                ...state.agentRun,
                outputDir,
                inputDir: state.config.inputPath
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