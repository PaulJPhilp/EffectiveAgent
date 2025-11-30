# DDD Analysis: WorkingMemory (State Store)

**Status:** V3 (Finalized)
**Layer:** Substrate (Infrastructure)
**Role:** The Governed Container for Mutable State

---

## 1. Executive Summary
The **WorkingMemory Bounded Context** acts as the "Virtual File System" for Kuhn. Unlike `History` (which records what happened), `WorkingMemory` manages the **Current State**. It provides a unified, governed interface for Key-Value pairs, Blobs (Files), and Vectors. It represents **What is True Now**.

**Strategic Refinements (V3):**
*   **Strict Write Modes:** Mutations MUST be either Provenanced (`sourceEventId`) OR Ephemeral (`ttl`).
*   **Mandatory Guards:** Mutations MUST provide a guard: Optimistic (`expectedVersion`) OR Coordinated (`leaseToken`).
*   **Blob/Vector Governance:** Blobs are content-addressed. Vectors have strict dimensionality/count quotas.

## 2. Ubiquitous Language

*   **WorkingMemory:** The Bounded Context itself (was Space).
*   **Namespace:** A subdivision within WorkingMemory (e.g., `mind-123/memory`).
*   **Key:** The address of a record.
*   **Value:** The current data at a Key.
*   **Blob:** A content-addressed, immutable binary object.
*   **Lease:** A distributed lock with a fencing token (Sequence Number).
*   **Projection:** A read-optimized view derived from the `History` ledger.

## 3. Invariants & Policies

1.  **Tenancy Isolation:** A Tenant can ONLY access their own WorkingMemory.
2.  **Strong Consistency:** Single-key operations (Get/Put) are strongly consistent.
3.  **Provenance XOR Ephemerality:** Every write must cite a `sourceEventId` (Durable) OR a `ttl` (Ephemeral).
4.  **Guard Requirement:** No blind writes. Must specify `expectedVersion` or `leaseToken`.
5.  **Quota Enforcement:** Writes fail if Namespace budget is exceeded.
6.  **Encryption at Rest:** All Values/Blobs are encrypted.

## 4. Published Language (The Contract)

### Core Schema
```typescript
interface MemoryRecord<T = unknown> {
  readonly key: MemoryKey;
  readonly value: T;
  readonly version: number;      // Optimistic Concurrency
  readonly lastModified: Timestamp;
  readonly sourceEventId?: EventId; // Provenance
  readonly type: "kv" | "blob_ref" | "vector";
  readonly metadata: Record<string, string>;
}

interface Lease {
  readonly key: MemoryKey;
  readonly token: FencingToken;  // Monotonic sequence number
  readonly owner: PrincipalId;
  readonly expiresAt: Timestamp;
}

type WriteMode = 
  | { kind: 'durable'; sourceEventId: EventId }
  | { kind: 'ephemeral'; ttl: Duration };

type WriteGuard =
  | { kind: 'cas'; expectedVersion: number }
  | { kind: 'fenced'; leaseToken: FencingToken }
  | { kind: 'create' }; // Only if not exists

type MemoryError =
  | NotFoundError
  | CasMismatchError      // Compare-And-Swap failure
  | FencingError          // Invalid Lease Token
  | QuotaExceededError
  | TenantMismatchError
  | ModeRequiredError;    // Missing WriteMode
```

### Service Interface (OHS)
*   `get<T>(namespace, key) -> Effect<Option<MemoryRecord<T>>, MemoryError>`
*   `put<T>(namespace, key, value, mode: WriteMode, guard: WriteGuard) -> Effect<void, MemoryError>`
*   `delete(namespace, key, guard: WriteGuard) -> Effect<void, MemoryError>`
*   `list(namespace, cursor, limit) -> Effect<{ items: MemoryRecord[], nextCursor }, MemoryError>`
*   `acquireLease(namespace, key, ttl) -> Effect<Lease, MemoryError>`
*   `renewLease(lease) -> Effect<Lease, MemoryError>`
*   `releaseLease(lease) -> Effect<void, MemoryError>`
*   `putBlob(stream) -> Effect<BlobRef, MemoryError>` (Content-Addressed)
*   `getBlob(ref) -> Effect<Stream, MemoryError>`

## 5. Integration Patterns

*   **Upstream (Consumers):**
    *   **Mind:** Uses `kv` for State, `vector` for Memory.
    *   **Episode:** Uses `kv` (Ephemeral) for context.
    *   **Agent:** Uses `Lease` for locking, `kv` for checkpointing.
*   **Downstream (Infrastructure):**
    *   **Search Index:** Subscribes to WorkingMemory/History to build kNN indexes.
    *   **Physical Storage:** Adapters for Redis/S3/Postgres.

## 6. Strategic Boundaries

*   **WorkingMemory vs. History:**
    *   WorkingMemory = `UPDATE users SET state = ...` (Mutable).
    *   History = `INSERT INTO user_events ...` (Immutable).
*   **WorkingMemory vs. Search:**
    *   WorkingMemory holds the *Data*.
    *   Search holds the *Index*.

## 7. Open Questions (Resolved)
1.  **Vectors:** WorkingMemory stores the raw vectors; Search Service (separate BC) handles `kNN`.
2.  **Event Sourcing:** Hybrid model validated. Core state is projected; ephemeral state is direct.
3.  **Lease Semantics:** Explicit fencing tokens required for all coordinated writes.
