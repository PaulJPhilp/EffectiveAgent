# ✨ EffectiveAgent ✨

**Build Interactive, Stateful AI Collaborators with Effect-TS**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Effect-TS](https://img.shields.io/badge/Built%20with-Effect--TS-blueviolet)](https://effect.website/)
[![Runtime: Bun](https://img.shields.io/badge/Runtime-Bun-lightgrey)](https://bun.sh/)
<!-- Add other badges: build status, version, etc. -->

---

**The Problem:** Users expect more than just chatbots. They need AI that acts like a capable **digital collaborator** – understanding complex tasks, integrating into workflows, and presenting information interactively. For **AI developers and engineers**, building these sophisticated agents today is a major undertaking, fraught with challenges:

*   **Complexity:** Integrating LLMs, tools, memory, state management, and robust error handling is intricate.
*   **Time & Cost:** Writing boilerplate code for integrations, state machines, and async operations consumes significant development time and budget.
*   **Basic Interactions:** Standard tools often limit agents to simple text-in, text-out loops, failing to deliver rich, application-like experiences.

**The Solution: EffectiveAgent**

EffectiveAgent is a **robust, modular, and type-safe framework** built entirely on **Effect-TS** and a modern stack (including **Bun**, **Temporal**, **Drizzle**, **LangGraph**, **Vercel AI SDK**). It provides the foundational structure and essential services to **drastically reduce the complexity, time, and cost** of building sophisticated, interactive AI agents.

Stop wrestling with boilerplate and start innovating! EffectiveAgent lets you focus on creating unique agent capabilities and compelling user experiences.

## Why EffectiveAgent?

*   **Build Faster:** Leverage pre-built, composable services for core needs (AI providers, memory, tools, configuration, logging, execution flow).
*   **Build Smarter:** Create agents that go far beyond simple Q&A, enabling complex task execution and workflow automation.
*   **Build Interactively:** Design experiences where AI outputs are dynamic and actionable, not just static text.
*   **Build Robustly:** Benefit from Effect-TS's unparalleled type safety, error handling, concurrency management, and dependency injection.
*   **Modern Foundation:** Built on a forward-thinking stack including Bun, Temporal, and first-class Effect-TS integration.

## Beyond Chatbots: The EffectiveAgent Vision 🚀

EffectiveAgent enables experiences that feel less like talking to a bot and more like collaborating within a specialized application:

### 1. Interactive Components

Move beyond walls of text. Agents built with EffectiveAgent can instruct the frontend to render rich, interactive UI components directly within the chat or application interface.

*   **Example:** Instead of just listing weather data, the agent returns data for a `<WeatherCard location="London" temperature={15} forecast={...} />` component that the user can interact with. Think dynamic tables, charts, mini-dashboards, and more.

### 2. Actionable Outputs: Artifacts

AI-generated content (reports, code, summaries, emails, analyses) becomes a first-class **Artifact**. It's not just text lost in history; it's a distinct object ready for refinement.

*   **Example:** An LLM drafts a blog post outline. EffectiveAgent treats this as an "Article Artifact" with a unique ID.

### 3. Focused Workspaces: Mini-Apps

This is where the magic happens! Users can select an Artifact and transition into a **dedicated "mini-app" workspace** focused *solely* on that artifact.

*   **Example:** Clicking the "Article Artifact" opens an AI-powered editor. The context is locked to the article draft. The AI assists with refining *this specific document*. Clicking a "Sales Report Artifact" might open an interactive data exploration view.

### 4. Context-Aware UI

The user interface adapts to the task. Controls and available actions change based on whether the user is in the main chat or a specific mini-app.

*   **Example:** In the main chat, UI controls might allow changing the AI model. In the "Article Editor" mini-app, controls change to `[Save Draft]`, `[Check SEO]`, `[Expand Section]`.

## Use Case Example: AI Marketing Collaborator

Imagine building a marketing assistant with EffectiveAgent:

1.  **Request:** "Analyze top competitor blog posts on 'AI Marketing Trends' and draft a response outline."
2.  **Agent Response:**
    *   Displays an **interactive table** summarizing competitor articles (via `ComponentData`).
    *   Generates an outline presented as an **"Article Artifact"**.
3.  **User Action:** Clicks the "Article Artifact".
4.  **Mini-App Transition:** The UI shifts to a focused **"Article Editor"**.
5.  **Interaction:** User prompts AI *within the editor* ("Expand the section on personalization"). UI buttons offer actions like `[Check Keywords]`, `[Save]`.
6.  **Result:** A streamlined workflow, integrating analysis, drafting, and SEO checks within a single, context-aware experience – far more efficient than juggling separate tools.

## Technical Foundation 🛠️

EffectiveAgent leverages a modern, robust technology stack chosen for performance, type safety, and developer experience:

*   **Core Framework:** **Effect-TS** (for everything!)
*   **Runtime:** **Bun** (with native Temporal & SQLite support)
*   **Date/Time:** **Temporal API** (via polyfill types / native support)
*   **Database:** **PostgreSQL** (Production via **Neon**) / **SQLite** (Dev/Test via Bun)
*   **ORM:** **Drizzle ORM**
*   **Agent Logic:** **LangGraph** (Default framework for execution flow)
*   **AI SDK:** **Vercel AI SDK** (Primary bridge to LLM providers)
*   **Templating:** **LiquidJS**
*   **Schema/Validation:** **Zod** (via `@effect/schema`)
*   **Testing:** **Vitest** (with `@effect/vitest` integration optional)

See [`TECHNOLOGY_STACK.md`](./src/services/TECHNOLOGY_STACK.md) for more details.

## Project Structure

The framework is organized into service categories within `src/services`:

*   `core`: Foundational services (logging, config, repository, storage, attachment, tag).
*   `ai`: Services related to AI models, prompts, and providers.
*   `capabilities`: Services defining agent abilities (tools, MCPs, skills).
*   `execution`: Services managing agent runtime, state, and flow (agent, thread, supervisor).
*   `memory`: Services for managing different types of agent memory (chat history, artifacts, long-term).

Each service follows a standard internal structure (`main.ts`, `configuration.ts`, `types.ts`, `errors.ts`, `schema.ts`, `docs/`, `__tests__/`, `index.ts`).

## Getting Started

*(This section to be filled in as the framework matures)*

```bash
# Installation (Example)
bun add effective-agent # Or your package name

# Basic Usage (Conceptual)
import { Effect } from "effect";
import { AgentApi } from "@execution/agent"; // Example import using path alias

const program = Effect.gen(function*() {
  const agent = yield* AgentApi;
  const response = yield* agent.processUserInput({ threadId: "...", input: "Hello!" });
  console.log(response);
});

// Run with necessary layers provided...