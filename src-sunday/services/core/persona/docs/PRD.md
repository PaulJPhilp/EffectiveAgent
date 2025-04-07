# PersonaConfiguration Service - Product Requirements Document (PRD)

**Version:** 1.0
**Date:** $(date +%Y-%m-%d)

## 1. Overview

The PersonaConfiguration service provides a mechanism for AI developers and engineers using the EffectiveAgent framework to define, manage, and access reusable "Personalities". A Personality encapsulates the communication style, tone, identity, and output constraints for an AI agent or a specific Skill, primarily by defining system prompt fragments and related parameters. This service loads these definitions from a configuration source (e.g., `personas.json`) and makes them available to other services responsible for constructing LLM prompts.

## 2. Goals

*   **Declarative Personality:** Allow developers to define AI personalities declaratively in configuration files.
*   **Reusability:** Enable defined personalities to be reused across different agents or skills.
*   **Configuration Access:** Provide a type-safe Effect-based API (`PersonaConfiguration`) for retrieving specific personality definitions by name.
*   **Validation:** Ensure loaded personality definitions conform to a defined schema (`PersonaSchema`).
*   **Centralization:** Offer a central point for managing personality definitions within the framework.

## 3. Non-Goals

*   **Prompt Assembly:** Does not assemble the final system prompt by combining persona fragments with skill/task instructions (this is the responsibility of the service making the LLM call, e.g., `SkillApi`).
*   **Prompt Templating:** Does not render templates (handled by `PromptApi`).
*   **Runtime Personality Switching:** Does not manage the *active* personality for a given thread (handled by `ThreadApi` or agent logic). This service only provides the definitions.
*   **Defining Personas:** Does not provide a UI or complex logic for *creating* personality definitions; it only loads pre-defined ones.

## 4. User Stories / Use Cases

*   **As a `SkillApi` service, I want to:**
    *   Retrieve the `Persona` definition specified in a `Skill` configuration by name, so that I can use its `systemPrompt` and `outputConstraints` when assembling the final prompt for the LLM.
*   **As a `ThreadApi` service, I want to:**
    *   Retrieve the default `Persona` definition for an agent or thread by name, so that I can use its `systemPrompt` for general interactions when no specific skill persona is active.
*   **As an AI Developer, I want to:**
    *   Define multiple personalities (e.g., "formal", "casual", "codeHelper") in a `personas.json` file.
    *   Reference these personalities by name within my Agent or Skill configurations.

## 5. Functional Requirements

*   **FR-PERS-01:** The service MUST load personality definitions from a designated configuration file (e.g., `personas.json`) using `ConfigLoaderApi`.
*   **FR-PERS-02:** The loaded definitions MUST be validated against the `PersonasConfigSchema`.
*   **FR-PERS-03:** The service MUST provide a `getPersonaByName(name)` method that returns the corresponding `Persona` object or fails with `PersonaNotFoundError`.
*   **FR-PERS-04:** The service MUST provide a `listPersonas()` method that returns all loaded `Persona` definitions.
*   **FR-PERS-05:** Errors during loading, parsing, or validation MUST be mapped to `PersonaConfigurationError`.

## 6. API Design (Conceptual)

Reference `types.ts` for the `PersonaConfiguration` interface definition.

```typescript
// Example Usage (Conceptual by SkillApi)
Effect.gen(function*() {
  const personaConfig = yield* PersonaConfiguration;
  const skillConfig = yield* SkillConfiguration.getSkillDefinitionByName("mySkill");

  const personaName = skillConfig.personaName ?? "default"; // Get persona name
  const persona = yield* personaConfig.getPersonaByName(personaName);

  const systemPrompt = persona.systemPrompt + "\n" + skillConfig.promptTemplate; // Combine prompts
  // ... prepare rest of LLM request ...
})
