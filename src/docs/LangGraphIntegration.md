
## EffectiveAgent Service Integration Design

**Version:** 1.0
**Date:** October 26, 2023
**Status:** Proposed

### 1. Introduction & Goals

This document outlines the design for integrating EffectiveAgent's (EA) backend services and capabilities with agents developed by users, initially targeting agents built with the LangGraph.js framework. The primary goal is to provide a seamless and powerful developer experience, allowing users to leverage EA's features without needing deep expertise in EA's internal Effect-TS architecture.

**Key Design Goals:**

*   **Abstraction for Developers:** Developers using LangGraph to build agents should not be required to write or understand Effect-TS code to utilize EA services. Standard JavaScript/TypeScript `async/await` patterns should suffice.
*   **Seamless LangGraph Integration:** The design must align with common LangGraph patterns for state management, node execution, and tool usage.
*   **Comprehensive Access:** Developers should have access to:
    *   Generic EA services (e.g., LLM interactions, weather information, vector stores).
    *   Pre-configured, named EA "Pipelines" (e.g., specialized summarization, sentiment analysis).
*   **Support for LangGraph Tools:** Developer-defined LangGraph tools should be able to utilize EA services and pipelines if needed.
*   **Maintain EA's Internal Integrity:** EA's internal services will continue to be implemented using Effect-TS to leverage its benefits (composability, error handling, etc.).

### 2. Core Components

1.  **`AgentRuntimeService` (EA Internal):**
    *   **Role:** A core Effect-TS service within EA responsible for hosting and executing developer-defined agent applications.
    *   **Responsibilities:**
        *   Managing the lifecycle of agent instances (create, terminate).
        *   Maintaining the internal state of each agent runtime.
        *   Orchestrating the invocation of the developer's agent logic in response to activities or events.
        *   Instantiating and providing the `AgentCore` to the developer's agent.

2.  **`AgentCore` (Provided to Developer Agent):**
    *   **Purpose:** The primary bridge object that exposes all EA services and pre-configured pipelines to the developer's agent logic.
    *   **Creation:** Instantiated by `AgentRuntimeService` for each agent invocation or session.
    *   **Mechanism:** Internally, `AgentCore` methods wrap EA's Effect-native service calls. These wrappers convert Effect-based operations into Promise-based APIs using `Effect.runPromise()`, making them consumable via `async/await` in the developer's JavaScript/TypeScript code.

3.  **Developer-Defined Agent (LangGraph Application):**
    *   **Definition:** The agent logic created by the developer using LangGraph.js. This typically involves defining a state schema, nodes (as functions), and edges to create a `StateGraph`, which is then compiled into a runnable LangChain `Runnable` (referred to as `developerLangGraphApp`).
    *   **Relationship:** The `developerLangGraphApp` is provided to EA's `AgentRuntimeService` for execution.

### 3. Interaction Flow & Service Access

1.  **Agent Instantiation & `AgentCore` Creation:**
    *   The developer registers or provides their compiled `developerLangGraphApp` to EA.
    *   When an agent instance needs to run (e.g., due to an incoming request or event), `AgentRuntimeService`:
        1.  Prepares the initial input/state for the LangGraph application.
        2.  Creates an instance of `AgentCore`. This involves `AgentRuntimeService` having access to all underlying EA services and pipeline definitions required by `AgentCore`.

2.  **`AgentCore` Provisioning to LangGraph:**
    *   `AgentCore` is provided to the `developerLangGraphApp`'s `invoke` method via the `configurable` options object. This is a standard LangGraph mechanism for passing runtime configuration or context.
    *   **Example Invocation by `AgentRuntimeService`:**
        ```typescript
        // Inside AgentRuntimeService's internal workflow
        const agentCoreInstance = createAgentCore(/* necessary EA services & pipeline registry */);
        const initialGraphInput = { messages: [/* ...initial messages... */] }; // Example input
        const runtimeConfig = {
            agentCore: agentCoreInstance,
            thread_id: "unique_thread_id_for_this_run",
            // other runtime-specific configurations
        };

        const langGraphResult = await Effect.runPromise(
            Effect.tryPromise({
                try: () => developerLangGraphApp.invoke(initialGraphInput, { configurable: runtimeConfig }),
                catch: (error) => new AgentRuntimeProcessingError({ /* ... */ })
            })
        );
        // Process langGraphResult
        ```

3.  **Access within LangGraph Nodes:**
    *   Developer-defined LangGraph node functions (the JavaScript functions passed to `graph.addNode()`) receive the `configurable` object (which now includes `agentCore`) as their second argument.
    *   **Example LangGraph Node:**
        ```typescript
        // Developer's LangGraph node function
        import type { RunnableConfig } from "@langchain/core/runnables";
        import type { AgentCore } from "@effective-agent/sdk"; // EA provides this type

        interface MyAgentState { messages: BaseMessage[]; /* other state fields */ }

        async function myAgentNode(state: MyAgentState, config: RunnableConfig & { agentCore?: AgentCore }) {
            const { messages } = state;
            const { agentCore } = config;

            if (!agentCore) {
                throw new Error("AgentCore not available in node configuration.");
            }

            const latestMessage = messages[messages.length - 1].content as string;
            const llmResponse = await agentCore.llm.generateText(latestMessage, { model: "gpt-4o-mini" });
            const pipelineResult = await agentCore.pipelines.customSummarizer(latestMessage);

            return { messages: [...messages, new AIMessage(llmResponse.text), new AIMessage(pipelineResult.summary)] };
        }
        ```

4.  **Access within LangGraph-Defined Tools:**
    *   Developers can define tools for their LangGraph agents using standard LangChain patterns (e.g., `DynamicTool`, custom `Tool` subclasses).
    *   The LangGraph node responsible for tool execution (e.g., LangGraph's built-in `ToolNode` or a custom tool-executing node) also receives the `configurable` object (containing `agentCore`) from the graph's runtime.
    *   This tool-executing node should pass the `configurable` object (or relevant parts like `agentCore`) when it calls the individual tool's `invoke` method.
    *   The tool's implementation (`func` for `DynamicTool`, or `_call` for a custom `Tool`) can then access `agentCore` from its `config` argument.
    *   **Example LangGraph Tool using `AgentCore`:**
        ```typescript
        import { DynamicTool } from "@langchain/core/tools";
        import type { RunnableConfig } from "@langchain/core/runnables";
        import type { AgentCore } from "@effective-agent/sdk";

        const internalSearchTool = new DynamicTool({
            name: "searchCompanyKnowledgeBase",
            description: "Searches the company's internal knowledge base.",
            func: async (
                toolInput: string | { query: string },
                runManager?: CallbackManagerForToolRun,
                config?: RunnableConfig & { agentCore?: AgentCore }
            ): Promise<string> => {
                const agentCore = config?.agentCore;
                if (!agentCore) return "Error: AgentCore not available to tool.";

                const query = typeof toolInput === 'string' ? toolInput : toolInput.query;
                try {
                    // Assuming AgentCore has a vectorStore service or a specific pipeline
                    const results = await agentCore.vectorStore.search(query, { topK: 3 });
                    return JSON.stringify(results.map(r => r.documentContent));
                } catch (e) {
                    return `Error searching knowledge base: ${e.message}`;
                }
            }
        });
        ```

### 4. `AgentCore` Structure (Conceptual)

`AgentCore` acts as a structured namespace for all EA-provided capabilities.

```typescript
interface AgentCore {
    /** Generic Large Language Model interactions. */
    readonly llm: {
        generateText: (input: string, options: ProviderGenerateTextOptions) => Promise<GenerateTextResult>;
        generateObject: <T>(input: string, options: ProviderGenerateObjectOptions<T>) => Promise<GenerateObjectResult<T>>;
        // Potentially: streamText, streamObject
        // ... other generic LLM methods
    };

    /** Access to weather services. */
    readonly weather: {
        getForecast: (city?: string) => Promise<WeatherForecast>; // WeatherForecast is an example type
    };

    /** Access to vector storage and retrieval. */
    readonly vectorStore?: { // Optional if not always available/configured
        search: (query: string, options: VectorSearchOptions) => Promise<VectorSearchResults>;
        addDocuments: (documents: Document[]) => Promise<void>;
        // ... other vector store operations
    };

    /** Pre-configured EA Pipelines. */
    readonly pipelines: {
        [pipelineName: string]: (input: any, options?: any) => Promise<any>; // General signature
        // Examples (would be dynamically added based on registered pipelines):
        // readonly summarizeText?: (text: string, options?: { style: 'bullet' | 'paragraph' }) => Promise<{ summary: string }>;
        // readonly analyzeSentiment?: (text: string) => Promise<{ sentiment: 'positive' | 'negative' | 'neutral', score: number }>;
    };

    // ... other potential services (e.g., database access, external APIs)
}
```
*The `createAgentCore` function (internal to EA) would be responsible for instantiating this object, populating it with wrapped service methods and registered pipeline methods.*

### 5. Pipelines

*   **Definition:** Pipelines are named, pre-configured sequences of operations, often centered around an LLM call with specific prompts, models, parsers, and potentially chained tool usage. They provide a higher level of abstraction than direct LLM calls.
*   **Registration (EA Internal):** Pipelines are defined and registered within the EA ecosystem (e.g., via configuration, a UI, or programmatic registration). Each pipeline resolves to an `Effect`.
*   **Exposure:** `createAgentCore` discovers registered pipelines and dynamically adds corresponding Promise-returning methods to the `agentCore.pipelines` object.

### 6. Error Handling

*   EA services, being Effect-native, use Effect's error channel for failures.
*   When `AgentCore` methods use `Effect.runPromise()` to wrap these services, any `Failure` in the Effect will be converted into a rejected Promise.
*   The developer's LangGraph nodes and tool functions will encounter these as standard JavaScript errors and can handle them using `try/catch` blocks.
*   The `AgentRuntimeService`, when invoking the `developerLangGraphApp.invoke(...)`, will also wrap this call in `Effect.tryPromise` (or similar) to catch any unhandled errors erupting from the graph's execution, allowing EA to manage overall agent runtime errors.

### 7. Streaming (High-Level Consideration)

*   If underlying EA services support streaming (e.g., LLM text generation), `AgentCore` methods will need to expose this capability.
*   The Promise-based wrappers in `AgentCore` would likely need to return `AsyncIterable<ChunkType>` for streaming methods.
*   Example: `agentCore.llm.streamText(prompt, options): AsyncIterable<string>`
*   This area will require more detailed design when streaming use cases are prioritized.

### 8. Future Considerations / Open Questions

*   **Detailed API Specification:** The exact methods, parameters, and return types for each service and common pipeline types within `AgentCore` need to be fully specified.
*   **Pipeline Registration & Discovery:** A robust mechanism for defining, registering, and discovering available pipelines within EA. How does `createAgentCore` know which pipelines to expose?
*   **Configuration of `AgentCore` Services:** How are specific configurations for services (e.g., default LLM model for `agentCore.llm`, connection details for `agentCore.vectorStore`) managed and passed to `createAgentCore`?
*   **Security & Permissions:** If different agents or users have different levels of access to EA services or pipelines, a permission model might be needed for `AgentCore`.
*   **Extensibility:** While initially focused on LangGraph, how can this model be adapted if EA supports agents built with other frameworks in the future? The `AgentCore` concept seems portable.
*   **Versioning:** How will versions of `AgentCore` and its constituent services/pipelines be managed to ensure non-breaking changes for developers?
