import { AgentRuntimeId } from "@/agent-runtime/types.js";
import { EffectiveError } from "@/errors.js";

/**
 * Base error class for BridgeService errors
 */
/**
 * Base error class for BridgeService errors.
 * @extends EffectiveError
 * @property {string} description - Human-readable error description.
 * @property {string} method - Name of the method where the error occurred.
 * @property {unknown} [cause] - Optional underlying cause of the error.
 */
export class BridgeServiceError extends EffectiveError {
    /**
     * @param {object} params
     * @param {string} params.description - Human-readable error description.
     * @param {string} params.method - Name of the method where the error occurred.
     * @param {unknown} [params.cause] - Optional underlying cause of the error.
     */
    constructor(params: {
        description: string;
        method: string;
        cause?: unknown;
    }) {
        super({
            ...params,
            module: "BridgeService"
        });
    }
}

/**
 * Error thrown when an agent runtime is not found
 */
/**
 * Error thrown when an agent runtime is not found.
 * @extends BridgeServiceError
 * @property {AgentRuntimeId} runtimeId - The missing agent runtime's ID.
 * @property {string} method - Name of the method where the error occurred.
 * @property {unknown} [cause] - Optional underlying cause of the error.
 */
export class BridgeRuntimeNotFoundError extends BridgeServiceError {
    /**
     * @param {object} params
     * @param {AgentRuntimeId} params.runtimeId - The missing agent runtime's ID.
     * @param {string} params.method - Name of the method where the error occurred.
     * @param {unknown} [params.cause] - Optional underlying cause of the error.
     */
    constructor(params: {
        runtimeId: AgentRuntimeId;
        method: string;
        cause?: unknown;
    }) {
        super({
            description: `Agent runtime with ID ${params.runtimeId} not found`,
            method: params.method,
            cause: params.cause
        });
    }
}

/**
 * Error thrown when creating an agent runtime fails
 */
/**
 * Error thrown when creating an agent runtime fails.
 * @extends BridgeServiceError
 * @property {string} method - Name of the method where the error occurred.
 * @property {unknown} [cause] - Optional underlying cause of the error.
 */
export class BridgeRuntimeCreationError extends BridgeServiceError {
    /**
     * @param {object} params
     * @param {string} params.method - Name of the method where the error occurred.
     * @param {unknown} [params.cause] - Optional underlying cause of the error.
     */
    constructor(params: {
        method: string;
        cause?: unknown;
    }) {
        super({
            description: "Failed to create agent runtime",
            method: params.method,
            cause: params.cause
        });
    }
}

/**
 * Error thrown when sending a message to an agent runtime fails
 */
/**
 * Error thrown when sending a message to an agent runtime fails.
 * @extends BridgeServiceError
 * @property {AgentRuntimeId} runtimeId - The agent runtime's ID.
 * @property {string} message - The message that failed to send.
 * @property {string} method - Name of the method where the error occurred.
 * @property {unknown} [cause] - Optional underlying cause of the error.
 */
export class BridgeMessageSendError extends BridgeServiceError {
    /**
     * @param {object} params
     * @param {AgentRuntimeId} params.runtimeId - The agent runtime's ID.
     * @param {string} params.message - The message that failed to send.
     * @param {string} params.method - Name of the method where the error occurred.
     * @param {unknown} [params.cause] - Optional underlying cause of the error.
     */
    constructor(params: {
        runtimeId: AgentRuntimeId;
        message: string;
        method: string;
        cause?: unknown;
    }) {
        super({
            description: `Failed to send message to agent runtime ${params.runtimeId}: ${params.message}`,
            method: params.method,
            cause: params.cause
        });
    }
}

/**
 * Error thrown when subscribing to an agent runtime fails
 */
/**
 * Error thrown when subscribing to an agent runtime fails.
 * @extends BridgeServiceError
 * @property {AgentRuntimeId} runtimeId - The agent runtime's ID.
 * @property {string} method - Name of the method where the error occurred.
 * @property {unknown} [cause] - Optional underlying cause of the error.
 */
export class BridgeSubscriptionError extends BridgeServiceError {
    /**
     * @param {object} params
     * @param {AgentRuntimeId} params.runtimeId - The agent runtime's ID.
     * @param {string} params.method - Name of the method where the error occurred.
     * @param {unknown} [params.cause] - Optional underlying cause of the error.
     */
    constructor(params: {
        runtimeId: AgentRuntimeId;
        method: string;
        cause?: unknown;
    }) {
        super({
            description: `Failed to subscribe to agent runtime ${params.runtimeId}`,
            method: params.method,
            cause: params.cause
        });
    }
}

/**
 * Error thrown when terminating an agent runtime fails
 */
/**
 * Error thrown when terminating an agent runtime fails.
 * @extends BridgeServiceError
 * @property {AgentRuntimeId} runtimeId - The agent runtime's ID.
 * @property {string} method - Name of the method where the error occurred.
 * @property {unknown} [cause] - Optional underlying cause of the error.
 */
export class BridgeTerminationError extends BridgeServiceError {
    /**
     * @param {object} params
     * @param {AgentRuntimeId} params.runtimeId - The agent runtime's ID.
     * @param {string} params.method - Name of the method where the error occurred.
     * @param {unknown} [params.cause] - Optional underlying cause of the error.
     */
    constructor(params: {
        runtimeId: AgentRuntimeId;
        method: string;
        cause?: unknown;
    }) {
        super({
            description: `Failed to terminate agent runtime ${params.runtimeId}`,
            method: params.method,
            cause: params.cause
        });
    }
}

/**
 * Error thrown when getting the state of an agent runtime fails
 */
/**
 * Error thrown when getting the state of an agent runtime fails.
 * @extends BridgeServiceError
 * @property {AgentRuntimeId} runtimeId - The agent runtime's ID.
 * @property {string} method - Name of the method where the error occurred.
 * @property {unknown} [cause] - Optional underlying cause of the error.
 */
export class BridgeStateError extends BridgeServiceError {
    /**
     * @param {object} params
     * @param {AgentRuntimeId} params.runtimeId - The agent runtime's ID.
     * @param {string} params.method - Name of the method where the error occurred.
     * @param {unknown} [params.cause] - Optional underlying cause of the error.
     */
    constructor(params: {
        runtimeId: AgentRuntimeId;
        method: string;
        cause?: unknown;
    }) {
        super({
            description: `Failed to get state of agent runtime ${params.runtimeId}`,
            method: params.method,
            cause: params.cause
        });
    }
}
