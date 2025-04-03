import { Context, Data, Effect, ReadonlyArray } from "effect";
import { z } from "zod";

// Assuming RepositoryService errors are defined and accessible
import {
    type DataValidationError as RepoDataValidationError,
    type EntityNotFoundError as RepoEntityNotFoundError,
    type RepositoryError as RepoError,
} from "../repository/errors"; // Adjust path

// --- Data Structures ---

// Schema for the value stored. Using unknown for max flexibility.
// Consider replacing with a safer union if the set of types is known:
// const memoryValueSchema = z.union([z.string(), z.number(), z.boolean(), z.record(z.unknown()), z.array(z.unknown())]);
const memoryValueSchema = z.unknown();
type MemoryValue = z.infer<typeof memoryValueSchema>;

/**
 * Represents a retrieved long-term memory entry.
 * @template T The expected type of the value. Defaults to `unknown`.
 */
export interface UserMemoryEntry<T = MemoryValue> {
    /** The key identifying this memory entry for the user. */
    readonly key: string;
    /** The stored value. Type T is asserted by the caller via generics. */
    readonly value: T;
    /** Optional type hint for the value (e.g., "string", "json"). */
    readonly valueType?: string;
    /** Optional metadata associated with the entry. */
    readonly metadata?: Readonly<Record<string, unknown>>;
}

// --- Error Types ---

/** Union type for all errors potentially raised by LongTermMemoryService. */
export type LongTermMemoryError =
    | DataValidationError
    | PreferenceNotFoundError
    | GenericMemoryError;

/** Error indicating invalid data was provided or encountered during persistence. */
export class DataValidationError extends Data.TaggedError("DataValidationError")<{
    readonly message: string;
    readonly cause?: unknown; // e.g., ZodError or RepoDataValidationError
}> { }

/** Error indicating a specific preference/key was not found for the user. */
export class PreferenceNotFoundError extends Data.TaggedError(
    "PreferenceNotFoundError"
)<{
    readonly userId: string;
    readonly key: string;
    readonly message: string;
    readonly cause?: RepoEntityNotFoundError; // Optional underlying cause
}> { }

/** General error for repository issues or other unexpected failures. */
export class GenericMemoryError extends Data.TaggedError("GenericMemoryError")<{
    readonly message: string;
    readonly cause?: RepoError | unknown; // Underlying repository or other error
}> { }

// --- Service Interface ---

/**
 * Defines the contract for the LongTermMemoryService.
 * Manages persistent, user-scoped, key-value like data entries.
 */
export interface ILongTermMemoryService {
    /**
     * Sets (creates or updates) a memory entry for a specific user and key.
     *
     * @template T The type of the value being set.
     * @param params Parameters including userId, key, value, and optional type hints/metadata.
     * @returns An Effect that completes successfully (`void`) or fails with
     *          `DataValidationError` or `GenericMemoryError`.
     */
    readonly set: <T = MemoryValue>(params: {
        readonly userId: string;
        readonly key: string;
        readonly value: T;
        readonly valueType?: string;
        readonly metadata?: Readonly<Record<string, unknown>>;
    }) => Effect.Effect<void, DataValidationError | GenericMemoryError>;

    /**
     * Gets a specific memory entry for a user by key.
     *
     * @template T The expected type of the retrieved value. Defaults to `unknown`.
     *             The service does not validate the retrieved value against T;
     *             the caller is responsible for ensuring type correctness, potentially
     *             using the `valueType` hint.
     * @param params Parameters including userId and key.
     * @returns An Effect yielding a `UserMemoryEntry<T>` on success, or failing with
     *          `PreferenceNotFoundError` or `GenericMemoryError`.
     */
    readonly get: <T = MemoryValue>(params: {
        readonly userId: string;
        readonly key: string;
    }) => Effect.Effect<
        UserMemoryEntry<T>,
        PreferenceNotFoundError | GenericMemoryError
    >;

    /**
     * Lists all memory entries associated with a specific user.
     * Note: The `value` in the returned entries will be of type `unknown`.
     *
     * @param params Parameters including userId.
     * @returns An Effect yielding a readonly array of `UserMemoryEntry<unknown>` on success,
     *          or failing with `GenericMemoryError`.
     */
    readonly list: (params: {
        readonly userId: string;
    }) => Effect.Effect<
        ReadonlyArray<UserMemoryEntry<MemoryValue>>, // Value is unknown/base type here
        GenericMemoryError
    >;

    /**
     * Deletes a specific memory entry for a user by key.
     *
     * @param params Parameters including userId and key.
     * @returns An Effect that completes successfully (`void`) or fails with
     *          `PreferenceNotFoundError` or `GenericMemoryError`.
     */
    readonly delete: (params: {
        readonly userId: string;
        readonly key: string;
    }) => Effect.Effect<void, PreferenceNotFoundError | GenericMemoryError>;
}

// --- Service Tag ---

/**
 * Effect Tag for the LongTermMemoryService. Use this to specify the service
 * as a dependency in Effect layers and access it from the context.
 */
export class LongTermMemoryService extends Context.Tag(
    "LongTermMemoryService" // Consider namespacing like "@app/LongTermMemoryService"
)<LongTermMemoryService, ILongTermMemoryService>() { }
