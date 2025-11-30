# DDD Analysis: Episode (Envelope)

**Status:** V2 (Finalized)
**Layer:** Runtime (Execution)
**Role:** The Resource Envelope & Context Container

---

## 1. Executive Summary
The **Episode Bounded Context** acts as the bounded experience envelope. It binds a **Principal** (Identity) to a set of **Resources** (Time, Budget, Tokens). It manages the **Context Window** (Short-term Memory) via compaction/summarization policies. It represents **One Run** of an Agent.

**Strategic Refinements (V2):**
*   **Budget Enforcement:** In-path Token Bucket throttling (Fail-Closed).
*   **Durable Resume:** Checkpointing + Single-Active constraint via Fencing Tokens.
*   **Context Policy:** Episode owns Summarization/Sliding Window logic.
*   **Telemetry:** OTel Gen-AI Agent Semantics.

## 2. Ubiquitous Language

*   **Episode:** The Bounded Context itself (was Session).
*   **Envelope:** The running instance of an Episode.
*   **Context:** The transient state (Short-term Memory) available to the Episode.
*   **Budget:** The limits (Micro-USD, Tokens, Ops) allocated.
*   **Checkpoint:** A serialized state snapshot allowing resume.
*   **Compaction:** The strategy for managing Context Window overflow.

## 3. Invariants & Policies

1.  **Isolation:** Episodes are strictly isolated. They cannot share mutable state directly (only via WorkingMemory).
2.  **Bounded:** Every Episode MUST have a Budget and TTL. Infinite runs are forbidden.
3.  **Single-Threaded:** An Episode has exactly ONE active execution thread.
4.  **Cleanup:** Active GC Sweeper + Passive TTL ensures resource reclamation.
5.  **Fail-Closed Budget:** If budget check fails or is exhausted, execution halts.

## 4. Published Language (The Contract)

### Core Schema
```typescript
interface EpisodeConfig {
  readonly principalId: PrincipalId;
  readonly tenantId: TenantId;
  readonly budget: {
    readonly maxCost: number; // Micro-USD
    readonly maxDuration: Duration;
  };
  readonly contextPolicy: 'sliding_window' | 'summary';
}

interface EpisodeCheckpoint {
  readonly episodeId: EpisodeId;
  readonly offset: number; // History Offset
  readonly contextHash: string;
  readonly budgetConsumed: number;
  readonly timestamp: Timestamp;
}

interface UsageReport {
  readonly episodeId: EpisodeId;
  readonly cost: number;
  readonly duration: Duration;
  readonly tokens: { input: number; output: number };
}
```

### Service Interface (OHS)
*   `start(config) -> Effect<EpisodeId, EpisodeError>`
*   `resume(episodeId, fenceToken) -> Effect<void, EpisodeError>`
*   `suspend(episodeId) -> Effect<EpisodeCheckpoint, EpisodeError>`
*   `terminate(episodeId, reason) -> Effect<UsageReport, EpisodeError>`
*   `getContext(episodeId) -> Effect<Context, EpisodeError>`

## 5. Integration Patterns

*   **Upstream (Consumers):**
    *   **Agent:** Runs *within* an Episode.
    *   **API:** Wraps user requests in an Episode.
*   **Downstream (Infrastructure):**
    *   **Identity:** Resolves the Principal.
    *   **Rules:** Enforces Budget limits (PEP).
    *   **WorkingMemory:** Stores Episode State (Ephemeral) + Checkpoints.
    *   **History:** Records Lifecycle events (OTel Spans).

## 6. Strategic Boundaries

*   **Episode vs. Agent:**
    *   Episode = The Container (Time/Budget).
    *   Agent = The Process (Workflow/Steps).
*   **Episode vs. History:**
    *   Episode holds *Transient* Context.
    *   History holds *Permanent* History.

## 7. Open Questions (Resolved)
1.  **Context Window:** Episode manages compaction/summary. Model is just the processor.
2.  **Suspension:** Supported via `Checkpoint` stored in WorkingMemory.
3.  **Concurrency:** Single-Threaded invariant enforced via Lease/Fencing.
4.  **Budget:** Micro-USD Token Bucket. Hard Stop on exhaustion.
