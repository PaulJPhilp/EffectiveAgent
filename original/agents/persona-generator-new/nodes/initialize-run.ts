import fs from 'node:fs'
import path from 'node:path'
import { ModelService } from '../../../shared/services/model/modelService.js'
import { PromptService } from '../../../shared/services/prompt/promptService.js'
import type { IProviderService } from '../../../shared/services/provider/types.js'
import { TaskService } from '../../../shared/services/task/taskService.js'
import { AgentNode } from '../../agent-service/AgentNode.js'
import type { AgentState } from '../../agent-service/types.js'
import type { PersonaDomainState, PersonaInput, PersonaOutput, Profile } from '../types.js'
import { randomUUID } from 'node:crypto'

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
        this.debug = true
        if (this.debug) {
            console.log('InitializeRunNode constructor')
        }
    }

    async execute(state: AgentState<PersonaInput, PersonaOutput, PersonaDomainState>): Promise<AgentState<PersonaInput, PersonaOutput, PersonaDomainState>> {
        try {
            if (this.debug) {
                console.log('InitializeRunNode execute')
                console.log(JSON.stringify(state.agentState, null, 3))
                const profiles = this.loadProfiles(state.config.inputPath)
                console.log('Profiles:', profiles.length)
                state.agentState.profiles = profiles
            }
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
            if (this.debug) {
                console.log('InitializeRunNode execute error')
            }
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
        if (this.debug) {
            console.log('InitializeRunNode setupRunDirectories')
        }
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

    private loadProfile(personPath: string): Profile | null {
        if (this.debug) {
            console.log('InitializeRunNode loadProfile', personPath)
        }
        const files = fs.readdirSync(path.join(process.cwd(), personPath), { withFileTypes: true })
        if (files.length === 0) {
            return null
        }
        for (const file of files) {
            if (file.isFile() && file.name.endsWith('.txt')) {

                const content = fs.readFileSync(path.join(process.cwd(), personPath, file.name), "utf-8");
                return {
                    id: randomUUID(),
                    name: file.name,
                    bio: content,
                    interests: [],
                    skills: [],
                    traits: []
                };
            }
        }
        return null
    }

    private loadProfiles(inputDir: string): Profile[] {
        if (this.debug) {
            console.log('InitializeRunNode loadProfiles: ', inputDir)
        }
        const peopleFiles = fs.readdirSync(path.join(process.cwd(), inputDir), { withFileTypes: true })
        if (this.debug) {
            console.log('InitializeRunNode loadProfiles: ', peopleFiles.length)
        }
        if (this.debug) {
            //console.log('InitializeRunNode loadProfiles: ', JSON.stringify(peopleFiles, null, 2))
        }
        try {
            const profiles = peopleFiles.map(file => this.loadProfile(path.join(inputDir, file.name)))
            return profiles.filter((profile): profile is Profile => profile !== null)
        } catch (error) {
            if (this.debug) {
                console.log('InitializeRunNode loadProfiles error', error)
            }
            return []
        }
    }
}