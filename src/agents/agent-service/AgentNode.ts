import type { RunnableConfig } from '@langchain/core/runnables'
import { ModelService } from '@services/model/modelService.js'
import { PromptService } from '@services/prompt/promptService.js'
import { ProviderService } from '@services/provider/providerService.js'
import { TaskService } from '@services/task/taskService.js'
import type { AgentState } from './types.js'
import type { AgentGraphConfig } from './AgentGraph.ts'

/**
 * Base class for agent nodes
 */
export abstract class AgentNode<T extends AgentState<any, any, any>> {
    protected debug: boolean = false
    protected readonly taskService: TaskService
    protected readonly providerService: ProviderService
    protected readonly modelService: ModelService
    protected readonly promptService: PromptService

    constructor(
        taskService: TaskService,
        providerService: ProviderService,
        modelService: ModelService,
        promptService: PromptService
    ) {
        this.taskService = taskService
        this.providerService = providerService
        this.modelService = modelService
        this.promptService = promptService
    }

    /**
     * Executes the node's specific state transformations
     */
    abstract execute(state: T): Promise<T>

    /**
     * Converts AgentGraphConfig to RunnableConfig if needed for internal use
     */
    protected convertConfigToRunnableConfig(config?: AgentGraphConfig): RunnableConfig | undefined {
        if (!config) return undefined

        return {
            configurable: {
                ...config
            }
        }
    }

    /**
     * Creates a runnable function that handles the full node lifecycle
     */
    public runnable(): (state: T, config?: AgentGraphConfig) => Promise<T> {
        return async (state: T, config?: AgentGraphConfig): Promise<T> => {
            const startTime = new Date().toISOString()
            const runId = crypto.randomUUID()

            // Apply config overrides if provided
            const debugEnabled = config?.debug !== undefined ? config.debug : this.debug

            // Create run info for this node execution
            const agentRun = {
                ...state.agentRun,
                runId,
                startTime,
                description: `Executing ${this.constructor.name}`,
                completedSteps: [...(state.agentRun.completedSteps || [])]
            }

            try {
                if (debugEnabled) {
                    console.log(`[${this.constructor.name}] Starting run ${runId}`)
                }
                state.logs.logs.push(`Starting ${this.constructor.name}`)

                // Execute node's specific logic
                const nodeState = await this.execute(state)

                // Merge node state with run management state
                const result = {
                    ...nodeState,
                    agentRun: {
                        ...agentRun,
                        completedSteps: [...agentRun.completedSteps, this.constructor.name]
                    },
                    logs: {
                        ...nodeState.logs,
                        logs: [...nodeState.logs.logs, `Completed ${this.constructor.name}`],
                        logCount: nodeState.logs.logCount + 1
                    }
                }

                if (debugEnabled) {
                    console.log(`[${this.constructor.name}] Completed run ${runId}`)
                }

                return result

            } catch (error) {
                console.error(`[${this.constructor.name}] Error in run ${runId}:`, error)
                const errorMessage = error instanceof Error ? error.message : String(error)

                return {
                    ...state,
                    agentRun,
                    status: 'failed',
                    errors: {
                        ...state.errors,
                        errors: [...state.errors.errors, errorMessage],
                        errorCount: state.errors.errorCount + 1
                    },
                    logs: {
                        ...state.logs,
                        logs: [...state.logs.logs, `Error in ${this.constructor.name}: ${errorMessage}`],
                        logCount: state.logs.logCount + 1
                    }
                }
            }
        }
    }

    /**
     * Enables debug mode for detailed logging
     */
    public setDebug(enabled: boolean): void {
        this.debug = enabled
    }
} 