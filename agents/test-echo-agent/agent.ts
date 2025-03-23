import { END, START, StateGraph } from '@langchain/langgraph';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { State } from './types';
import { createInitialState } from './state';
import { type ChannelReducer } from '../types';
import { initializeNode } from './nodes/initialize';
import { processNode } from './nodes/process';
import { completeNode } from './nodes/complete';

interface AgentStateChannels {
    readonly runInfo: ChannelReducer<State['runInfo']>;
    readonly status: ChannelReducer<State['status']>;
    readonly input: ChannelReducer<State['input']>;
    readonly output: ChannelReducer<State['output']>;
    readonly error: ChannelReducer<State['error']>;
}

/**
 * Agent implementation using LangGraph
 */
export class Agent {
    private readonly graph: ReturnType<typeof this.createGraph>;

    constructor() {
        this.graph = this.createGraph();
    }

    private createGraph() {
        const channels: AgentStateChannels = {
            runInfo: { reducer: (a, b) => ({ ...a, ...b }) },
            status: { reducer: (_, b) => b },
            input: { reducer: (_, b) => b },
            output: { reducer: (_, b) => b },
            error: { reducer: (_, b) => b }
        };

        const graph = new StateGraph<State>({ channels })
            .addNode('initialize', initializeNode)
            .addNode('process', processNode)
            .addNode('complete', completeNode)
            .addEdge('initialize', 'process')
            .addEdge('process', 'complete')
            .addEdge(START, 'initialize')
            .addEdge('complete', END);

        return graph.compile();
    }

    /**
     * Invokes the agent with input
     */
    async invoke(
        input: string,
        config?: RunnableConfig
    ): Promise<State> {
        try {
            const initialState = createInitialState();
            const state: State = {
                ...initialState,
                input,
                status: 'initializing'
            };
            const result = await this.graph.invoke(state, config);
            return {
                ...initialState,
                ...result
            } as State;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Agent execution failed: ${errorMessage}`);
        }
    }
}