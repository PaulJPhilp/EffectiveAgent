/**
 * Base state interface for all agents
 */
export interface BaseState {
    readonly status: string;
    readonly error?: Error;
}

/**
 * Base task configuration
 */
export interface BaseTaskConfig {
    readonly name: string;
    readonly description: string;
    readonly version: string;
}

/**
 * Base node configuration
 */
export interface BaseNodeConfig {
    readonly timeout?: number;
    readonly retries?: number;
}
