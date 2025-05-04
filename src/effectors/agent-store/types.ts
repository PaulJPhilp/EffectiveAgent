
/**
 * Represents the sync state of an agent record
 */
export type SyncState = "pending" | "synced" | "error"

/**
 * Metadata associated with an agent record
 */
export interface RecordMetadata {
    readonly timestamp: number
    readonly syncState: SyncState
    readonly lastError?: string
}

/**
 * Represents a stored agent record
 */
export interface AgentRecord {
    readonly id: string
    readonly effectorId: string
    readonly metadata: RecordMetadata
    readonly data: unknown
} 