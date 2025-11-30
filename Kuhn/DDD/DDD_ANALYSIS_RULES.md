# DDD Analysis: Rules (Guardrails)

**Status:** V2 (Finalized)
**Layer:** Governance (Cross-Cutting)
**Role:** The Security & Governance Engine

---

## 1. Executive Summary
The **Rules Bounded Context** is the centralized authority for **Authorization** and **Safety**. It implements the **PDP/PEP** pattern. It operates on a **Zero-Trust / ABAC** model: Identity provides Attributes (PIP), Rules provides Logic (PDP), and IO Boundaries enforce Decisions (PEP). It represents **What is Allowed**.

**Strategic Refinements (V2):**
*   **Placement:** Embedded PDP (or Sidecar) with Signed Bundles for <5ms latency.
*   **Engine:** TypeScript DSL (V1) structured to map to OPA/Rego logic.
*   **Safety:** LLM Egress Filtering is a distinct PEP surface.
*   **Decision Logging:** Full audit trail of Inputs/Outputs to History.

## 2. Ubiquitous Language

*   **Rules:** The Bounded Context itself (was Policy).
*   **Rule:** A definable logic statement (e.g., "Deny if role != admin").
*   **RuleSet:** A versioned, signed collection of Rules (The Bundle).
*   **PDP (Decision Point):** The embedded engine that evaluates Rules.
*   **PEP (Enforcement Point):** The interceptor at IO boundaries (WorkingMemory/Tool/Model).
*   **PIP (Information Point):** The attribute source (Identity).
*   **Context:** The evaluation input (Principal, Action, Resource, Env).
*   **Decision:** The output (`Allow`, `Deny`, `Modifications`).

## 3. Invariants & Policies

1.  **Fail-Closed:** If PDP fails/timeouts, PEP must DENY.
2.  **Deterministic:** Same Context + Same Bundle = Same Decision.
3.  **Auditability:** Every Decision is emitted to `History` with `reasonCodes`.
4.  **Decoupling:** Apps receive Results, not Reasons (prevents leakage).
5.  **ABAC:** Permissions live in Rules, not Identity.

## 4. Published Language (The Contract)

### Core Schema
```typescript
interface RulesContext {
  readonly principal: Principal; // From Identity (PIP)
  readonly action: string;       // e.g., "memory.delete"
  readonly resource: string;     // e.g., "mind-123/core"
  readonly environment: Record<string, any>;
}

interface RulesDecision {
  readonly result: 'allow' | 'deny';
  readonly reasonCodes: string[];      // For Audit/Logs
  readonly modifications?: {           // For Data Masking/Redaction
    readonly mask: string[];
    readonly redact: string[];
  };
}
```

### Service Interface (OHS - Embedded)
*   `evaluate(context) -> Effect<RulesDecision, RulesError>`
*   `evaluateBatch(contexts[]) -> Effect<RulesDecision[], RulesError>`
*   `reload(bundleId, signature) -> Effect<void, RulesError>` (Hot Reload)

### Safety Interface (PEP - Egress)
*   `scanOutput(text) -> Effect<{ safe: boolean, redactedText?: string }, RulesError>`

## 5. Integration Patterns

*   **Upstream (PEPs):**
    *   **WorkingMemory:** Checks `memory.write` / `memory.read`.
    *   **Tool:** Checks `tool.execute`.
    *   **Model:** Checks `model.invoke` & Scans Output (Safety Filter).
*   **Downstream (Data):**
    *   **Identity:** Provides Principal Attributes (Cached/Short-TTL).
    *   **Capabilities:** Stores Signed Rule Bundles.
    *   **History:** Receives Decision Logs.

## 6. Strategic Boundaries

*   **Rules vs. Identity:**
    *   Identity = Attributes (PIP).
    *   Rules = Logic (PDP).
*   **Rules vs. Application:**
    *   App = Capability (Can delete).
    *   Rules = Permission (May delete).

## 7. Open Questions (Resolved)
1.  **Engine:** TypeScript DSL (V1).
2.  **Data Filtering:** Boolean (V1) + Modifications (Masking).
3.  **Latency:** Embedded Library (V1).
4.  **Distribution:** Signed Bundles via Capabilities.
5.  **Safety:** Distinct PEP surface.
