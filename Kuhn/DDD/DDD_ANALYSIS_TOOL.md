# DDD Analysis: Tool (Effect)

**Status:** V2 (Finalized)
**Layer:** Interface (Capability)
**Role:** The Deterministic Side-Effect Engine

---

## 1. Executive Summary
The **Tool Bounded Context** is the standard interface for all External Side-Effects. It converts **Model Tool Calls** into **Real Actions**. It enforces **Stripe-style Idempotency** and **Zero-Trust Security** (PEP) at the execution boundary. It decouples *Definition* (Schema) from *Implementation* (Handler/Sandbox).

**Strategic Refinements (V2):**
*   **Idempotency:** "First Write Wins" semantics (Cache Check -> Replay Result).
*   **Sandboxing:** Tiered isolation (WASM/WASI, gVisor, Firecracker).
*   **Secrets:** Banned in Args. Injected via Identity/Policy.
*   **Validation:** JSON Schema 2020-12 for Input/Output.

## 2. Ubiquitous Language

*   **Tool:** The Bounded Context itself.
*   **ToolDef:** The schema describing the tool (Name, Description, JSON Schema).
*   **ToolCall:** The specific invocation request (ToolName + Arguments).
*   **ToolResult:** The deterministic output (Success/Error).
*   **IdempotencyKey:** A client-provided token ensuring "Exactly-Once" processing via replay.
*   **Sandbox:** The isolation environment (WASM, MicroVM).

## 3. Invariants & Policies

1.  **Idempotency:** Every execution requires an `IdempotencyKey`. Replaying key + same args returns cached result. Replaying key + diff args returns Conflict.
2.  **Sandboxing:** Tools run in isolation.
    *   *Tier 1 (Untrusted):* WASM/WASI.
    *   *Tier 2 (System):* gVisor/Firecracker.
3.  **Typed IO:** Inputs/Outputs validated against JSON Schema 2020-12.
4.  **No Secrets:** Args cannot contain secrets.
5.  **Audit:** Start/End/Result emitted to `Trace` with OTel Spans.

## 4. Published Language (The Contract)

### Core Schema
```typescript
interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: JSONSchema;
  readonly outputSchema: JSONSchema;
  readonly sandboxTier: 'wasm' | 'microvm';
}

interface ToolExecution {
  readonly id: ExecutionId;
  readonly tool: string;
  readonly args: unknown;
  readonly principalId: PrincipalId;
  readonly idempotencyKey: string;
}

interface ToolResult {
  readonly executionId: ExecutionId;
  readonly output: unknown; // JSON Serializable
  readonly error?: { code: string; message: string };
  readonly duration: Duration;
  readonly cached: boolean; // True if replay
}
```

### Service Interface (OHS)
*   `execute(tool, args, context) -> Effect<ToolResult, ToolError>`
*   `validate(tool, args) -> Effect<void, ValidationError>`
*   `listTools(filter?) -> Effect<ToolDefinition[], ToolError>`

## 5. Integration Patterns

*   **Upstream (Consumers):**
    *   **Objective:** Orchestrates Tool calls.
    *   **Skill:** Defines required Tools.
*   **Downstream (Infrastructure):**
    *   **Policy:** Intercepts `execute` (PEP) via Embedded PDP.
    *   **Trace:** Records logs/spans.
    *   **Space:** Stores Idempotency Keys/Results.
    *   **Identity:** Provides Scoped Credentials (STS).

## 6. Strategic Boundaries

*   **Tool vs. Skill:**
    *   Skill = Logic (When to call).
    *   Tool = Capability (How to execute).
*   **Tool vs. Model:**
    *   Model = Intent (I want to read file X).
    *   Tool = Action (Reading file X).

## 7. Open Questions (Resolved)
1.  **Long-Running:** Synchronous only (<30s). Long tasks are Objectives.
2.  **Streaming:** No. Request/Response only for V1.
3.  **Secrets:** Injected at runtime via Identity/Policy.
4.  **Idempotency Scope:** Global Key + Args Hash Check.
5.  **Sandbox:** WASM for logic, MicroVM for I/O heavy tools.
