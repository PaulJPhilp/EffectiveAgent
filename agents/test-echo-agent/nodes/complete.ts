import type { RunnableFunc } from '@langchain/core/runnables';
import type { State } from '../types';
import { saveSummary } from '../../../shared/utils/fs';

/**
 * Complete node for finalizing agent run
 */
export const completeNode: RunnableFunc<State, State> = async (
    state: State
): Promise<State> => {
    const { runInfo, status, input, output } = state;
    
    await saveSummary({
        agentType: 'test-echo-agent',
        runId: runInfo.runId,
        summary: {
            runId: runInfo.runId,
            startTime: runInfo.startTime,
            endTime: new Date().toISOString(),
            status,
            input,
            output
        }
    });

    return {
        ...state,
        status: 'completed'
    };
};