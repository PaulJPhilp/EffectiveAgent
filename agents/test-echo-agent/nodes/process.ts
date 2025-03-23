import type { RunnableFunc } from '@langchain/core/runnables';
import type { State } from '../types';
import { saveOutput } from '../../../shared/utils/fs';

/**
 * Process node for echoing input with transformation
 */
export const processNode: RunnableFunc<State, State> = async (
    state: State
): Promise<State> => {
    try {
        const { runInfo, input } = state;
        const timestamp = new Date().toISOString();
        const output = `[${timestamp}] Echo: ${input}`;

        await saveOutput({
            agentType: 'test-echo-agent',
            runId: runInfo.runId,
            output
        });

        return {
            ...state,
            status: 'completing',
            output
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            ...state,
            status: 'error',
            error: new Error(`Process node failed: ${errorMessage}`)
        };
    }
};