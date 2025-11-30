# DDD Analysis: Skill (Package)

**Status:** Draft
**Layer:** Interface (Capability)
**Role:** The Logic Unit (Prompt + Code)

---

## 1. Executive Summary
The **Skill Bounded Context** is the deployable unit of agentic behavior. It combines **Semantic Logic** (Prompts) with **Deterministic Logic** (Code) into a versioned, installable package. Skills are stateless and reusable. They do not run themselves; they are executed by an `Objective` or `Mind`.

## 2. Ubiquitous Language

*   **Skill:** The Bounded Context itself.
*   **Function:** A named entry point within a Skill (e.g., `Coding.Refactor`).
*   **Prompt:** The template used to guide the Model.
*   **Routine:** The deterministic code that orchestrates Models and Tools.
*   **Manifest:** The definition file (`skill.yaml`) declaring dependencies.
*   **IO:** The typed input/output contract of the Skill.

## 3. Invariants & Policies

1.  **Statelessness:** Skills cannot store state. They must use `Space` (via passed-in Context) if they need persistence.
2.  **Sandboxing:** Skills run in the same isolation tiers as Tools (WASM/JS Runtime).
3.  **Determinism (Logic):** The *code* part of a Skill must be deterministic. Only the *Model* calls inject stochasticity.
4.  **Dependency Explicit:** A Skill cannot call a Tool or Model it hasn't declared in its Manifest.

## 4. Published Language (The Contract)

### Core Schema
```typescript
interface SkillManifest {
  readonly name: string; // e.g., "org/coding"
  readonly version: string;
  readonly description: string;
  readonly functions: Record<string, FunctionDef>;
  readonly requirements: {
    readonly models: string[]; // e.g., "gpt-4"
    readonly tools: string[];  // e.g., "fs.write"
  };
}

interface FunctionDef {
  readonly description: string;
  readonly inputSchema: JSONSchema;
  readonly outputSchema: JSONSchema;
}
```

### Service Interface (OHS)
*   `resolve(skillId, version) -> Effect<SkillPackage, SkillError>` (Loads code + assets)
*   `validate(skill, input) -> Effect<void, ValidationError>`
*   `introspect(skill) -> Effect<SkillManifest, SkillError>`

## 5. Integration Patterns

*   **Upstream (Consumers):**
    *   **Objective:** "Runs" a Skill Function to make progress.
    *   **Mind:** "Installs" a Skill to gain capability.
*   **Downstream (Dependencies):**
    *   **Model:** The Skill invokes Models.
    *   **Tool:** The Skill invokes Tools.
    *   **Registry:** Stores the published Skill Packages.

## 6. Strategic Boundaries

*   **Skill vs. Tool:**
    *   Skill = **Orchestration** (Calls Model, then Tool, then Model).
    *   Tool = **Action** (Atomic Side-Effect).
    *   *Skills are composed of Tools and Models.*
*   **Skill vs. App:**
    *   App = The Executable Container.
    *   Skill = The Library.

## 7. Open Questions
1.  **Language:** What language are Skills written in? (Proposed: **TypeScript** compiled to JS/WASM for V1).
2.  **Composition:** Can a Skill call another Skill? (Proposed: Yes, via Registry resolution).
3.  **Testing:** How do we test Skills? (Proposed: `eval` framework in the SDK, mocking Models/Tools).
