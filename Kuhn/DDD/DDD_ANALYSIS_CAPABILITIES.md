# DDD Analysis: Capabilities (Catalog)

**Status:** V1 (Finalized)
**Layer:** Substrate (Infrastructure)
**Role:** The Capabilities Directory

---

## 1. Executive Summary
The **Capabilities Bounded Context** is the "App Store" of Kuhn. It is a read-heavy directory that defines *what* can run. It catalogs **Skills** (Logic), **Models** (Cognition), **Tools** (Side-Effects), **Agents**, and **Minds**. Its primary responsibility is **Compatibility Resolution**—ensuring that a Mind only attempts to execute Skills that are compatible with its available resources.

## 2. Ubiquitous Language

*   **Capabilities:** The Bounded Context itself (was Registry).
*   **Asset:** A versioned entry (Skill, Model, Tool).
*   **Capability:** A feature flag describing what an Asset *can do* (e.g., `model.context.128k`).
*   **Requirement:** A constraint describing what an Asset *needs* (e.g., `requires: model.vision`).
*   **Release:** An immutable snapshot of an Asset (Version + Artifact Checksum).
*   **Deprecation:** A lifecycle state indicating an Asset should no longer be used.

## 3. Invariants & Policies

1.  **Immutability:** Once a Release is published, its definition can NEVER change.
2.  **Compatibility:** A Release cannot be published if its Requirements are unsatisfiable.
3.  **Dependency Graph:** No circular dependencies between Assets.
4.  **Discovery:** Only `Active` releases are discoverable by default.

## 4. Published Language (The Contract)

### Core Schema
```typescript
type AssetType = 'skill' | 'model' | 'tool' | 'agent' | 'mind';

interface AssetDefinition {
  readonly id: AssetId; // e.g., "org/coding-skill"
  readonly type: AssetType;
  readonly capabilities: string[]; // e.g., ["lang.python"]
  readonly requirements: string[]; // e.g., ["model.gpt4"]
}

interface Release {
  readonly assetId: AssetId;
  readonly version: string; // SemVer
  readonly checksum: string;
  readonly location: string; // WorkingMemory BlobRef or External URL
  readonly deprecated: boolean;
}
```

### Service Interface (OHS)
*   `publish(definition, artifact) -> Effect<Release, CapabilitiesError>`
*   `resolve(requirements) -> Effect<Release[], CapabilitiesError>`
*   `getLatest(assetId, range?) -> Effect<Release, NotFoundError>`
*   `deprecate(assetId, version) -> Effect<void, CapabilitiesError>`

## 5. Integration Patterns

*   **Upstream (Consumers):**
    *   **Mind:** Queries Capabilities to "install" compatible Skills.
    *   **Agent:** Resolves Skill versions at runtime.
    *   **Cortex:** Bootstraps by loading core Drivers (Model/Tool).
*   **Downstream (Infrastructure):**
    *   **WorkingMemory:** Stores the actual Artifacts (Blobs).

## 6. Strategic Boundaries

*   **Capabilities vs. WorkingMemory:**
    *   Capabilities = The Menu (Metadata).
    *   WorkingMemory = The Kitchen (Data/Artifacts).
*   **Capabilities vs. Identity:**
    *   Capabilities manages *Code* identities.
    *   Identity manages *Actor* identities.

## 7. Open Questions (Resolved)
1.  **Private Catalogs:** Supported via Tenant filtering.
2.  **Verification:** Checksums mandatory.
