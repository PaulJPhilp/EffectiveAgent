# PersonaConfiguration Service - Architecture Document

**Version:** 1.0
**Date:** $(date +%Y-%m-%d)

## 1. Overview

This service is responsible for loading, validating, and providing access to pre-defined Personality configurations (e.g., from `personas.json`). Personalities define communication style, tone, and output constraints, primarily influencing the system prompts used in LLM interactions. It acts as a configuration provider for other services like `SkillApi` or `ThreadApi`.

## 2. Core Responsibilities

*   Load persona definitions from a specified configuration source (e.g., `personas.json`) using `ConfigLoaderApi`.
*   Validate loaded definitions against `PersonasConfigSchema`.
*   Provide methods to retrieve specific `Persona` definitions by name (`getPersonaByName`) and list all available personas (`listPersonas`).
*   Handle errors related to loading, parsing, or validating the configuration file.
*   (Potentially) Cache the loaded configuration data (currently disabled due to type inference issues).

## 3. Key Components

*   **`PersonaConfiguration` (Interface / Tag):** (`types.ts`) Defines the public contract.
*   **`PersonaConfigurationLive` (Implementation):** (`configuration.ts`) Implements the service logic.
    *   **Dependencies:** `ConfigLoaderApi` (and its transitive dependencies: `FileSystem`, `Path`, `ConfigLoaderOptions`).
*   **`PersonaConfigurationLiveLayer` (Layer):** (`configuration.ts`) Provides the live implementation for the `PersonaConfiguration` Tag. Requires `ConfigLoaderApi` and its dependencies.
*   **`PersonaSchema`, `PersonasConfigSchema`:** (`schema.ts`) Zod schemas for validation.
*   **`PersonaConfigurationError`, `PersonaNotFoundError`:** (`errors.ts`) Specific error types.
*   **`loadPersonasConfigEffect` (Internal Effect):** Contains the logic for loading, parsing, validating, and processing the configuration file.

## 4. Core Logic Flows

*   **Initialization:** When the `PersonaConfigurationLiveLayer` is first used, the `loadPersonasConfigEffect` is executed (via the `getConfig` helper). It calls `ConfigLoaderApi.loadConfig`, validates the result with `PersonasConfigSchema`, transforms the array into a record, and returns it. (Caching is currently disabled).
*   **`getPersonaByName(name)`:** Calls `getConfig`, then uses `Record.get` on the `personas` record. If the name exists (`Some`), it returns `Effect.succeed` with the `Persona` object. If not (`None`), it returns `Effect.fail` with `PersonaNotFoundError`.
*   **`listPersonas()`:** Calls `getConfig`, then uses `Record.values` to return an array of all loaded `Persona` objects.

## 5. Interaction with Dependencies

*   **`ConfigLoaderApi`:** Used to read, parse, and validate the `personas.json` file. This service relies entirely on `ConfigLoaderApi` for file access and initial validation.

## 6. Error Handling

*   Errors from `ConfigLoaderApi` (read, parse, validation) are caught and mapped to `PersonaConfigurationError`.
*   `getPersonaByName` fails with `PersonaNotFoundError` if the requested name doesn't exist in the loaded configuration.

