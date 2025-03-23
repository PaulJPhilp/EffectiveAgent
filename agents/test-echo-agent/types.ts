import type { RunConfig } from '../types';

/**
 * Agent status type
 */
export type AgentStatus =
    | 'initializing'
    | 'processing'
    | 'completing'
    | 'completed'
    | 'error';

/**
 * Agent state interface
 */
export interface State {
    readonly runInfo: RunConfig;
    readonly status: AgentStatus;
    readonly input: string;
    readonly output: string;
    readonly error?: Error;
}