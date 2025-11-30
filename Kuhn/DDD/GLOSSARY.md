# Kuhn: Cognitive OS Glossary

**Kuhn** is the first cognitive OS for agents. It is built on 12 primitives that form a complete cognitive environment.

## The 12 Primitives

| Primitive | Role | Definition |
| :--- | :--- | :--- |
| **History** | Ledger | Immutable ledger of everything that happened. |
| **WorkingMemory** | State | Mutable, structured state of what’s true right now. |
| **Identity** | Auth | The principal: who is acting or being acted on. |
| **Capabilities** | Catalog | Catalog of what the OS can do: Models, Tools, Skills, Agents, Minds. |
| **Cortex** | Supervisor | System supervisor: coordinates and oversees Agents. |
| **Rules** | Guardrails | Guardrails and constraints that everyone must obey. |
| **Model** | Cognition | Thinking engine: LLMs/ML models that perform cognition. |
| **Tool** | Action | Actions on the world: integrations, side effects, IO. |
| **Skill** | Knowledge | Packaged knowledge / logic: reusable procedures. |
| **Episode** | Envelope | A bounded experience/run with its own budget and scope. |
| **Mind** | Self | Self: persona + long-term memory for an Agent. |
| **Agent** | Drive | Drive: a goal-directed process/orchestrator that uses all the above. |

## The Cognitive Story

A **Cognitive OS** is an environment where **Agents** with **Minds** operate within **Episodes**, using **Models**, **Skills**, and **Tools** discovered via **Capabilities**, updating **WorkingMemory**, and recording everything in **History**, under the oversight of a **Cortex** and bounded by **Rules**.
