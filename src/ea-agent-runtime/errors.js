import { EffectiveError } from "@/errors.js";
/**
 * Base error class for agent runtime related errors.
 */
export class AgentRuntimeError extends EffectiveError {
    agentRuntimeId;
    constructor(props) {
        super({
            description: props.message,
            module: "agent-runtime",
            method: "AgentRuntimeError",
            cause: props.cause
        });
        this.agentRuntimeId = props.agentRuntimeId;
    }
}
/**
 * Error thrown when an agent runtime instance is not found.
 */
export class AgentRuntimeNotFoundError extends AgentRuntimeError {
    constructor(props) {
        super({ ...props, message: props.message });
    }
}
/**
 * Error thrown when trying to interact with a terminated agent runtime.
 */
export class AgentRuntimeTerminatedError extends AgentRuntimeError {
    constructor(props) {
        super({ ...props, message: props.message });
    }
}
/**
 * Error thrown when a mailbox operation fails.
 */
export class MailboxError extends AgentRuntimeError {
    constructor(props) {
        super({ ...props, message: props.message });
    }
}
/**
 * Error thrown when the agent runtime is in an invalid state.
 */
export class InvalidStateError extends AgentRuntimeError {
    constructor(props) {
        super({ ...props, message: props.message });
    }
}
/**
 * Error thrown when there is a configuration issue with the agent runtime.
 */
export class ConfigurationError extends AgentRuntimeError {
    constructor(props) {
        super({ ...props, message: props.message });
    }
}
/**
 * Error thrown when there is an issue with the agent workflow processing.
 */
export class ProcessingError extends AgentRuntimeError {
    constructor(props) {
        super({ ...props, message: props.message });
    }
}
/**
 * Error thrown when message processing fails for a specific activity.
 */
export class AgentRuntimeProcessingError extends AgentRuntimeError {
    activityId;
    cause;
    constructor(props) {
        super(props);
        this.activityId = props.activityId;
        this.cause = props.cause;
    }
}
/**
 * Error thrown when there is an issue initializing the agent runtime.
 */
export class AgentRuntimeInitializationError extends EffectiveError {
    _tag = "AgentRuntimeInitializationError";
    constructor(params) {
        super(params);
    }
}
//# sourceMappingURL=errors.js.map