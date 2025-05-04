
/**
 * Commands that can be sent to the AsyncOperationTaskEffector
 */
export const AsyncOperationCommand = {
    START_FETCH: "START_FETCH"
} as const;

export type AsyncOperationCommand = typeof AsyncOperationCommand[keyof typeof AsyncOperationCommand];

/**
 * Events emitted by the AsyncOperationTaskEffector
 */
export const AsyncOperationEventType = {
    FETCH_STARTED: "FETCH_STARTED",
    FETCH_SUCCEEDED: "FETCH_SUCCEEDED",
    FETCH_FAILED: "FETCH_FAILED"
} as const;

export type AsyncOperationEventType = typeof AsyncOperationEventType[keyof typeof AsyncOperationEventType];

/**
 * Status of the async operation
 */
export const AsyncOperationStatus = {
    IDLE: "IDLE",
    PENDING: "PENDING",
    SUCCESS: "SUCCESS",
    FAILURE: "FAILURE"
} as const;

export type AsyncOperationStatus = typeof AsyncOperationStatus[keyof typeof AsyncOperationStatus];

/**
 * State maintained by the AsyncOperationTaskEffector
 */
export interface AsyncOperationState {
    status: AsyncOperationStatus;
    inputUrl?: string;
    result?: unknown;
    error?: unknown;
}