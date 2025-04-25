// File: Agent.ts

import type { IModelService } from '@services/model/types.js';
import type { IPromptService } from '@services/prompt/types.js';
import type { IProviderService } from '@services/provider/types.js';
import type { ITaskService } from '@services/task/types.js';
import type {
    AgentGraphConfig,
    AgentGraphImplementation,
    GraphDefinition,
} from './AgentGraph.js';
import type {
    AgentConfig,
    AgentErrors,
    AgentLogs,
    AgentRun,
    AgentState,
    AgentStatus,
} from './types.js';

/**
 * Abstract base class for defining and running agent workflows.
 * Relies on dependency injection for services and configuration.
 *
 * @template I Input type for the agent run.
 * @template O Output type expected from the agent run.
 * @template A Agent-specific state type managed within the graph.
 */
export abstract class Agent<I, O, A> {
    /**
     * Constructs an Agent instance.
     * @param taskService Injected Task Service instance.
     * @param providerService Injected Provider Service instance.
     * @param modelService Injected Model Service instance.
     * @param promptService Injected Prompt Service instance.
     * @param agentConfig Injected validated Agent Configuration object.
     */
    constructor(
        protected readonly taskService: ITaskService,
        protected readonly providerService: IProviderService,
        protected readonly modelService: IModelService,
        protected readonly promptService: IPromptService,
        protected readonly agentConfig: AgentConfig,
    ) {
        // Constructor only assigns injected dependencies.
        // No complex logic, service creation, or config loading here.
    }

    /**
     * Defines the structure of the agent's execution graph.
     * This method should be implemented by concrete agent classes.
     * Note: While called in `run`, its primary use might be informational
     * or for graph implementations that require the definition upfront,
     * as the actual execution is delegated to the injected graphImplementation.
     */
    protected abstract buildGraphDefinition(): GraphDefinition<AgentState<I, O, A>>;

    /**
     * Specifies the starting node ID for the graph execution.
     * This method should be implemented by concrete agent classes.
     * Note: Similar to buildGraphDefinition, the injected graphImplementation
     * might manage the start node internally.
     */
    protected abstract getStartNodeId(): string;

    /**
     * Initializes the state object for a new agent run.
     * @param input The initial input data for the run.
     * @param agentState The initial agent-specific state data.
     * @returns The fully initialized AgentState object.
     */
    protected initializeRunState(input: I, agentState: A): AgentState<I, O, A> {
        const agentRun: AgentRun = {
            runId: crypto.randomUUID(),
            startTime: new Date().toISOString(),
            outputDir: this.agentConfig.outputPath,
            inputDir: this.agentConfig.inputPath,
            description: this.agentConfig.description, // Or a run-specific description
            completedSteps: [], // Initialize as empty
        };

        const status: AgentStatus = {
            overallStatus: 'running',
            nodeHistory: [],
            currentNode: undefined, // Will be set by the runner
        };

        const logs: AgentLogs = { logs: [], logCount: 0 };
        const errors: AgentErrors = { errors: [], errorCount: 0 };

        return {
            config: this.agentConfig,
            agentRun,
            status,
            logs,
            errors,
            input,
            output: {} as O, // Initialize output as an empty object
            agentState,
        };
    }

    /**
     * Creates a final state object representing a failed agent run.
     * @param currentState The state object just before or during the failure.
     * @param error The error message or description.
     * @returns A new AgentState object reflecting the error.
     */
    protected createErrorState(currentState: AgentState<I, O, A>, error: string): AgentState<I, O, A> {
        const errorTimestamp = new Date().toISOString();
        return {
            ...currentState, // Preserve config, input, agentState, potentially partial output/logs
            status: {
                ...currentState.status,
                overallStatus: 'error',
                // Add a generic error entry to history
                nodeHistory: [
                    ...currentState.status.nodeHistory,
                    {
                        nodeId: currentState.status.currentNode || 'agent-run', // Use current node if known, else generic
                        status: 'error',
                        error: error,
                        timestamp: errorTimestamp,
                    },
                ],
            },
            errors: {
                errors: [...currentState.errors.errors, error],
                errorCount: currentState.errors.errorCount + 1,
            },
            // Ensure agentRun reflects the attempt, even if it failed early
            agentRun: currentState.agentRun || { // Fallback if error happened before agentRun init (unlikely here)
                runId: crypto.randomUUID(),
                startTime: errorTimestamp,
                outputDir: this.agentConfig.outputPath,
                inputDir: this.agentConfig.inputPath,
                description: this.agentConfig.description,
                completedSteps: currentState.agentRun?.completedSteps || [],
            }
        };
    }


    /**
     * Executes the agent's defined workflow.
     *
     * @param input The initial input data for this run.
     * @param initialAgentState The starting agent-specific state for this run.
     * @param graphImplementation An instance of the graph runner (e.g., AgentGraph, LangGraphAgentGraph).
     * @param config Optional configuration for the graph execution run.
     * @returns A promise resolving to the final AgentState after execution.
     */
    public async run(
        input: I,
        initialAgentState: A,
        graphImplementation: AgentGraphImplementation<AgentState<I, O, A>>,
        config?: AgentGraphConfig,
    ): Promise<AgentState<I, O, A>> {
        // These calls might be primarily for informational purposes or specific
        // graph runners that need the definition upfront. The core execution
        // relies on the injected graphImplementation.
        this.buildGraphDefinition();
        this.getStartNodeId();

        // Initialize the state for this specific run
        const initialState = this.initializeRunState(input, initialAgentState);

        try {
            // Delegate execution entirely to the injected graph implementation
            const finalState = await graphImplementation.runnable()(
                initialState,
                config,
            );
            return finalState;
        } catch (error) {
            console.error(`[Agent] Run failed: ${error}`);
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Create and return a standardized error state
            return this.createErrorState(initialState, errorMessage);
        }
    }
}
