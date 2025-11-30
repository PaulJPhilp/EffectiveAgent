# DDD Analysis: Cortex (Kernel)

**Status:** V2 (Finalized)
**Layer:** Cortex (System)
**Role:** The Singleton Bootstrapper & Runtime Container

---

## 1. Executive Summary
The **Cortex Bounded Context** is the **Composition Root** of the AI OS. It acts as the **Dependency Injection Root** and **Supervisor**. It constructs the single `ProductionRuntime`, wires the Substrate (Trace, Space, Identity, Registry), and manages their lifecycle via an **OTP-style Supervision Tree**.

**Strategic Refinements (V2):**
*   **Composition Root:** The Cortex is the *only* place that constructs the Effect Runtime.
*   **Supervision:** Defines explicit Restart Strategies (One-For-One, Backoff).
*   **Crash-Only:** Boot failures panic immediately. No degraded modes.
*   **Health OHS:** Exposes distinct `liveness` and `readiness` probes.

## 2. Ubiquitous Language

*   **Cortex:** The OS singleton instance (Composition Root).
*   **Boot:** The sequence of initializing subsystems in dependency order.
*   **Supervisor:** A process that monitors Subsystems and applies restart policies.
*   **Subsystem:** A core primitive (e.g., TraceService) managed by the Cortex.
*   **ProductionRuntime:** The single Effect-TS `Runtime` configured with global layers.
*   **Panic:** A catastrophic failure requiring a process restart.

## 3. Invariants & Policies

1.  **Singleton Runtime:** Only one `ProductionRuntime` exists per Node. Ad-hoc runtimes are forbidden.
2.  **Dependency Order:** Trace/Space -> Identity -> Policy -> Registry -> Runtime.
3.  **Fail-Fast:** If a core Subsystem fails to boot, the Cortex panics.
4.  **Isolation:** Apps receive Services via DI, but cannot mutate the Cortex.

## 4. Published Language (The Contract)

### Core Schema
```typescript
interface CortexConfig {
  readonly nodeId: string;
  readonly environment: 'dev' | 'prod';
  readonly storage: StorageConfig;
  readonly telemetry: TelemetryConfig;
}

interface HealthStatus {
  readonly liveness: boolean;  // Process is up
  readonly readiness: boolean; // All critical subsystems are up
  readonly uptime: Duration;
  readonly subsystems: Record<string, 'up' | 'down' | 'restarting'>;
}
```

### Service Interface (OHS)
*   `boot(config) -> Effect<void, CortexError>`
*   `shutdown(reason) -> Effect<void, CortexError>`
*   `health() -> Effect<HealthStatus, CortexError>`
*   `inject<T>(serviceTag) -> Effect<T, CortexError>` (DI Resolution)

## 5. Integration Patterns

*   **Upstream (Orchestrator):**
    *   **CLI/Server:** Calls `Cortex.boot()` at entrypoint.
    *   **Fleet Manager:** Polls `Cortex.health()` for readiness.
*   **Downstream (Subsystems):**
    *   **Trace/Space/Identity:** Provided as *Memoized Layers* by the Cortex.
    *   **Policy:** Injected as middleware.

## 6. Strategic Boundaries

*   **Cortex vs. App:**
    *   Cortex = The Container (Docker/JVM).
    *   App = The Workload.
*   **Cortex vs. Registry:**
    *   Cortex reads Registry to load Drivers, but Registry is just data.

## 7. Open Questions (Resolved)
1.  **Restart Taxonomy:**
    *   *Substrate (Trace/Space):* **All-For-One** (If Storage fails, everything fails).
    *   *Services (Registry/Identity):* **One-For-One** (Restart individually).
    *   *Backoff:* Exponential (1s -> 30s).
2.  **Panic Matrix:**
    *   *Boot Failure:* **Panic** (Crash-Only).
    *   *Runtime Failure:* **Restart** (Supervised).
3.  **Layer Lifecycle:**
    *   *Core:* Memoized Singletons.
    *   *Session:* Scoped Layers (created per request).
