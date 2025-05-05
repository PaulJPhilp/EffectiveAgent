import { AgentRecord, AgentRuntimeId } from "@/agent-runtime/index.js"
import { Effect, Stream } from "effect"
import { ValidationError } from "./errors.js"
import type { RecordQueryOptions } from "./service.js"

/**
 * Error thrown when a database operation fails
 */
export class DatabaseError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options)
        this.name = "DatabaseError"
    }
}

/**
 * Database tables
 */
export interface AgentStoreSchema {
    agentRecords: AgentRecord
}

/**
 * Dexie database type
 */
export type AgentStoreDb = Dexie & {
    agentRecords: Dexie.Table<AgentRecord, string>
}

/**
 * Store service effect tag
 */
export const StoreEffect = Effect.Tag<StoreService>()

/**
 * Interface for the store service
 */
export interface StoreService {
    /** Store a single record */
    readonly storeRecord: (
        record: AgentRecord
    ) => Effect.Effect<void, ValidationError | DatabaseError>

    /** Store multiple records */
    readonly storeRecords: (
        records: AgentRecord[]
    ) => Effect.Effect<void, ValidationError | DatabaseError>

    /** Get records for an agent runtime */
    readonly getRecords: (
        agentRuntimeId: AgentRuntimeId,
        options?: RecordQueryOptions
    ) => Effect.Effect<readonly AgentRecord[], DatabaseError>

    /** Stream records for an agent runtime */
    readonly streamRecords: (
        agentRuntimeId: AgentRuntimeId
    ) => Stream.Stream<AgentRecord, DatabaseError>

    /** Clear records for an agent runtime */
    readonly clearRecords: (
        agentRuntimeId: AgentRuntimeId
    ) => Effect.Effect<void, DatabaseError>
}

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
 * Represents a stored agent record in the database
 */
export interface StoredAgentRecord {
    readonly id: string
    readonly agentRuntimeId: string
    readonly metadata: RecordMetadata
    readonly data: unknown
}