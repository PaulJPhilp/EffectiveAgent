# ${ServiceNamePascal} Service - Architecture Document

**Version:** 1.0
**Date:** $(date +%Y-%m-%d)

## 1. Overview

*(TODO: Describe the purpose and high-level design of the ${ServiceNamePascal} service.)*

## 2. Core Responsibilities

*(TODO: List the main tasks this service performs.)*

## 3. Key Components

*   **`${ServiceNamePascal}Api` (Interface / Tag):** (`types.ts`) Defines the public contract.
*   **`${ServiceNamePascal}Configuration` (Interface / Tag):** (`types.ts`) Defines access to domain configuration.
*   **`${ServiceNamePascal}ConfigurationLive` (Implementation / Layer):** (`configuration.ts`) Loads domain config (e.g., \`${serviceName}.json\`) via \`ConfigLoaderApi\`.
*   **`${ServiceNamePascal}ApiLive` (Implementation / Layer):** (`main.ts`) Implements the core service logic.
    *   **Dependencies:** \`${ServiceNamePascal}Configuration\`, \`LoggingApi\`, *(List other required services/tags)*.
*   **Error Types:** (`errors.ts`) Specific errors for this service.
*   **Schemas:** (`schema.ts`) Zod schemas for configuration or internal data.

## 4. Core Logic Flows

*(TODO: Describe key workflows, e.g., how \`doSomething\` method works.)*

## 5. Interaction with Dependencies

*(TODO: Detail how this service uses its dependencies like LoggingApi, ConfigLoaderApi, other services.)*

## 6. Error Handling

*(TODO: Describe how errors from dependencies and internal logic are handled and mapped.)*

