# Summary: Model Context Protocol (MCP)

## 1. Introduction: Beyond Stateless Tool Calling

Current AI agent development often relies on basic "tool calling" or "function calling" mechanisms (popularized by OpenAI and adopted by frameworks like Vercel AI SDK and LangChain). While useful, this approach has limitations:

*   **Statelessness:** Each tool call is typically independent and stateless. The LLM calls a function, gets a result, and the interaction ends. Managing ongoing state related to the tool's operation (e.g., a database connection, a user session, an evolving calculation) requires complex handling within the agent's orchestration logic.
*   **Limited Interaction:** The interaction is usually a simple request/response. More complex operations like streaming updates, querying structured data within a resource, or managing resource lifecycles are not inherently supported.
*   **Ad-hoc Definitions:** Tool definitions (especially schemas) are often tied to specific LLM provider formats (like OpenAI's JSON Schema dialect) or framework choices (like Zod/Pydantic). There's no universal standard for describing or interacting with these external capabilities.
*   **LLM Burden:** The LLM often needs the full definition of every possible tool upfront, which can consume valuable context window space.

The **Model Context Protocol (MCP)** aims to address these limitations by defining a **standardized, stateful protocol** for communication between AI applications (Clients) and specialized backend services (MCP Servers). It acts as a richer, more structured alternative to basic function calling, drawing analogies to protocols like HTTP/REST or GraphQL but tailored for AI interactions.

## 2. Core Architecture: Clients, Servers, and Resources

MCP establishes a client-server architecture:

*   **MCP Client:** The AI application or agent framework (like EffectiveAgent) acts as the client. It understands the MCP protocol and sends requests to MCP Servers.
*   **MCP Server:** A backend service that exposes capabilities and manages stateful **Resources** according to the MCP protocol. It handles the actual interaction with underlying databases, APIs, or computational logic. Examples could include servers managing database connections, user sessions, specific API integrations (GitHub, Spotify), or even computational tasks (like a stateful calculator or simulation).
*   **Resources:** The central concept in MCP. Resources are stateful entities managed by the MCP Server (e.g., a specific database connection, a user's Spotify playback state, a document being edited, a specific GitHub repository). Clients interact with these resources over time using standard operations. Resources have unique identifiers.
*   **Protocol:** Defines a set of standard **operations (verbs)** that clients can perform on resources (e.g., `create`, `read`, `update`, `delete`, `invoke`, `query`, `watch`). It also defines the structure of requests and responses, including error handling.
*   **Transport:** Specifies how MCP messages are exchanged (currently focused on HTTP/S).

This architecture decouples the agent's core reasoning logic (Client) from the implementation details and state management of specific capabilities (Server).

## 3. Key Concepts Explained

*   **Resources:** The core abstraction. Instead of calling a stateless function `searchDatabase(query)`, an MCP client might first `create` a `databaseConnection` resource on a Database MCP Server, then `invoke` a `query` operation *on that specific resource*, potentially keeping the connection open for multiple queries. This makes interactions stateful. Resources are identified by URIs or IDs.
*   **Operations (Verbs):** MCP defines standard verbs, making interactions predictable:
    *   `CREATE`: Instantiate a new resource (e.g., create a new document, start a new session).
    *   `READ`: Retrieve the state or properties of a resource.
    *   `UPDATE`: Modify the state or properties of a resource.
    *   `DELETE`: Terminate or remove a resource.
    *   `INVOKE`: Trigger a specific action or method on a resource (e.g., `invoke` the `play` action on a `spotifyPlayer` resource). This is the closest parallel to traditional function calling but operates on a stateful resource.
    *   `QUERY`: Fetch structured data related to a resource, potentially with filtering/sorting parameters (akin to GraphQL or SQL SELECT).
    *   `WATCH`: (Likely) Subscribe to changes or events on a resource (for streaming/reactivity).
*   **Prompts:** MCP integrates prompt management concepts. Servers can expose prompt templates associated with resources or operations. Clients can request these templates, fill them, and potentially send them back to the server for execution against an LLM managed by the server, or use them locally. This allows servers to provide specialized prompting strategies.
*   **Tools (in MCP context):** MCP re-frames "tools". An MCP Server *exposes* its capabilities as operations on resources. The server's definition (potentially discoverable via a `Root` resource) describes these available resources and operations, acting like a tool manifest. The AI/LLM uses this description to formulate MCP requests (e.g., "I need to `invoke` the `play` operation on the `spotifyPlayer` resource").
*   **Sampling:** Parameters controlling LLM generation (temperature, top_p, etc.) can be included in MCP requests, allowing clients to influence generation when invoking operations that involve LLMs on the server side.
*   **Roots:** Well-known entry points on an MCP server that allow clients to discover available resource types and capabilities.
*   **Transports:** Currently focuses on HTTP/S, defining how MCP requests/responses map to HTTP methods, headers, and bodies.

## 4. Benefits of MCP

*   **Stateful Interactions:** Natively supports interactions with resources that maintain state over time (connections, sessions, documents).
*   **Standardization:** Provides a common protocol for diverse backend capabilities, promoting interoperability and potentially creating an ecosystem of reusable MCP servers.
*   **Decoupling:** Separates agent logic from the implementation details of external services or complex computations.
*   **Richer Capabilities:** Enables more complex interactions than simple function calls (e.g., structured queries, resource lifecycle management).
*   **Specialized Servers:** Allows for the creation of optimized backend servers focused on specific tasks (database access, API integration, computation) exposed via a standard AI-friendly protocol. The "calculator MCP server" example fits here – a dedicated server handling calculations statefully if needed.

## 5. Comparison to Basic Tool/Function Calling

| Feature         | Basic Tool Calling (OpenAI, Vercel SDK) | Model Context Protocol (MCP)                 |
| :-------------- | :-------------------------------------- | :------------------------------------------- |
| **State**       | Primarily Stateless                     | Stateful (via Resources)                     |
| **Interaction** | Simple Request/Response                 | Richer (CRUD, Invoke, Query, Watch)          |
| **Protocol**    | Ad-hoc / LLM Provider Specific          | Standardized Protocol                        |
| **Focus**       | Triggering external functions           | Interacting with managed Resources           |
| **Server**      | N/A (Logic in agent/wrapper code)       | Dedicated MCP Server manages resource/logic  |
| **Schema**      | JSON Schema (for LLM)                   | Protocol defines request/response structures |

## 6. Ecosystem

*   **SDKs:** TypeScript SDK exists to help build clients and potentially servers. Vercel AI SDK has added experimental support.
*   **Example Servers:** Implementations exist for interacting with databases (Postgres), APIs (GitHub, Fetch), and concepts like Memory, demonstrating feasibility.

---

## Recommendation for EffectiveAgent Integration

MCP offers a powerful, standardized way to interact with stateful or complex backend capabilities, complementing rather than replacing simpler tool execution mechanisms. Integrating MCP support into EffectiveAgent seems highly beneficial and aligns with the goal of building sophisticated agents.

**Recommended Approach: MCP as a Tool Implementation Type**

The most seamless way to integrate MCP is to treat it as another **`ToolImplementation`** type within our existing Tool System architecture:

1.  **Define `McpImplementation` Type (`core/tool/types.ts`):**
    ```typescript
    import { Schema } from "effect";
    // ... other implementation types ...

    export type McpImplementation<Input = any, Output = any> = {
        readonly _tag: "McpImplementation";
        // Schemas to validate data *before* sending to MCP server
        // and *after* receiving the response, before returning to agent.
        readonly inputSchema: Schema.Schema<Input>;
        readonly outputSchema: Schema.Schema<Output>;
        // Configuration needed to make the MCP call:
        readonly serverUrl: string; // Base URL of the MCP Server
        readonly resourcePath: string; // Path/ID of the target resource (can be dynamic)
        readonly operation: "CREATE" | "READ" | "UPDATE" | "DELETE" | "INVOKE" | "QUERY"; // MCP Verb
        // Optional: Authentication details/reference, specific headers, etc.
        // Optional: Mappings for how Input maps to MCP request body/params
    };

    // Add to the main union
    export type ToolImplementation = EffectImplementation | HttpImplementation | McpImplementation /* | ... */;
    ```

2.  **Update `ToolExecutorService` (`core/tool/live.ts`):**
    *   Add a `case "McpImplementation":` to the `run` method's dispatch logic (`switch` statement).
    *   This case will require an **`McpClient`** service to be injected into the `ToolExecutorService`. This client (which could be built using the `typescript-sdk` or a generic `HttpClient` formatted for MCP) handles the actual protocol communication.
    *   The logic within this case will:
        *   Retrieve the `McpImplementation` details (serverUrl, resourcePath, operation, etc.).
        *   Use the `validatedInput` and the implementation details to construct the appropriate MCP request payload.
        *   Use the injected `McpClient` to send the request to the `serverUrl`.
        *   Receive the MCP response.
        *   Handle MCP-level errors (protocol errors, server errors) and wrap them in `ToolExecutionError`.
        *   Extract the relevant data payload from the successful MCP response. This becomes the `rawOutput`.
        *   *(The existing output validation step using `outputSchema` will then validate this `rawOutput` before returning).*

3.  **Implement `McpClient` Service:**
    *   Create a new service (`core/mcp`?) responsible for making MCP calls.
    *   `McpClientLiveLayer` would likely depend on `HttpClient` and potentially auth services.
    *   It would provide methods like `sendRequest(url, operation, payload): Effect<McpResponse, McpClientError>`.

4.  **User Experience:**
    *   A developer wanting to use an existing MCP Server (e.g., the standard library calculator server) defines an `EffectiveTool` in their project.
    *   They specify `implementation: { _tag: "McpImplementation", serverUrl: "...", resourcePath: "/calculator/session1", operation: "INVOKE", inputSchema: ..., outputSchema: ... }`.
    *   They register this tool in their `EffectiveWorkspace` using the builder.
    *   The agent calls the tool by name (`toolExecutor.run("myMcpCalculator", {...})`). The `ToolExecutorService` handles the MCP protocol interaction transparently.

**Benefits of this Integration:**

*   **Leverages MCP Ecosystem:** Allows EffectiveAgent agents to easily interact with any standard MCP server.
*   **Handles Complexity:** Abstracts the MCP protocol details away from the agent logic and tool implementer (if they are just *using* an existing MCP server).
*   **Consistent Interface:** Uses the same `ToolExecutorService.run` interface for all tool types.
*   **Validation:** Maintains Effect Schema validation for data entering/leaving the MCP interaction.
*   **Extensibility:** Fits naturally into the existing extensible tool architecture.

**Conclusion:** Integrating MCP as a distinct `ToolImplementation` type handled by the `ToolExecutorService` (using a dedicated `McpClient`) is the recommended approach. It allows EffectiveAgent to leverage the power and standardization of MCP for stateful/complex interactions without replacing the framework's core architecture or simpler tool types.
