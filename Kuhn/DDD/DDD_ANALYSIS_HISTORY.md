# DDD Analysis: History (Ledger)

**Status:** V3 (Finalized)
**Layer:** Substrate (Infrastructure)
**Role:** The Authoritative Source of Truth (Ledger)

---

## 1. Executive Summary
The **History Bounded Context** is the immutable, time-ordered ledger of all significant occurrences within Kuhn. It serves as the "Memory of the System" for audit, replay, and event-driven choreography. It captures **What Happened**.

**Strategic Refinements (V3):**
*   **Service Pattern:** Implemented as a first-class `HistoryService` (OHS).
*   **Runtime:** Executed solely within the `Cortex` runtime.
*   **Error Taxonomy:** Strictly typed errors (no generic 500s).
*   **Indexing:** `Get(eventId)` is constrained to recent windows/best-effort.

## 2. Ubiquitous Language

*   **History:** The Bounded Context itself (was Trace).
*   **Event:** An immutable, typed record of a domain occurrence (Business Value).
*   **Stream:** A logical, strictly ordered sequence of Events (e.g., `mind-123`).
*   **Cursor:** An opaque pointer to a specific position in a Stream.
*   **Offset:** The monotonic index (0, 1, 2...) of an Event within a Stream.
*   **Envelope:** The standard container wrapping the payload.

## 3. Invariants & Policies

1.  **Immutability:** History is never rewritten. Corrections require compensatory events.
2.  **Strict Ordering:** Events in a stream are strictly monotonic.
3.  **Causal Consistency:** Timestamps must respect causality (Hybrid Logical Clocks).
4.  **Optimistic Concurrency:** Writers must acknowledge the last known state.
5.  **Privacy by Design:** PII is encrypted. Deletion via Crypto-shredding.

## 4. Published Language (The Contract)

### Core Schema
```typescript
interface Envelope<T = unknown> {
  readonly id: EventId;          // Idempotency Key
  readonly type: string;         // e.g., "mind.decision.v1"
  readonly streamId: StreamId;
  readonly offset: number;       // Assigned by Ledger
  readonly timestamp: Timestamp; // HLC
  readonly correlationId: TraceId;
  readonly causationId: EventId;
  readonly principalId: PrincipalId;
  readonly tenantId: TenantId;
  readonly payload: T;
  readonly metadata: Record<string, string>;
}

type HistoryError =
  | VersionConflictError
  | SealedStreamError
  | DuplicateEventError
  | QuotaExceededError
  | AuthzDeniedError;
```

### Service Interface (OHS)
*   `append(streamId, events[], expectedOffset?) -> Effect<void, HistoryError>`
*   `seal(streamId) -> Effect<void, HistoryError>`
*   `read(streamId, fromOffset, limit) -> Effect<Envelope[], HistoryError>`
*   `tail(streamId) -> Stream<Envelope, HistoryError>`
*   `get(eventId) -> Effect<Option<Envelope>, HistoryError>`

## 5. Integration Patterns

*   **Upstream (Producers):**
    *   **Agents/Minds/Cortex:** Emit events to History.
    *   Must buffer/retry (Outbox Pattern).
*   **Downstream (Consumers):**
    *   **WorkingMemory:** Materializes views from History events.
    *   **Observability:** Indexes events for search.

## 6. Strategic Boundaries

*   **History vs. WorkingMemory:**
    *   History = The Log (Write-heavy, Append-only).
    *   WorkingMemory = The State (Read-heavy, Mutable).
*   **History vs. Logs:**
    *   Events = Durable, Auditable, Business Value.
    *   Logs = Ephemeral, Operational Value.

## 7. Open Questions (Resolved)
1.  **Retention:** Domain Events = Infinite (Tiered Storage).
2.  **Privacy:** Crypto-shredding.
3.  **Indexing:** Primary = Stream/Offset. Secondary = EventId.
