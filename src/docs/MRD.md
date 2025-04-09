# EffectiveAgent - Market Requirements Document (MRD)

**Version:** 1.1
**Date:** 2024-07-29 *(Updated)*
**Status:** Draft

## 1. Introduction & Overview

The digital landscape demands AI tools that function not merely as assistants but as capable **digital collaborators**. Users expect AI that understands complex requests, performs multi-step tasks, integrates into workflows, and presents information interactively.

While powerful AI models exist, building applications featuring such sophisticated agents presents significant technical hurdles for developers. Integrating AI capabilities, managing state and context, orchestrating complex workflows (like ReAct or graph-based execution), handling tool usage, ensuring reliability, and creating dynamic user interfaces often requires bespoke, complex engineering efforts for each new agent. This high development friction slows innovation and increases costs.

**EffectiveAgent** is a foundational framework designed for **AI developers and engineers**. It aims to drastically reduce the complexity and boilerplate involved in building sophisticated, interactive AI agents by providing robust, pre-built abstractions, services, and patterns based on Effect-TS. It allows developers to focus on defining the unique capabilities and knowledge of their agents, rather than repeatedly solving common underlying engineering challenges.

## 2. Goals & Objectives

*   **Developer Productivity:** Significantly reduce the development time, complexity, and boilerplate code required to build advanced, interactive AI agents.
*   **Enable Sophistication:** Provide the building blocks (abstractions, services) necessary for creating agents capable of complex reasoning, multi-step task execution, tool usage, and state management.
*   **Promote Interactivity:** Facilitate the development of agents that present information and interact with users through dynamic UI components (tables, cards, mini-apps) rather than just static text.
*   **Reliability & Maintainability:** Leverage Effect-TS to build a robust, type-safe, and composable framework that leads to more reliable and maintainable agent applications.
*   **Accelerate Agent Development:** Lower the barrier to entry for creating specialized, domain-specific AI collaborators across various industries.

## 3. Target Audience (Users of the EffectiveAgent Framework)

The primary audience for the EffectiveAgent framework itself consists of:

*   **AI Engineers & Developers:** Building custom AI agents, chatbots, or AI-powered features within larger applications.
*   **Software Engineers:** Integrating advanced AI capabilities into their products and workflows.
*   **Startups & Companies:** Developing AI-native applications or adding significant AI collaboration features.

*(The end-users described in v1.0 benefit from applications *built using* EffectiveAgent).*

## 4. Market Needs & Problems Solved (Developer Perspective)

Developers building sophisticated AI agents face numerous technical challenges that EffectiveAgent aims to solve:

*   **Complex State Management:** Tracking conversation history, user context, intermediate results, and agent state across multiple turns and asynchronous operations is difficult and error-prone.
    *   *Need:* Robust, effectful state management abstractions provided by the framework.
*   **Workflow Orchestration:** Implementing multi-step reasoning, tool usage (like ReAct or LangGraph patterns), and conditional logic requires significant orchestration code.
    *   *Need:* Pre-built, composable patterns and services for defining and executing complex agent workflows (leveraging Effect-TS and potentially libraries like LangGraph).
*   **Boilerplate Integration Code:** Connecting to LLMs, managing API keys, handling rate limits, parsing outputs, interacting with vector stores, and calling external tools involves repetitive setup and error handling.
    *   *Need:* Standardized service interfaces (`SkillApi`, `RepositoryApi`, `FileApi`, etc.) and layers that encapsulate these common integrations.
*   **Building Interactive UIs:** Creating frontends that dynamically render components based on backend AI responses requires specific backend APIs and frontend handling logic.
    *   *Need:* Framework support and defined patterns for sending structured data/component definitions from the agent backend to a client for rendering. *(Initial focus is backend, but API design considers this).*
*   **Reliability and Error Handling:** Ensuring agents handle failures gracefully (API errors, tool failures, unexpected outputs) requires careful, effectful programming.
    *   *Need:* Leverage Effect-TS's superior error handling capabilities throughout the framework to build resilient agents.
*   **Configuration Management:** Managing prompts, model settings, personality configurations, and skill definitions requires a structured approach.
    *   *Need:* Dedicated configuration services (`PromptConfig`, `SkillConfig`, etc.) using standardized loading mechanisms (`EntityLoaderApi`).

## 5. Product Vision & Key Capabilities (Framework Perspective)

EffectiveAgent provides developers with:

*   **Declarative Primitives:** Define agent capabilities using high-level abstractions like `Skill`, `Intelligence`, and `Personality`, reducing the need to manage low-level LLM parameters directly.
*   **Composable Services:** Leverage pre-built Effect-TS services for core functionalities like logging, configuration loading (`EntityLoaderApi`), data persistence (`RepositoryApi`), blob storage (`FileApi`), and relationship management (`AttachmentApi`).
*   **Effect-TS Core:** Built entirely on Effect-TS, offering strong typing, superior error handling, resource management, and composability for building complex, reliable asynchronous applications.
*   **Standardized Structure:** A defined project structure and conventions (`make` pattern, layer composition, tagged errors) promote consistency and maintainability.
*   **Workflow Integration Points:** Designed to integrate with orchestration libraries (like LangGraph) or custom Effect-based workflows for defining agent execution logic. *(LangGraph integration is planned).*
*   **API Design for Interactivity:** While the initial focus is backend, the API design (e.g., `SkillApi` potentially returning structured data alongside text) anticipates the need to drive interactive frontend components.

## 6. Use Cases (Developer Examples)

*   **Use Case 1: Building a Code Generation Skill**
    *   **Problem:** A developer needs to add a feature where an agent can generate code snippets based on user requests, requiring specific prompts, model settings, and potentially access to a file service.
    *   **EffectiveAgent Solution:**
        1.  Define prompt templates in `prompts.json`.
        2.  Define a `Personality` for code generation (e.g., concise, commented) in `personas.json`.
        3.  Define an `Intelligence` profile specifying a suitable coding model in `intelligences.json`.
        4.  Define a `Skill` ("codeGenerator") in `skills.json`, linking the prompt, personality, and intelligence.
        5.  In their application code, inject the `SkillApi` service.
        6.  Call `skillApi.invokeSkill({ skillName: "codeGenerator", context: { /* user request */ } })`.
        7.  The framework handles loading configs, selecting the model, rendering the prompt (using `PromptApi`), calling the LLM (via `@effect/ai`), and returning the result.
    *   **Benefit:** Developer focuses on defining the skill's components (prompt, model choice) rather than the complex LLM interaction and configuration loading logic.

*   **Use Case 2: Creating an Agent that Uses Tools**
    *   **Problem:** A developer wants an agent that can search the web and save results to a file. This requires orchestrating LLM calls, tool execution (web search), and file storage.
    *   **EffectiveAgent Solution:**
        1.  Define skills for planning, web searching (as a tool), and summarizing.
        2.  Use an orchestration layer (e.g., LangGraph integrated with Effect-TS, or a custom Effect workflow) that leverages the `SkillApi` for LLM calls and the `FileApi` for saving results.
        3.  The workflow calls the planning skill, then conditionally calls the web search tool based on the plan, then calls the summarizing skill, and finally uses `FileApi.storeFile` to save the output.
    *   **Benefit:** The framework provides the core `SkillApi` and `FileApi` building blocks, allowing the developer to focus on the workflow logic using their chosen orchestration method.

## 7. Out of Scope (Framework Version 1.0)

*   Providing a complete, batteries-included frontend framework or UI component library. (Focus is on backend services and APIs).
*   Built-in visual workflow editor.
*   Specific, pre-built agents for end-users (it's a framework *for building* agents).
*   Managed hosting or deployment solutions (users deploy applications built *with* the framework).
