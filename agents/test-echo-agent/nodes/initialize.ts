import type { RunnableFunc } from '@langchain/core/runnables';
import type { State } from '../types';
import { setupRunDirectories } from '../../../shared/utils/fs';

/**
 * Initialize node for setting up agent run
 */
export const initializeNode: RunnableFunc<State, State> = async (
    state: State
): Promise<State> => {
    const { runInfo } = state;
    const outputDir = await setupRunDirectories({
        agentType: 'test-echo-agent',
        runId: runInfo.runId
    });

    return {
        ...state,
        status: 'processing',
        runInfo: {
            ...runInfo,
            outputDir
        }
    };
};