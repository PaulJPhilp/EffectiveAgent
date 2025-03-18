import type { RunnableFunc } from '@langchain/core/runnables';
import type { StateDefinition } from '@langchain/langgraph';
import type { NormalizationState } from '../state';

/**
 * Node handler for initializing a normalization run
 * @param state Current normalization state
 * @returns Updated state with initialization complete
 */
export const initializeRunNode: RunnableFunc<NormalizationState, NormalizationState> = async (
  state: NormalizationState
): Promise<NormalizationState> => {
  return {
    ...state,
    status: 'loading',
  };
};
