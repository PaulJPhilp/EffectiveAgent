Okay, Paul. Based on your requirements and the provided `ToolService` example, here is a detailed Product Requirements Document (PRD) for the `MCPClientService`. This service aims to provide a robust and developer-friendly way to integrate and use various Multi-Channel Platform (MCP) clients within your Effect-based agent framework.

---

## Product Requirements Document: MCP Client Service

**Version:** 1.0
**Date:** 2024-07-26
**Author:** T3 Chat (Assisted by Paul)

**1. Overview**

This document outlines the requirements for the `MCPClientService`, a core component of the Effect-based agent framework. This service will manage the lifecycle, configuration, and access to various Multi-Channel Platform (MCP) clients (e.g., Gmail, HubSpot, GitHub, Slack). Its primary goal is to abstract the complexities of authentication, configuration, and API interaction, allowing agent authors to easily leverage external services through a consistent, Effect-native interface. The design will draw parallels from the existing `ToolService` pattern for familiarity and consistency within the framework.

**2. Goals**

*   **Centralized Management:** Provide a single service (`MCPClientService`) responsible for registering, configuring, and providing access to MCP clients.
*   **Simplified Integration:** Enable agent authors to use MCP clients (e.g., send an email via Gmail, create a contact in HubSpot) with minimal boilerplate code, focusing on the agent's logic rather than API specifics.
*   **Configuration Abstraction:** Leverage the existing `ConfigurationService` to securely manage and inject necessary credentials and settings (API keys, URLs, etc.) for each MCP client.
*   **Extensibility:** Allow both the framework maintainers (via a standard library) and agent authors (via custom implementations) to register new MCP clients.
*   **Type Safety & Error Handling:** Utilize Effect-TS and Zod for robust type checking, dependency management, and structured error handling specific to client operations.
*   **Consistency:** Follow patterns established by other framework services like `ToolService` (registration, retrieval, error types, logging integration).
*   **Standard Library:** Provide a set of commonly used MCP clients out-of-the-box (e.g., Gmail, GitHub, HubSpot).

**3. Non-Goals**

*   **Implementing All Possible Clients:** The initial version will include a *selection* of standard clients, not an exhaustive list.
*   **UI for Client Management:** This service focuses on programmatic management within the framework; no graphical user interface is planned.
*   **Complex OAuth Flow Management within the Service:** While individual clients might *implement* OAuth flows internally or require pre-configured tokens, the `MCPClientService` itself will not be an OAuth authorization server or manage user-facing consent screens. It expects configuration (like tokens or client secrets) to be provided via the `ConfigurationService`.
*   **Replacing `ToolService`:** MCP Clients are distinct from Tools. Tools are typically functions executed by the agent, potentially using MCP Clients internally. MCP Clients represent direct interfaces to external services.

**4. User Stories**

*   **As an Agent Author, I want to:**
    *   Easily get an initialized and authenticated Gmail client instance by requesting it from the `MCPClientService`.
    *   Call methods on the obtained Gmail client (e.g., `sendEmail`, `listMessages`) using an Effect-based API.
    *   Register my company's custom internal API client with the `MCPClientService` so my agents can use it alongside standard clients.
    *   Be confident that API keys and other sensitive configurations are handled securely by the framework.
    *   Receive clear, typed errors if a client is unavailable, misconfigured, or fails during an operation.
*   **As a Framework Maintainer, I want to:**
    *   Add new standard MCP clients (e.g., Slack, Jira) to the framework's standard library.
    *   Define the required configuration schema (using Zod) for each standard client.
    *   Ensure the `MCPClientService` integrates seamlessly with logging and configuration services.

**5. Functional Requirements**

*   **5.1. `MCPClientService` Interface & Implementation:**
    *   Define an `MCPClientService` interface using `Effect.Tag`.
    *   Provide a live implementation (`MCPClientServiceLive`) similar in structure to `ToolServiceLive`.
    *   The service will depend on `LoggingService` and `ConfigurationService`.
    *   Maintain an internal registry of `MCPClient` definitions.
*   **5.2. `MCPClient` Definition:**
    *   Define a structure or interface for an `MCPClient` definition (`AnyMCPClient`). This should include:
        *   `id`: A unique string identifier (e.g., "gmail", "hubspot", "custom-crm").
        *   `name`: A human-readable name (e.g., "Gmail Client").
        *   `description`: A brief description of the client's purpose.
        *   `tags?`: Optional list of strings for categorization/filtering.
        *   `configSchema`: A Zod schema defining the required configuration object for this client.
        *   `initialize`: An Effect-ful function that takes the validated configuration and an `MCPClientExecutionContext` and returns an initialized client instance (or an object containing the client's methods).
            *   `Input`: Validated configuration object, `MCPClientExecutionContext`.
            *   `Output`: `Effect.Effect<ClientInstance, ClientInitializationError>` where `ClientInstance` provides the actual methods (e.g., `{ sendEmail: (...) => Effect<...> }`).
*   **5.3. `MCPClientExecutionContext`:**
    *   Define a context object passed during client initialization and potentially to client methods, containing:
        *   `loggingService: ILoggingService`
        *   `configurationService: ConfigurationService`
        *   (Potentially other relevant framework services)
*   **5.4. Client Registration (`registerClient`):**
    *   Method signature: `registerClient(client: AnyMCPClient): Effect.Effect<void, ClientRegistrationError>`
    *   Adds a client definition to the internal registry.
    *   Fails with `ClientRegistrationError` if a client with the same `id` is already registered.
    *   Logs registration success or failure.
*   **5.5. Client Retrieval (`getClient`):**
    *   Method signature: `getClient<T extends AnyMCPClient>(clientId: T['id']): Effect.Effect<InitializedClient<T>, ClientNotFoundError | ClientConfigurationError | ClientInitializationError>`
        *   Where `InitializedClient<T>` represents the specific type returned by the `initialize` function of the client definition `T`.
    *   Retrieves the client definition by `id`. Fails with `ClientNotFoundError` if not found.
    *   Fetches the required configuration from `ConfigurationService` based on the client's `id` (e.g., looking under a specific key like `mcpClients.${clientId}`).
    *   Validates the fetched configuration against the client's `configSchema`. Fails with `ClientConfigurationError` if configuration is missing or invalid.
    *   Calls the client's `initialize` function with the validated configuration and context. Fails with `ClientInitializationError` if initialization fails.
    *   Returns the initialized client instance (containing its operational methods).
    *   Implement caching for initialized clients (keyed by `clientId`) to avoid redundant initialization and configuration fetching within the same scope/request, if feasible and desirable.
*   **5.6. List Clients (`listClients`):**
    *   Method signature: `listClients(options?: { tags?: readonly string[] }): Effect.Effect<AnyMCPClient[], never>`
    *   Returns an array of all registered `MCPClient` definitions.
    *   Optionally filters clients based on provided tags.
*   **5.7. Error Handling:**
    *   Define specific, typed error classes extending a base `MCPClientError`:
        *   `ClientRegistrationError`: For issues during registration (e.g., duplicate ID).
        *   `ClientNotFoundError`: When a requested client ID doesn't exist.
        *   `ClientConfigurationError`: When configuration is missing, invalid (schema validation fails), or cannot be fetched. Includes underlying Zod issues if applicable.
        *   `ClientInitializationError`: When the client's `initialize` function fails.
        *   `ClientExecutionError`: (To be potentially returned by the *methods* of the initialized client, not the service itself) For errors during the execution of a client method (e.g., API call failed, rate limit hit).
*   **5.8. Logging:**
    *   Integrate with `LoggingService` for detailed logging of service operations (registration, retrieval attempts, initialization, errors) with appropriate context (e.g., `clientId`, `service: "MCPClientService"`).
*   **5.9. Standard Library:**
    *   Provide implementations for a baseline set of clients (e.g., Gmail, GitHub, HubSpot) as part of the framework. These should be easily registerable.

**6. Non-Functional Requirements**

*   **Performance:** Client retrieval and initialization should be reasonably fast. Consider lazy initialization or caching where appropriate.
*   **Security:** Configuration containing secrets (API keys, tokens) must be handled securely via the `ConfigurationService`. The `MCPClientService` should not log sensitive configuration values.
*   **Reliability:** The service should be robust against configuration errors and client initialization failures, providing clear error messages.
*   **Maintainability:** Code should be well-structured, documented, and follow Effect-TS best practices.
*   **Testability:** The service and individual clients should be designed for unit and integration testing. Dependencies should be mockable.

**7. API Design (Conceptual - Effect-TS)**

```typescript
import { Effect, Context, Layer } from "effect";
import { z } from "zod";
import { type ConfigurationService } from "../configuration/configuration-service.js"; // Adjust path
import { type ILoggingService } from "../logging/types/index.js"; // Adjust path
import {
    ClientConfigurationError,
    ClientInitializationError,
    ClientNotFoundError,
    ClientRegistrationError
} from "./errors/index.js"; // Define these errors

// Context passed to client initialization and potentially methods
export interface MCPClientExecutionContext {
    readonly loggingService: ILoggingService;
    readonly configurationService: ConfigurationService;
    // Potentially other services
}

// Base interface for any MCP Client Definition
export interface MCPClient<
    ID extends string,
    ConfigSchema extends z.ZodTypeAny,
    ClientInstance
> {
    readonly id: ID;
    readonly name: string;
    readonly description: string;
    readonly tags?: readonly string[];
    readonly configSchema: ConfigSchema;
    readonly initialize: (
        config: z.output<ConfigSchema>,
        context: MCPClientExecutionContext
    ) => Effect.Effect<ClientInstance, ClientInitializationError>;
}

// Type helper for AnyMCPClient
export type AnyMCPClient = MCPClient<string, z.ZodTypeAny, unknown>;

// Type helper to extract the initialized client type
export type InitializedClient<T extends AnyMCPClient> = T extends MCPClient<
    any,
    any,
    infer Instance
>
    ? Instance
    : never;

// Service Interface
export interface IMCPClientService {
    readonly registerClient: (
        client: AnyMCPClient
    ) => Effect.Effect<void, ClientRegistrationError>;

    readonly getClient: <T extends AnyMCPClient>(
        clientId: T["id"]
    ) => Effect.Effect<
        InitializedClient<T>,
        | ClientNotFoundError
        | ClientConfigurationError
        | ClientInitializationError
    >;

    readonly listClients: (options?: {
        readonly tags?: readonly string[];
    }) => Effect.Effect<AnyMCPClient[], never>;
}

// Service Tag
export class MCPClientService extends Context.Tag("MCPClientService")<
    MCPClientService,
    IMCPClientService
>() {}

// Example Live Implementation Structure (Conceptual)
export class MCPClientServiceLive implements IMCPClientService {
    private readonly clientRegistry = new Map<string, AnyMCPClient>();
    // Optional: Cache for initialized clients
    private readonly initializedClientCache = new Map<string, unknown>(); 

    constructor(
        private readonly loggingService: ILoggingService,
        private readonly configurationService: ConfigurationService
    ) {}

    registerClient(
        client: AnyMCPClient
    ): Effect.Effect<void, ClientRegistrationError> {
        // Implementation similar to ToolService.registerTool
        // ...
    }

    getClient<T extends AnyMCPClient>(
        clientId: T["id"]
    ): Effect.Effect<
        InitializedClient<T>,
        | ClientNotFoundError
        | ClientConfigurationError
        | ClientInitializationError
    > {
        // Implementation steps:
        // 1. Check cache (optional)
        // 2. Get definition from registry (handle ClientNotFoundError)
        // 3. Fetch config from ConfigurationService (handle potential errors -> ClientConfigurationError)
        // 4. Validate config using client.configSchema (handle ZodError -> ClientConfigurationError)
        // 5. Create MCPClientExecutionContext
        // 6. Call client.initialize(validatedConfig, context) (handle ClientInitializationError)
        // 7. Store in cache (optional)
        // 8. Return initialized client
        // ...
    }

    listClients(
        options?: { readonly tags?: readonly string[] }
    ): Effect.Effect<AnyMCPClient[], never> {
        // Implementation similar to ToolService.listTools
        // ...
    }
}

// Example Layer (Conceptual - address potential Layer issues carefully)
/*
export const MCPClientServiceLiveLayer = Layer.effect(
    MCPClientService,
    Effect.gen(function* (_) {
        const loggingService = yield* _(LoggingService); // Assuming LoggingService Tag exists
        const configurationService = yield* _(ConfigurationService); // Assuming ConfigurationService Tag exists
        // @ts-expect-error - Placeholder for potential Layer/Tag issues
        return MCPClientService.of(new MCPClientServiceLive(loggingService, configurationService));
    })
);
*/
```

**8. Error Handling (Summary)**

*   **`MCPClientError`** (Base class)
*   **`ClientRegistrationError`**: Duplicate client ID during registration.
*   **`ClientNotFoundError`**: Requested client ID not found in the registry.
*   **`ClientConfigurationError`**: Failed to fetch, validate (Zod), or access required configuration. Contains original error/Zod issues.
*   **`ClientInitializationError`**: The `initialize` method of the client definition failed. Contains original error.
*   *(Client-Specific)* **`ClientExecutionError`**: Errors occurring *during* the execution of a method on an *initialized* client (e.g., API call failure). These should be defined and returned by the client's methods themselves, not the service.

**9. Configuration**

*   The `MCPClientService` will rely on the `ConfigurationService`.
*   Each `MCPClient` definition must provide a `configSchema` (Zod).
*   The framework expects configuration for clients to be structured predictably within the overall application configuration (e.g., under a top-level `mcpClients` key, keyed by `clientId`).
    ```json
    {
      "mcpClients": {
        "gmail": {
          "apiKey": "...", // Example
          "clientId": "...",
          "clientSecret": "..." 
        },
        "hubspot": {
          "apiKey": "...",
          "portalId": "..."
        },
        "custom-crm": {
          "apiUrl": "...",
          "authToken": "..."
        }
      }
      // ... other config
    }
    ```
*   Secure handling of secrets within the `ConfigurationService` is assumed.

**10. Standard Library Clients (Initial Scope)**

The framework should aim to provide implementations for:

1.  **GitHub:** Basic operations (e.g., get repo info, list issues, create issue).
2.  **Gmail:** Basic operations (e.g., send email, list labels, search messages). Requires careful consideration of authentication (likely service account or pre-authorized token).
3.  **HubSpot:** Basic CRM operations (e.g., create/get contact, create/get company).

**11. Open Questions / Future Considerations**

*   **Caching Strategy:** What is the optimal caching strategy for initialized clients? Per-request scope, time-based, or none?
*   **Authentication Patterns:** How to best guide developers in handling complex auth flows (like user-level OAuth2) required by some clients? Should clients expose methods to initiate flows or expect pre-acquired tokens?
*   **Rate Limiting/Retries:** Should the `MCPClientService` or individual client implementations handle API rate limits and retry logic? (Likely best handled within the specific client implementation using Effect's built-in scheduling/retry features).
*   **Client Method Context:** Should the `MCPClientExecutionContext` be passed to *every* method of an initialized client, or only during `initialize`? Passing it to methods allows for contextual logging per operation.

---