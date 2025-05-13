/**
 * Configuration for message retention in the Bridge service
 */
export interface MessageRetentionConfig {
    /** Maximum number of messages to retain */
    maxMessages: number;
    /** Maximum age of messages in milliseconds */
    maxAgeMs: number;
}

/**
 * Default message retention configuration
 */
export const DEFAULT_RETENTION_CONFIG: MessageRetentionConfig = {
    maxMessages: 1000,
    maxAgeMs: 24 * 60 * 60 * 1000 // 24 hours
};

/**
 * Message in the bridge state
 */
export interface BridgeMessage {
    /** The message content */
    content: string;
    /** Timestamp when the message was added */
    timestamp: number;
    /** Monotonic sequence number */
    sequence: number;
}

/**
 * State for the Bridge service
 */
export interface BridgeState {
    /** Array of messages with metadata */
    messages: BridgeMessage[];
    /** Timestamp of last cleanup operation */
    lastCleanup: number;
    /** Message retention configuration */
    retention: MessageRetentionConfig;
}
