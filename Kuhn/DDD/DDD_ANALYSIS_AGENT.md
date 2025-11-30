# DDD Analysis: Agent (Process Manager)

**Status:** V3 (Finalized)
**Layer:** Runtime (Execution)
**Role:** The Durable Orchestrator

---

## 1. Executive Summary
The **Agent Bounded Context** is the engine for **Long-Running Processes**. It orchestrates Skills, Minds, and Tools to achieve a high-level Goal. It manages **State Transitions**, **Retries**, and **Recovery** across system restarts. It follows the **Process Manager / Saga** pattern.

**Strategic Refinements (V3):**
*   **Canonical History:** `Trace` is the authoritative history. `ProcessState` holds a *summary* for UI/Control.
*   **Versioning:** `AgentDefinition` is a semantically versioned artifact.
*   **Outbox:** Co-located with State in Space for atomic updates.
*   **Nesting:** Explicit support for Sub-Agents to prevent monolithic flows.
*   **Signals:** Typed Domain Events (e.g., `mind.approval`) mapped to Steps.

## 2. Ubiquitous Language

*   **Agent:** The Bounded Context itself.
*   **Process:** The running instance of a workflow (e.g., `ReviewPR-123`).
*   **Step:** An atomic unit of work within a Process (e.g., `RunTests`).
*   **State:** The durable progress of the Process (e.g., `Step 3/5`).
*   **Signal:** A typed external event that unblocks a Process.
*   **Saga:** A sequence of transactions with compensating actions for rollback.
*   **Outbox:** The queue of pending events to be emitted to Trace.

## 3. Invariants & Policies

1.  **Durability:** Every state transition MUST be persisted (to Space) *before* the side-effect is triggered.
2.  **Idempotency:** All Steps must be idempotent.
3.  **Atomicity:** State Update + Outbox Enqueue must happen in the same transaction.
4.  **Interruptibility:** A Process must yield control periodically to allow for Preemption.
5.  **Audit:** Every Step transition is emitted to Trace (Async via Outbox).

## 4. Published Language (The Contract)

### Core Schema
```typescript
interface AgentDefinition {
  readonly id: AgentId;
  readonly version: string; // SemVer
  readonly steps: StepDefinition[]; // DAG or Sequence
  readonly timeout: Duration;
  readonly retryPolicy: RetryPolicy;
}

interface ProcessState {
  readonly id: ProcessId;
  readonly agentId: string;
  readonly status: 'active' | 'suspended' | 'completed' | 'failed';
  readonly currentStep: string;
  readonly context: Record<string, any>;
  readonly summary: StepResult[]; // Recent/Key history only
}
```

### Service Interface (OHS)
*   `spawn(definitionId, version, input) -> Effect<ProcessId, AgentError>`
*   `signal(processId, signal) -> Effect<void, AgentError>`
*   `listProcesses(filter) -> Effect<ProcessState[], AgentError>` (Queries Space)
*   `terminate(processId) -> Effect<void, AgentError>`

## 5. Integration Patterns

*   **Upstream (Consumers):**
    *   **User:** Starts an Agent (e.g., "Build a website").
    *   **Mind:** Starts a Sub-Agent.
*   **Downstream (Dependencies):**
    *   **Skill:** Agents invoke Skills as Steps.
    *   **Session:** Agents query Session for budget (Budget Authority).
    *   **Space:** Stores ProcessState + Outbox.
    *   **Trace:** Receives Audit Events (Async).

## 6. Strategic Boundaries

*   **Agent vs. Skill:**
    *   Skill = **Stateless Logic** (Function).
    *   Agent = **Stateful Flow** (Workflow).
*   **Agent vs. Session:**
    *   Session = **Resource Scope** (Budget).
    *   Agent = **Logical Scope** (Goal).

## 7. Open Questions (Resolved)
1.  **Engine:** Custom V1 Event Sourcing on top of Space/Trace.
2.  **Definition:** Code-as-Workflow (TypeScript/Effect) packaged as versioned artifacts.
3.  **Human-in-the-Loop:** `awaitSignal` step suspends execution waiting for typed Signal.
4.  **Querying:** List operations hit Space Projections (Fast). Trace is for Audit (Complete).
