# Prompt Service - Product Requirements Document (PRD)

**Version:** 1.0
**Date:** 2024-07-27
**Author:** Paul & T3 Chat

## 1. Overview

The Prompt Service (`PromptApi`) provides reusable functionality for managing and rendering dynamic text templates within the EffectiveAgent framework. Its primary use case is constructing the final prompts sent to Large Language Models (LLMs) by combining static templates, system instructions (from Personas and Skills), user input, and potentially contextual data retrieved from memory or tools. It utilizes the LiquidJS templating engine for safe and flexible template rendering.

## 2. Goals

*   **Dynamic Prompt Generation:** Enable the creation of complex prompts by rendering templates with dynamic context variables.
*   **Template Management:** Provide a mechanism to load, manage, and reference named prompt templates (e.g., from a `prompts.json` file).
*   **Standardized Templating:** Utilize a safe and well-understood templating engine (LiquidJS).
*   **Abstraction:** Decouple the prompt rendering logic from the services that need to generate prompts (like `SkillApi`).
*   **Error Handling:** Provide clear errors for issues like template not found or rendering failures.

## 3. Non-Goals

*   **Prompt Engineering Strategy:** Does not dictate *how* prompts should be structured for optimal LLM performance (though it provides the tools to implement various strategies).
*   **LLM Interaction:** Does not call LLM APIs directly (handled by `@effect/ai`'s `Completions` service, invoked by `SkillApi`).
*   **Configuration Loading (Low-level):** Relies on `ConfigLoaderApi` (via `PromptConfiguration`) for loading template files.
*   **Complex Logic in Templates:** LiquidJS is intentionally limited; this service doesn't aim to support highly complex logic within the templates themselves.

## 4. User Stories / Use Cases

*(Perspective: Another Backend Service, e.g., SkillApi)*

*   **As a Service, I want to:**
    *   Render a predefined, named prompt template (e.g., "summarization_prompt") by providing context variables (like `{ textToSummarize: "..." }`), so that I can generate a specific prompt for a summarization task.
    *   Render an ad-hoc prompt template string provided at runtime with context variables, so that I can handle dynamically generated prompt structures.
    *   Receive the final rendered string prompt ready to be sent to the LLM.
    *   Receive specific errors if the named template isn't found or if rendering fails due to syntax errors or missing variables in the context.

## 5. Functional Requirements

*   **FR-PROMPT-01 (Configuration Loading):** Provide an optional `PromptConfiguration` service (using `ConfigLoader`) responsible for loading, validating, and providing access to named prompt templates defined in a configuration file (e.g., `prompts.json`).
    *   Must support retrieving a specific template string by name.
*   **FR-PROMPT-02 (Prompt API):** Provide a `PromptApi` service with core methods:
    *   `renderTemplate(params: { templateName: string, context: JsonObject }) => Effect<string, PromptError | PromptConfigurationError, PromptConfiguration>`: Loads a named template via `PromptConfiguration` and renders it with the provided context. Requires `PromptConfiguration`.
    *   `renderString(params: { templateString: string, context: JsonObject }) => Effect<string, PromptError>`: Renders a template string directly provided as input with the given context. Does not require `PromptConfiguration`.
*   **FR-PROMPT-03 (Templating Engine):** Must use the `liquidjs` library for template parsing and rendering.
*   **FR-PROMPT-04 (Error Handling):** Define specific `PromptError` types (`TemplateNotFoundError`, `RenderingError`) extending `AppError`. Errors from `PromptConfiguration` should also be handled or propagated.

## 6. API Design (Conceptual)

Reference `types.ts` for the `PromptApi` and `PromptConfiguration` interface definitions.

```typescript
// Example Usage (Conceptual by SkillApi)
Effect.gen(function*() {
  const promptApi = yield* PromptApi;
  const skillConfig = yield* SkillConfiguration.getSkillDefinitionByName("mySkill");
  const persona = yield* PersonaConfiguration.getPersonaByName("formal");
  const inputData = { userQuery: "Tell me about X", userName: "Paul" };

  // Option 1: Using a named template defined in skillConfig
  const renderedPrompt = yield* promptApi.renderTemplate({
      templateName: skillConfig.promptTemplateName, // Assume skill config has template name
      context: { // Combine context data
          persona: persona, // Pass full persona object? Or just relevant fields?
          skill: skillConfig,
          input: inputData,
          // history: chatHistory, // Add memory later
      }
  });

  // Option 2: Rendering a string directly (maybe constructed from 
