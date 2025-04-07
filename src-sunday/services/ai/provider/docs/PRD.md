# Provider Service - Product Requirements Document (PRD)

**Version:** 1.0
**Date:** 2024-07-27
**Author:** T3 Chat (Assisted by Paul)

## 1. Overview

The Provider Service (`ProviderApi`) acts as a unified, Effect-based abstraction layer for interacting with various Large Language Model (LLM) providers (e.g., OpenAI, Anthropic, Google Gemini, Groq, local models) **primarily using the Vercel AI SDK as the underlying communication bridge**. Its primary purpose is to normalize interactions for common tasks like chat completions, manage provider-specific configurations and API calls internally, and provide a consistent interface for other services within the EffectiveAgent framework (like `ThreadService`, `SkillService`, `MCPService`).

## 2. Goals

*   **Unified API:** Provide a single, consistent Effect-TS interface (`ProviderApi`) for core LLM interactions, primarily chat completions (streaming and non-streaming).
*   **Multi-Provider Support:** Seamlessly support different LLM providers based on configuration.
*   **Abstraction:** Hide the complexities of individual provider SDKs (leveraging the Vercel AI SDK wrappers) and API request/response formats.
*   **Configuration Driven:** Load provider details (base URLs, model mappings, rate limits) from a configuration source (e.g., `provider.json`) via the `ProviderConfiguration` service.
*   **Secure API Key Management:** Retrieve necessary API keys securely using Effect's `Config` service (reading from environment variables specified in the configuration).
*   **Standardized Error Handling:** Map provider-specific API errors (authentication, rate limits, server errors) from the Vercel AI SDK or underlying calls to a defined set of `ProviderError` types.
*   **Streaming Support:** Provide first-class support for streaming chat completion responses using Effect `Stream`.
*   **Tool/Function Calling:** Support passing tool/function definitions to providers that support them and parsing the corresponding responses (likely via Vercel AI SDK capabilities).

## 3. Non-Goals

*   **Agent Logic/Orchestration:** Does not implement agent decision-making or complex workflows (handled by `execution` or `capabilities` services).
*   **Conversation History Management:** Does not store or manage chat history (handled by `memory/chat`).
*   **Advanced Prompt Engineering/Templating:** Does not handle complex prompt construction or templating (handled by `ai/prompt`).
*   **Model Metadata Management:** Does not store or manage detailed model capabilities or metadata (handled by `ai/model`, though this service uses model IDs).
*   **Fine-Grained Rate Limiting/Throttling:** May read rate limit *information* from config but does not implement complex client-side throttling or queuing (could be a separate concern if needed).
*   **Direct UI Interaction:** This is a backend service providing an API for other services.
*   **Context Window Management:** Does not automatically handle prompt truncation or context window limits; this is the caller's responsibility.
*   **Direct OpenRouter Integration (Initial):** Focus is on direct provider integrations via Vercel AI SDK first. OpenRouter can be added later if needed.

## 4. User Stories

*(Perspective: Another Backend Service, e.g., ThreadService)*

*   **As a Service, I want to:**
    *   Request a non-streaming chat completion by providing a list of `ChatMessage` objects, a target model ID (e.g., "openai/gpt-4o", "anthropic/claude-3.5-sonnet"), and optional parameters (temperature, max tokens, tools), so that I can get a complete AI response.
    *   Request a streaming chat completion with the same inputs, so that I can process chunks of the response (text, tool calls) as they arrive.
    *   Receive either a complete `ChatMessage` (for non-streaming) or an Effect `Stream` yielding `ChatCompletionChunk` objects (for streaming).
    *   Receive clearly defined `ProviderError` types (e.g., `AuthenticationError`, `RateLimitError`, `ApiError`) if the request fails, allowing me to handle errors appropriately.
    *   Specify tools/functions the LLM can call during a completion request using a standard format (compatible with Vercel AI SDK/OpenAI standard).
    *   Receive structured information within the `ChatMessage` or `ChatCompletionChunk` when an LLM decides to call a tool/function.

## 5. Functional Requirements (Conceptual)

*   **`ProviderApi` Interface & Tag:** Defined in `types.ts`.
*   **`ProviderConfiguration` Interface & Tag:** Defined in `types.ts`, implemented in `configuration.ts` (depends on `ConfigLoader`). Loads data like `provider.json`.
*   **Core Methods:**
    *   `generateChatCompletion(params: ChatCompletionParams): Effect<ChatMessage, ProviderError, ProviderConfiguration | Config>`
        *   `ChatCompletionParams`: Includes `modelId: string`, `messages: ReadonlyArray<ChatMessage>`, `options?: { temperature?: number, maxTokens?: number, tools?: ReadonlyArray<ToolDefinition>, toolChoice?: "auto" | "required" | { type: "function", function: { name: string } }, ... }` (Align options with Vercel AI SDK/OpenAI standard).
        *   Returns a single `ChatMessage` with the assistant's full response. Internally likely collects results from the streaming API provided by the Vercel AI SDK.
        *   Requires `ProviderConfiguration` (to get provider details like base URL, specific model name) and `Config` (to get API keys).
    *   `streamChatCompletion(params: ChatCompletionParams): Stream<ChatCompletionChunk, ProviderError, ProviderConfiguration | Config>`
        *   `ChatCompletionChunk`: **A type defined within this service (in `types.ts`) representing parts of the streaming response (e.g., text delta, tool call start/delta/end, finish reason). This type will be based on or compatible with the chunks yielded by the Vercel AI SDK streaming functions.**
        *   Returns an Effect `Stream`.
        *   Requires `ProviderConfiguration` and `Config`.
    *   *(Future)* `generateEmbeddings(params: EmbeddingParams): Effect<EmbeddingResponse, ProviderError, ProviderConfiguration | Config>`
*   **Error Handling:** Define specific `ProviderError` subtypes (e.g., `AuthenticationError`, `RateLimitError`, `ApiError`, `ModelNotFoundError`, `InvalidRequestError`) in `errors.ts`. Map errors from underlying Vercel AI SDK calls or HTTP requests to these types.
*   **Configuration Loading:** The `configuration.ts` implementation uses `ConfigLoader` to load provider details (base URL, API key env var name, etc.) from a known file (e.g., 
