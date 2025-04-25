// File: AgentNode.ts

import type { IModelService } from '@services/model/types.js';
import type { IPromptService } from '@services/prompt/types.js';
import type { IProviderService } from '@services/provider/types.js';
import type { ITaskService } from '@services/task/types.js';
import type { AgentGraphConfig } from './AgentGraph.js'; // Only need AgentGraphConfig
import type { AgentState } from './types.js';

/**
 * Abstract base class for a node within an agent execution graph.
 * Each node performs a specific unit of work, transforming the agent state.
 * Relies on dependency injection for necessary services.
 *
 * @template T The specific AgentState subtype handled by this node.
 */
export abstract class AgentNode<T extends AgentState<any, any, any>> {
    /** Controls internal debug logging within the node's execute method. */
    protected debug: boolean = false;

    /**
     * Constructs an AgentNode instance.
     * @param taskService Injected Task Service instance.
     * @param providerService Injected Provider Service instance.
     * @param modelService Injected Model Service instance.
     * @param promptService Injected Prompt Service instance.
     */
    constructor(
        protected readonly taskService: ITaskService,
        protected readonly providerService: IProviderService,
        protected readonly modelService: IModelService,
        protected readonly promptService: IPromptService,
    ) {
        // Constructor simply stores injected dependencies.
    }

    /**
     * Executes the node's core logic.
     * This method takes the current agent state and optional configuration,
     * performs its specific task (potentially using injected services),
     * and returns the updated agent state.
     *
     * Implementations should focus on modifying relevant parts of the state
     * (e.g., `output`, `agentState`) and return the complete state object.
     * Run-level metadata (logs, errors, status) is typically managed by the
     * AgentGraph runner calling this method.
     *
     * @param state The current agent state before execution.
     * @param config Optional configuration specific to this graph run.
     * @returns A Promise resolving to the updated agent state after execution.
     */
    abstract execute(state: T, config?: AgentGraphConfig): Promise<T>;

    /**
     * Enables or disables internal debug logging for this node instance.
     * @param enabled True to enable debug logging, false to disable.
     */
    public setDebug(enabled: boolean): void {
        this.debug = enabled;
    }
}
