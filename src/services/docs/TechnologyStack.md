# EffectiveAgent Services: Core Technology Stack

This document outlines the primary technologies used to build the backend services for the EffectiveAgent framework, including development and target production environments.

## Core Stack

*   **Runtime:** **Bun**
    *   Chosen for its performance, integrated tooling (bundler, test runner, package manager), and built-in APIs like SQLite and modern web standards support, especially beneficial for local development and testing.
*   **Language:** **TypeScript (v5.x)**
    *   Provides strong typing essential for building robust and maintainable systems, especially when combined with Effect-TS.
    *   **Conventions:** We adhere to modern TypeScript best practices, specifically:
        *   **Avoiding `enum`:** Preferring string literal unions or `as const` objects.
        *   **Avoiding `namespace`:** Using ES Modules (`import`/`export`) exclusively for code organization.
*   **Core Framework:** **Effect-TS**
    *   The foundation for the entire backend. Leveraged for its functional programming paradigm, superior concurrency and resource management (Fibers), integrated dependency injection (Context/Layer), typed error handling, and platform abstractions. We primarily use `@effect/platform-bun` for runtime integration during development/testing.
*   **Date/Time Handling:** **Temporal API** (TC39 Proposal)
    *   Adopted for its immutability, explicit type system (`Instant`, `ZonedDateTime`, `PlainDate`, etc.), and improved correctness over the legacy `Date` object. Leverages Bun's native support. Requires consistent serialization (ISO 8601 strings) for persistence and APIs.
*   **Schema Definition & Validation:** **Zod** (via `@effect/schema`)
    *   Used for defining data structures and validating them at runtime, ensuring data integrity throughout the system. `@effect/schema` provides seamless integration.
*   **Templating Engine:** **LiquidJS**
    *   Used primarily by the Prompt service (`@ai/prompt`) for rendering dynamic prompt templates before interacting with LLMs. Chosen for its safety and simplicity.
*   **Testing Framework:** **Vitest** (with `@effect/vitest`)
    *   A modern and fast test runner. `@effect/vitest` enables idiomatic testing of Effect-based code. Path aliases are resolved using `vite-tsconfig-paths`.

## Persistence & Data Access

*   **ORM:** **Drizzle ORM**
    *   Selected for its TypeScript-first approach, performance, type safety, and compatibility with PostgreSQL. Used for defining database schemas and generating/executing SQL queries. Requires mapping Temporal types to SQL timestamps (likely via ISO strings).
*   **Production Database:** **PostgreSQL**
    *   A robust, open-source relational database suitable for production workloads.
*   **Development/Testing Database:** **SQLite** (via Bun's built-in driver)
    *   Utilized for local development and testing due to its simplicity and integration with the Bun runtime. Accessed through Effect-based repository layers.
*   **Database Hosting (Production):** **Neon**
    *   A serverless PostgreSQL platform chosen for its scalability, developer experience, and seamless integration with Vercel.

## Agent & AI Integration

*   **Agent Framework:** **LangGraph**
    *   Adopted as the default framework for defining and executing agent logic as state machines or graphs. Integrated within the `execution` services.
*   **AI SDK/Tooling:** **Vercel AI SDK**
    *   Used as the primary toolkit for interacting with AI models, particularly for standardized streaming responses, UI components (if applicable later), and potentially some provider abstractions.
*   **Model Access:**
    *   **Direct Provider SDKs:** Specific SDKs (e.g., `@ai-sdk/openai`, `@ai-sdk/anthropic`) wrapped within the `@ai/provider` Effect service for primary model interactions.
    *   **OpenRouter:** Utilized as an option for accessing a wider variety of specialized or less common LLMs 
