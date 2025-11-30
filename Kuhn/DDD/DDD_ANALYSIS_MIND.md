# DDD Analysis: Mind (Agent)

**Status:** V2 (Finalized)
**Layer:** Runtime (Execution)
**Role:** The Persistent Agent Identity & Memory

---

## 1. Executive Summary
The **Mind Bounded Context** represents the persistent "Self" of an AI Agent. It encapsulates **Long-Term Memory**, **Persona**, and **Preferences**. Unlike a Skill (Logic) or Model (Engine), a Mind is an *Evolving Entity*. It uses `Space` for durable memory and `Registry` for capabilities. It evolves via **Reflection** (Background Objectives).

**Strategic Refinements (V2):**
*   **Reflection:** Background "Dreaming" processes (Generative Agents pattern).
*   **Memory Policy:** Scored retention (Recency + Relevance + Importance).
*   **Thin Mind:** Mind holds State; Objective holds Process.
*   **Versioning:** Pinned Embedding Models & Vector Indices.

## 2. Ubiquitous Language

*   **Mind:** The Bounded Context itself.
*   **Agent:** The active instance of a Mind.
*   **Memory:** The persistent knowledge base (Semantic Vectors + Episodic Trace).
*   **Persona:** The core System Prompt defining personality/role.
*   **WorkingSet:** The active set of "Installed" Skills.
*   **Reflection:** A background process that synthesizes memories into insights.

## 3. Invariants & Policies

1.  **Identity:** A Mind maps 1:1 to a `ServicePrincipal` in Identity.
2.  **Continuity:** A Mind persists across Sessions.
3.  **Isolation:** A Mind can only access its own Memory Namespace in Space (Tenant-Scoped).
4.  **Evolution:** Reflection jobs must be guarded (Policy) and auditable (Trace).
5.  **Index Stability:** A Mind is pinned to specific Embedding Models/Index Versions to prevent drift.

## 4. Published Language (The Contract)

### Core Schema
```typescript
interface MindDefinition {
  readonly name: string;
  readonly description: string;
  readonly persona: string; // System Prompt
  readonly installedSkills: string[]; // Skill IDs
  readonly memoryPolicy: {
    readonly retentionDays: number;
    readonly maxVectors: number;
    readonly embeddingModel: string; // e.g., "text-embedding-3-small"
  };
}

interface MindState {
  readonly id: MindId;
  readonly principalId: PrincipalId;
  readonly memoryNamespace: string;
  readonly stats: {
    readonly age: Duration;
    readonly memoriesCount: number;
  };
}
```

### Service Interface (OHS)
*   `create(def) -> Effect<MindId, MindError>`
*   `load(mindId) -> Effect<MindState, MindError>`
*   `remember(mindId, content, score) -> Effect<MemoryId, MindError>` (Ingest)
*   `recall(mindId, query, options) -> Effect<MemoryItem[], MindError>` (Search)
*   `reflect(mindId) -> Effect<void, MindError>` (Trigger Consolidation)
*   `installSkill(mindId, skillId, version) -> Effect<void, MindError>`

## 5. Integration Patterns

*   **Upstream (Consumers):**
    *   **Objective:** Uses a Mind to execute a plan. "Hey Mind X, solve this."
*   **Downstream (Dependencies):**
    *   **Space:** Stores Memory (Vectors) and State (KV).
    *   **Registry:** Resolves installed Skills.
    *   **Identity:** Provides the Principal identity.
    *   **Search:** Indexes the Memories (Downstream BC).

## 6. Strategic Boundaries

*   **Mind vs. Objective:**
    *   Mind = *Who* (Identity/Memory).
    *   Objective = *What* (Process/Flow).
*   **Mind vs. User:**
    *   User = Human Owner.
    *   Mind = Digital Employee.

## 7. Open Questions (Resolved)
1.  **Memory Structure:** Semantic = Vectors. Episodic = Trace References.
2.  **Reflection:** Scheduled Objectives (ReAct/Reflexion pattern).
3.  **Evolution:** Explicit `reflect()` operations, guarded by Policy.
4.  **Versioning:** Indices are immutable/versioned per Mind to prevent drift.
