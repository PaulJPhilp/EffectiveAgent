/**
 * Message priority levels for the mailbox system.
 */
export const MessagePriority = {
    HIGH: 0,
    NORMAL: 1,
    LOW: 2,
    BACKGROUND: 3
};
/**
 * Creates a new AgentRuntimeId from a string.
 */
export const makeAgentRuntimeId = (id) => id;
/**
 * The type of activity being processed.
 * This helps determine how to handle the activity's payload.
 */
export const AgentActivityType = {
    COMMAND: "COMMAND",
    EVENT: "EVENT",
    QUERY: "QUERY",
    RESPONSE: "RESPONSE",
    ERROR: "ERROR",
    STATE_CHANGE: "STATE_CHANGE",
    SYSTEM: "SYSTEM"
};
/**
 * The type of record being processed by the agent runtime.
 * This helps determine how to handle the record's payload.
 */
export const AgentRecordType = {
    COMMAND: "COMMAND",
    EVENT: "EVENT",
    QUERY: "QUERY",
    RESPONSE: "RESPONSE",
    ERROR: "ERROR",
    STATE_CHANGE: "STATE_CHANGE",
    SYSTEM: "SYSTEM"
};
/**
 * The possible states an AgentRuntime can be in.
 */
export const AgentRuntimeStatus = {
    IDLE: "IDLE",
    PROCESSING: "PROCESSING",
    ERROR: "ERROR",
    TERMINATED: "TERMINATED"
};
//# sourceMappingURL=types.js.map