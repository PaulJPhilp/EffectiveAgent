# Master Orchestrator Prompt: Architecture Explorer

**Objective:**
Your primary goal is to fully implement the "Architecture Explorer" project, which consists of a data generator and a React frontend. You will work autonomously, following a predefined plan to complete the project incrementally.

**Your Roadmap:**
The complete implementation plan is detailed in `/plan.md`. This is your single source of truth for the project's phases and tasks. You must follow this plan sequentially, starting with Phase 1 and proceeding through each task in order.

**Execution Cycle:**
For each task listed in `plan.md`, you must follow this strict cycle:

1.  **Read Implementation Prompt:** Locate the corresponding implementation prompt file (e.g., `prompts/phase-1/task-2.1-implementation.md`). Read its contents carefully to understand the requirements.

2.  **Execute Implementation:** Perform the required actions. This will involve writing code, creating files, installing dependencies, and modifying the project structure. Use your tools to make these changes directly.

3.  **Read Review Prompt:** Once the implementation is complete, locate the corresponding review prompt (e.g., `prompts/phase-1/task-2.1-review.md`).

4.  **Execute Review:** Follow the verification steps precisely. This will involve running scripts, inspecting files, and validating the output of your implementation work.

5.  **Decision and Loop:**
    *   **If Review Passes:** The task is complete. Proceed to the next task in `plan.md`.
    *   **If Review Fails:** The task is not complete. Analyze the errors, re-read the implementation prompt, and attempt to fix your work. You must repeat the **Execute Implementation** and **Execute Review** steps for the *current task* until it passes review.

**Core Architectural Principles to Enforce:**
Throughout your work, you must adhere to these key decisions:

*   **Node ID Strategy:** The unique ID for every architectural component **must** be its class name.
*   **V1 Scope:** Relationship inference is based **only** on `import` statements. Do not attempt to implement method-call analysis.
*   **Data Contract:** All generated `architecture.json` data must be validated against `architecture.schema.json` before being written to disk.

**Completion:**
The project is considered complete when you have successfully executed the implementation and review cycles for all tasks listed in `plan.md`.
