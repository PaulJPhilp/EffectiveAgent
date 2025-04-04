Okay, Paul. Let's create the PRD for the `LongTermMemoryService`.

---

## Product Requirements Document: Long-Term Memory Service

**Version:** 1.0
**Date:** 2024-07-26
**Author:** T3 Chat (Assisted by Paul)

**1. Overview**

This document outlines the requirements for the `LongTermMemoryService`, a component of the Effect-based agent framework. This service provides a mechanism for storing and retrieving persistent, user-specific data that exists beyond the scope of a single conversation. Use cases include storing user preferences (e.g., preferred name, communication style) and accumulating knowledge relevant to a specific user (e.g., project details, learned facts). The service will leverage the framework's `RepositoryService` for persistence, ensuring data is scoped by `UserId` and stored in a structured manner. It is distinct from `ChatMemoryService` (for conversation history) and `FileService`/`AttachmentService` (for file handling).

**2. Goals**

*   **User-Scoped Persistence:** Provide reliable storage for data associated with specific users (`UserId`).
*   **Cross-Conversation Memory:** Ensure data persists across different conversations and agent interactions for the same user.
*   **Structured Storage:** Store data in a structured format (e.g., key-value pairs with typed values or defined entities) rather than unstructured blobs.
*   **Abstract Persistence:** Hide the underlying `RepositoryService` implementation details (e.g., specific database like SQLite/Postgres via Drizzle) from the agent author.
*   **Clear API:** Offer a simple, Effect-native API for setting, getting, listing, and deleting user-specific data entries.
*   **Type Safety:** Utilize Effect-TS and Zod where possible for defining data structures and handling errors.
*   **Integration:** Integrate seamlessly with `LoggingService`, `ConfigurationService`, and `RepositoryService`.
*   **Consistency:** Follow patterns established by other framework services.

**3. Non-Goals**

*   **Replacing `RepositoryService`:** This service is a specialized consumer of `RepositoryService`.
*   **Managing Chat History:** Handled by `ChatMemoryService`.
*   **Managing Files/Attachments:** Handled by `FileService` and `AttachmentService`.
*   **Complex Querying:** Initial focus is on CRUD operations based on `UserId` and a specific data `key`. Advanced querying across users or complex filtering is not a primary goal.
*   **Real-time Synchronization:** Does not provide real-time updates across different agent instances accessing the same user's memory (relies on standard request/response interaction).
*   **UI for Memory Management.**

**4. User Stories**

*   **As an Agent Author, I want to:**
    *   Store a user's preferred name (`key: "preferred_name"`, `value: "Benevolent Leader"`) associated with their `UserId`.
    *   Retrieve the user's preferred name later in the same or a different conversation.
    *   Store a piece of knowledge the user provided (`key: "project_alpha_naming_convention"`, `value: "{date}_{task}_{version}.txt"`).
    *   Retrieve that piece of knowledge when needed.
    *   Update a user's preference if they express a new one.
    *   List all stored preferences/knowledge items for a specific user.
    *   Delete an obsolete piece of knowledge for a user.
    *   Not need to write SQL or interact directly with the database/`RepositoryService`.
*   **As a Framework Maintainer, I want to:**
    *   Define the database schema (via Drizzle, managed by the `RepositoryService` implementation) for storing these user-specific data entries.
    *   Ensure the service correctly scopes data by `UserId`.
    *   Configure the specific `RepositoryService` implementation (e.g., SQLite, Postgres) via Layers.

**5. Functional Requirements**

*   **5.1. `ILongTermMemoryService` Interface & `LongTermMemoryService` Tag:**
    *   Define an `ILongTermMemoryService` interface using `Effect.Tag`.
*   **5.2. Core Data Structures (Zod Schemas & Types):**
    *   Define a schema for the data entity stored via `RepositoryService`. Let's call it `UserMemoryEntryData`.
    *   `UserMemoryEntryDataSchema`: `{ userId: z.string(), key: z.string(), value: z.unknown(), /* Or more specific: z.union([z.string(), z.number(), z.boolean(), z.record(z.unknown()), z.array(z.unknown())]) */ valueType: z.string().optional(), /* e.g., "string", "json", "number" */ metadata: z.record(z.unknown()).optional(), /* createdAt, updatedAt provided by BaseEntity */ }`.
        *   `userId` and `key` form a composite unique identifier for an entry.
        *   `value`: Stores the actual data. Using `z.unknown()` provides flexibility but requires careful handling during retrieval. Defining a union of supported types is safer.
        *   `valueType`: Optional hint for interpreting/validating the `value` on retrieval.
*   **5.3. Core Operations:**
    *   `set<T = unknown>(params: { userId: string, key: string, value: T, valueType?: string, metadata?: Record<string, unknown> }): Effect.Effect<void, DataValidationError | GenericMemoryError>`:
        *   Creates a new entry or updates an existing one identified by `userId` and `key`.
        *   Uses `RepositoryService.find` with criteria `{ userId, key }` to check existence.
        *   If exists, calls `RepositoryService.update` with the entry's ID and new data (`value`, `valueType`, `metadata`, `updatedAt`).
        *   If not exists, calls `RepositoryService.create` with the full `UserMemoryEntryData`.
        *   Input `value` might undergo basic validation or serialization based on `valueType`.
    *   `get<T = unknown>(params: { userId: string, key: string }): Effect.Effect<{ value: T, valueType?: string, metadata?: Record<string, unknown> }, PreferenceNotFoundError | GenericMemoryError>`:
        *   Retrieves the entry matching `userId` and `key`.
        *   Uses `RepositoryService.find` with criteria `{ userId, key }` (expecting one result).
        *   If found, returns the relevant fields (`value`, `valueType`, `metadata`).
        *   If not found (or `find` returns empty), fails with `PreferenceNotFoundError`.
        *   The caller might need to cast or validate the returned `value` based on `valueType` or prior knowledge, as the service returns `unknown` or the base union type by default unless a type `T` is asserted via generics (which isn't validated by the service itself).
    *   `list(params: { userId: string }): Effect.Effect<ReadonlyArray<{ key: string, value: unknown, valueType?: string, metadata?: Record<string, unknown> }>, GenericMemoryError>`:
        *   Retrieves all entries matching the `userId`.
        *   Uses `RepositoryService.find` with criteria `{ userId }`.
        *   Returns an array containing the `key`, `value`, `valueType`, and `metadata` for each entry.
    *   `delete(params: { userId: string, key: string }): Effect.Effect<void, PreferenceNotFoundError | GenericMemoryError>`:
        *   Finds the entry matching `userId` and `key` using `RepositoryService.find`.
        *   If found, calls `RepositoryService.delete` with the entry's ID.
        *   If not found, fails with `PreferenceNotFoundError`.
*   **5.4. Interaction with `RepositoryService`:**
    *   The service implementation translates its API calls (`set`, `get`, `list`, `delete`) into appropriate `RepositoryService` calls (`create`, `update`, `find`, `delete`) operating on `UserMemoryEntryData` entities.
    *   Relies on the configured `RepositoryService` Layer (e.g., providing a Drizzle/SQLite implementation).
    *   Maps `RepositoryService` errors (`EntityNotFoundError`, `DataValidationError`, `RepositoryError`) to `LongTermMemoryService` errors (`PreferenceNotFoundError`, `DataValidationError`, `GenericMemoryError`).
*   **5.5. Error Handling:**
    *   Define specific, typed error classes extending a base `MemoryError` (or a new `LongTermMemoryError` base):
        *   `DataValidationError`: Input data (`value`) is invalid or fails repository validation.
        *   `PreferenceNotFoundError`: `get` or `delete` called for a non-existent `userId`/`key` combination. Maps from `EntityNotFoundError`.
        *   `GenericMemoryError`: Underlying `RepositoryError` or other unexpected issues.
*   **5.6. Logging:**
    *   Integrate with `LoggingService` for operations, logging `userId`, `key`, and success/failure status. Avoid logging sensitive `value` content by default.
*   **5.7. Configuration:**
    *   May need configuration via `ConfigurationService` for the entity type/prefix used within `RepositoryService` if it manages multiple types (e.g., `memory.longterm.repository.entityType: "userMemoryEntry"`).

**6. Non-Functional Requirements**

*   **Performance:** `get`/`set`/`delete` performance depends heavily on the `RepositoryService` implementation and database indexing on `userId` and `key`. `list` performance depends on indexing on `userId`.
*   **Reliability:** Builds on the reliability of the underlying `RepositoryService`.
*   **Scalability:** Depends on the scalability of the `RepositoryService` backend. Storing structured data is generally scalable.
*   **Maintainability & Testability:** Code should be well-structured. Requires mocking `RepositoryService` for unit tests.

**7. API Design (Conceptual - Effect-TS)**

```typescript
import { Context, Data, Effect, Layer, ReadonlyArray } from "effect";
import { z } from "zod";
// Import other services: IRepositoryService, ILoggingService, ConfigurationService
import { type IRepositoryService, RepositoryService, type BaseEntity, type FindCriteria } from "../repository/repository-service"; // Adjust path
import { type ILoggingService, LoggingService } from "../logging/types"; // Adjust path
// import { type ConfigurationService } from "../configuration/configuration-service"; // Adjust path
import { type DataValidationError as RepoDataValidationError, type EntityNotFoundError as RepoEntityNotFoundError, type RepositoryError as RepoError } from "../repository/errors"; // Adjust path

// --- Data Structures ---

// Schema for the value stored. Using unknown for max flexibility, but requires care.
// A union is safer if possible: z.union([z.string(), z.number(), z.boolean(), z.record(z.unknown()), z.array(z.unknown())])
const memoryValueSchema = z.unknown();

// Schema for data stored via RepositoryService (per entry)
export const UserMemoryEntryDataSchema = z.object({
    userId: z.string(),
    key: z.string(),
    value: memoryValueSchema,
    valueType: z.string().optional(), // e.g., "string", "json", "number"
    metadata: z.record(z.unknown()).optional(),
});
export type UserMemoryEntryData = z.infer<typeof UserMemoryEntryDataSchema>;
export type UserMemoryEntryEntity = BaseEntity<UserMemoryEntryData>;

// Type for the result of get/list operations
export interface UserMemoryEntry<T = unknown> {
    readonly key: string;
    readonly value: T;
    readonly valueType?: string;
    readonly metadata?: Record<string, unknown>;
}

// --- Error Types ---

export type LongTermMemoryError = DataValidationError | PreferenceNotFoundError | GenericMemoryError;

export class DataValidationError extends Data.TaggedError("DataValidationError")<{
    readonly message: string;
    readonly cause?: unknown; // e.g., ZodError or RepoDataValidationError
}> {}

export class PreferenceNotFoundError extends Data.TaggedError("PreferenceNotFoundError")<{
    readonly userId: string;
    readonly key: string;
    readonly message: string;
    readonly cause?: RepoEntityNotFoundError;
}> {}

export class GenericMemoryError extends Data.TaggedError("GenericMemoryError")<{
    readonly message: string;
    readonly cause?: RepoError | unknown;
}> {}


// --- Service Interface ---

export interface ILongTermMemoryService {
    /** Sets (creates or updates) a memory entry for a user. */
    readonly set: <T = unknown>(params: {
        readonly userId: string;
        readonly key: string;
        readonly value: T;
        readonly valueType?: string;
        readonly metadata?: Record<string, unknown>;
    }) => Effect.Effect<void, DataValidationError | GenericMemoryError>;

    /** Gets a specific memory entry for a user. */
    readonly get: <T = unknown>(params: {
        readonly userId: string;
        readonly key: string;
    }) => Effect.Effect<UserMemoryEntry<T>, PreferenceNotFoundError | GenericMemoryError>;

    /** Lists all memory entries for a user. */
    readonly list: (params: {
        readonly userId: string;
    }) => Effect.Effect<ReadonlyArray<UserMemoryEntry<unknown>>, GenericMemoryError>; // Value is unknown here

    /** Deletes a specific memory entry for a user. */
    readonly delete: (params: {
        readonly userId: string;
        readonly key: string;
    }) => Effect.Effect<void, PreferenceNotFoundError | GenericMemoryError>;
}

// --- Service Tag ---

export class LongTermMemoryService extends Context.Tag("LongTermMemoryService")<
    LongTermMemoryService,
    ILongTermMemoryService
>() {}

// --- Example Implementation Snippet (Conceptual) ---
/*
export class LongTermMemoryServiceLive implements ILongTermMemoryService {
    constructor(
        // Specify the entity type for the repository if needed
        private readonly repository: IRepositoryService<UserMemoryEntryData>,
        private readonly logging: ILoggingService
    ) {}

    // Helper to find existing entry ID
    private findEntryId = (userId: string, key: string) =>
        this.repository.find({ userId, key }).pipe(
            Effect.map(results => results[0]?.id), // Get ID of the first match
            Effect.mapError(cause => new GenericMemoryError({ message: "Repository find failed during existence check", cause }))
        );

    set = <T = unknown>(params: { userId: string, key: string, value: T, valueType?: string, metadata?: Record<string, unknown> }) =>
        Effect.gen(function*(_) {
            const log = yield* _(this.logging.getLogger("LongTermMemoryService"));
            const existingId = yield* _(this.findEntryId(params.userId, params.key));

            const dataToSave = {
                value: params.value, // Consider serialization/validation based on valueType
                valueType: params.valueType,
                metadata: params.metadata,
            };

            if (existingId) {
                // Update existing
                yield* _(
                    this.repository.update(existingId, dataToSave).pipe(
                        Effect.mapError(error => // Map repo errors
                            error instanceof RepoDataValidationError ? new DataValidationError({ message: "Invalid data for update", cause: error }) :
                            error instanceof RepoEntityNotFoundError ? new PreferenceNotFoundError({ userId: params.userId, key: params.key, message: "Entry disappeared before update", cause: error }) : // Should be rare
                            new GenericMemoryError({ message: "Failed to update memory entry", cause: error })
                        ),
                        Effect.asVoid // Discard updated entity
                    )
                );
                yield* _(log.debug("Memory entry updated", { userId: params.userId, key: params.key }));
            } else {
                // Create new
                const fullData: UserMemoryEntryData = {
                    userId: params.userId,
                    key: params.key,
                    ...dataToSave
                };
                yield* _(
                    this.repository.create(fullData).pipe(
                        Effect.mapError(error => // Map repo errors
                            error instanceof RepoDataValidationError ? new DataValidationError({ message: "Invalid data for create", cause: error }) :
                            new GenericMemoryError({ message: "Failed to create memory entry", cause: error })
                        ),
                        Effect.asVoid // Discard created entity
                    )
                );
                yield* _(log.debug("Memory entry created", { userId: params.userId, key: params.key }));
            }
        });

    get = <T = unknown>(params: { userId: string, key: string }) =>
        Effect.gen(function*(_) {
            const results = yield* _(
                this.repository.find({ userId: params.userId, key: params.key }).pipe(
                    Effect.mapError(cause => new GenericMemoryError({ message: "Failed to retrieve memory entry", cause }))
                )
            );

            if (results.length === 0) {
                return yield* _(Effect.fail(new PreferenceNotFoundError({ userId: params.userId, key: params.key, message: "Memory entry not found" })));
            }
            const entity = results[0];
            return {
                key: entity.data.key,
                value: entity.data.value as T, // Caller assumes type T is correct
                valueType: entity.data.valueType,
                metadata: entity.data.metadata
            } satisfies UserMemoryEntry<T>;
        });


    list = (params: { userId: string }) =>
        Effect.gen(function*(_) {
            const entities = yield* _(
                this.repository.find({ userId: params.userId }).pipe(
                    Effect.mapError(cause => new GenericMemoryError({ message: "Failed to list memory entries", cause }))
                )
            );
            const entries = entities.map(entity => ({
                key: entity.data.key,
                value: entity.data.value, // Value remains unknown
                valueType: entity.data.valueType,
                metadata: entity.data.metadata
            }));
            return ReadonlyArray.fromIterable(entries);
        });

    delete = (params: { userId: string, key: string }) =>
        Effect.gen(function*(_) {
            const log = yield* _(this.logging.getLogger("LongTermMemoryService"));
            // Find first to get ID and check existence
            const results = yield* _(
                this.repository.find({ userId: params.userId, key: params.key }).pipe(
                    Effect.mapError(cause => new GenericMemoryError({ message: "Failed to find memory entry for deletion", cause }))
                )
            );

            if (results.length === 0) {
                return yield* _(Effect.fail(new PreferenceNotFoundError({ userId: params.userId, key: params.key, message: "Memory entry not found, cannot delete" })));
            }
            const entryId = results[0].id;

            yield* _(
                this.repository.delete(entryId).pipe(
                    Effect.mapError(error => // Map repo errors
                        error instanceof RepoEntityNotFoundError ? new PreferenceNotFoundError({ userId: params.userId, key: params.key, message: "Entry disappeared before delete", cause: error }) : // Should be rare
                        new GenericMemoryError({ message: "Failed to delete memory entry", cause: error })
                    )
                )
            );
            yield* _(log.debug("Memory entry deleted", { userId: params.userId, key: params.key }));
        });
}
*/
```

**8. Error Handling Summary**

*   Maps `RepositoryService` errors to `LongTermMemoryService` specific errors.
*   `DataValidationError` for invalid input/storage data.
*   `PreferenceNotFoundError` when specific `userId`/`key` isn't found for `get`/`delete`.
*   `GenericMemoryError` for other repository or unexpected issues.

**9. Configuration Summary**

*   Primarily relies on the configuration of the injected `RepositoryService` Layer.
*   May need an optional key like `memory.longterm.repository.entityType` if the `RepositoryService` implementation requires it.

**10. Open Questions / Future Considerations**

*   **Value Type Safety:** How strictly should the `value` field be typed? Using `unknown` is flexible but shifts the burden of validation/casting to the caller of `get`. Using a Zod union (`z.string() | z.number() | ... | z.record()`) within the service provides more safety but limits flexibility. Could `set` accept an optional Zod schema to validate against?
*   **Concurrency:** How to handle concurrent `set` operations on the same `userId`/`key`? The current `find` then `update`/`create` logic has a potential race condition. The `RepositoryService` might need to offer an atomic `upsert` operation, or database-level constraints/locking could be used.
*   **Listing Performance:** Listing all entries for a user might become slow if a user has many entries. Pagination or filtering options for `list` could be added later.

---

This PRD establishes the foundation for the `LongTermMemoryService`, focusing on user-scoped, structured data persistence using the existing `RepositoryService`.