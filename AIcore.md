# Core AI Services Overview

**Version:** 1.0
**Date:** 2024-07-27

This document provides a high-level overview of the foundational AI services located within the `src/services/ai/` directory of the EffectiveAgent framework. These services provide essential building blocks for preparing AI model interactions and managing related information, but they are generally considered **internally-focused**. The primary interface for developers invoking AI capabilities is intended to be the `SkillApi` service (`capabilities/skill`).

## Guiding Principles

*   **Abstraction:** Encapsulate specific AI-related tasks like prompt rendering and model information management.
*   **Support Role:** These services primarily support higher-level services (like `SkillApi`) in orchestrating AI interactions.
*   **Leverage `@effect/ai`:** The actual interaction with LLM providers is handled by the `@effect/ai` library and its provider packages (e.g., `@effect/ai-openai`), configured and invoked based on information managed by these core AI services and the `SkillApi`.

## Core AI Service Categories

### 1. `prompt`

*   **Purpose:** Manages and renders dynamic text templates using the LiquidJS engine.
*   **Key Responsibility:** Provides a `PromptApi` for rendering named templates (loaded via `PromptConfig` from `prompts.json`) or ad-hoc template strings with context data (e.g., user input, persona details, skill instructions, memory context).
*   **Primary Consumer:** `SkillApi` (or other services orchestrating LLM calls) uses this to construct the final prompt string before passing it to the underlying AI model via `@effect/ai`.
*   **Dependencies:** `ConfigLoaderApi` (via `PromptConfig`), `liquidjs` library.

### 2. `model`

*   **Purpose:** Manages **metadata** about AI models configured for use within the framework. This service **does not** make calls to AI models itself.
*   **Key Responsibility:** Provides a `ModelApi` to retrieve information about models, such as their capabilities (e.g., "vision", "tool-use", defined via `ModelCapability` type), context window size, associated provider, potential pricing information, etc. This metadata is loaded via `ModelConfig` from `models.json`.
*   **Primary Consumer:** `IntelligenceConfiguration` (to map intelligence profiles to suitable models) and potentially `SkillApi` (to verify model capabilities or select models based on `IntelligenceProfile` preferences).
*   **Dependencies:** `ConfigLoaderApi` (via `ModelConfig`).

### 3. `provider`

*   **Purpose:** This directory primarily serves as a location for **custom implementations** of `@effect/ai` interfaces (like `Completions`) for providers not natively supported by the `@effect/ai-*` packages (e.g., DeepSeek, local Ollama endpoints). It may also contain schemas related to provider identification if needed.
*   **Key Responsibility:** **Does NOT provide the primary API for LLM interaction.** That role belongs to the `Completions` service provided by `@effect/ai` layers (like `OpenAI.layer`). This directory facilitates extending provider support.
*   **Primary Consumer:** The application's main layer composition logic might consume custom provider layers defined here. `SkillApi` might use schemas defined here for parsing `modelId` strings.
*   **Dependencies:** Custom implementations depend on `@effect/ai`, `HttpClient`, `Config`.

**Interaction Summary:**

The `SkillApi` acts as the main orchestrator. It uses `IntelligenceConfiguration` and `PersonaConfiguration` (from `core`) to understand the desired AI behavior. It leverages the `ModelApi` (from `ai/model`) to get metadata for model selection based on the Intelligence profile. It uses the `PromptApi` (from `ai/prompt`) to construct the final prompt. Finally, it selects and uses the appropriate configured `@effect/ai` `Completions` service (provided by layers like `OpenAI.layer`, `Anthropic.layer`, or custom layers potentially defined in `ai/provider`) to execute the LLM call.
