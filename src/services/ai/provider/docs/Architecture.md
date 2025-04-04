# Provider Service - Architecture Document

**Version:** 1.0
**Date:** 2024-07-27

## 1. Overview

This document describes the internal architecture of the `ProviderService` (`ProviderApi`). This service acts as a facade and abstraction layer for interacting with multiple external LLM APIs. It uses specific adapters internally to handle communication with each configured provider (OpenAI, Anthropic, etc.) **primarily via the Vercel AI SDK**, and relies on the `ProviderConfiguration` service and Effect's `Config` service for necessary settings and secrets.

## 2. Core Responsibilities

*   Implement the `ProviderApi` interface.
*   Select the appropriate internal provider adapter based on the requested model ID.
*   Retrieve provider-specific details (base URL, actual model name for the provider) from `ProviderConfiguration`.
*   Retrieve API keys securely via Effect `Config`.
*   Invoke the selected provider adapter (using Vercel AI SDK) to perform chat completions (streaming or non-streaming).
*   Normalize responses (aggregate chunks for non-streaming, transform chunks for streaming) into the service's defined types (`ChatMessage`, `ChatCompletionChunk`).
*   Map provider-specific errors from the Vercel AI SDK or underlying calls to standardized `ProviderError` types.
*   Handle tool/function calling requests and responses according to the standard format used by the Vercel AI SDK.

## 3. Key Components

*   **`ProviderApi` (Interface / Tag):** (`types.ts`) Defines the public contract (`generateChatCompletion`, `streamChatCompletion`).
*   **`ProviderConfiguration` (Interface / Tag):** (`types.ts`) Defines the contract for accessing loaded provider configuration data (from `provider.json`).
*   **`ProviderConfigurationLive` (Implementation / Layer):** (`configuration.ts`) Implements `ProviderConfiguration`, depends on `ConfigLoader`.
*   **`ProviderApiLive` (Implementation / Layer):** (`main.ts`) The main service implementation. Acts as a facade.
    *   **Dependencies:** `ProviderConfiguration`, `Config`, `LoggingApi`.
    *   **Internal Logic:** Contains the core logic to select adapters and orchestrate calls.
*   **Provider Adapters (Internal):** (Likely private functions/modules within `main.ts` or potentially separate files in `implementations/`)
    *   Examples: `openaiAdapter`, `anthropicAdapter`, `googleAdapter`, `groqAdapter`.
    *   Each adapter encapsulates the logic for interacting with a specific provider's API **primarily using the Vercel AI SDK's provider-specific functions (e.g., from `@ai-sdk/openai`, `@ai-sdk/anthropic`) wrapped within Effect.**
    *   Responsible for mapping the common `ChatCompletionParams` to the specific arguments required by the Vercel AI SDK functions (e.g., creating the provider client instance with API key and base URL).
    *   Responsible for converting the stream chunks or final results from the Vercel AI SDK into the service's defined `ChatCompletionChunk` or `ChatMessage` types.
    *   Responsible for initial mapping of provider errors.
*   **`ChatCompletionChunk` Type:** (`types.ts`) Defines the structure of data yielded by the `streamChatCompletion` stream, compatible with Vercel AI SDK outputs.
*   **`ProviderError` Types:** (`errors.ts`) Specific error types extending `AppError`.

## 4. Core Logic Flows

*   **`generateChatCompletion` / `streamChatCompletion`:**
    1.  Receive `ChatCompletionParams` (messages, modelId, options).
    2.  **Get Provider Config:** Use `ProviderConfiguration` to find the provider details associated with `modelId` (e.g., provider name, base URL, specific model name for that provider). Handle cases where the model/provider isn't configured (`ModelNotFoundError` or similar).
    3.  **Get API Key:** Use `Config.secret()` or `Config.string()` to retrieve the API key from the environment variable specified in the provider config. Handle missing key errors (`AuthenticationError`).
    4.  **Select Adapter:** Choose the appropriate internal provider adapter based on the provider name derived from the config.
    5.  **Invoke Adapter:** Call the selected adapter's corresponding method (e.g., `openaiAdapter.stream(...)`), passing the mapped parameters. The adapter internally initializes the Vercel AI SDK client for the specific provider (e.g., `createOpenAI(...)`) and calls the appropriate streaming function (e.g., `streamText`, `streamObject`, or a core provider stream function like `openai.chat(...)`).
    6.  **Handle Response:**
        *   For streaming: The adapter yields chunks from the Vercel AI SDK stream, transforming them into the service's `ChatCompletionChunk` type. The main service returns this transformed `Stream`.
        *   For non-streaming: The adapter likely still uses the streaming API internally, collects all chunks, aggregates them into a final `ChatMessage` structure (including handling tool calls if present), and returns that.
    7.  **Map Errors:** Catch errors from the adapter/Vercel AI SDK call (e.g., API errors wrapped by the SDK) and map them to standardized `ProviderError` types (e.g., 401 -> `AuthenticationError`, 429 -> `RateLimitError`, 5xx -> `ApiError`, invalid request -> `InvalidRequestError`).
*   **API Key Retrieval:** The `ProviderApiLiveLayer` definition uses `Config` effects to fetch API keys when the layer is built or within the effect chain, ensuring keys are not stored directly in the service instance.
*   **Configuration Usage:** Provider details (base URLs, model names) loaded by `ProviderConfigurationLive` are accessed via the `ProviderConfiguration` service within `ProviderApiLive`.

## 5. Interaction with Dependencies

*   **`ProviderConfiguration`:** Provides details about configured providers (base URLs, API key env var names, model mappings).
*   **`Config` (Effect):** Used to securely load API keys from the environment.
*   **`LoggingApi`:** Used for logging requests, responses, errors, and internal operations.
*   **`ConfigLoader`:** Used indirectly via `ProviderConfigurationLive`.
*   **(Internal) Vercel AI SDK (`ai` package, `@ai-sdk/*` packages):** Used within the provider adapters as the primary means of making API calls to LLM providers.

## 6. Error Handling

*   Maps HTTP status codes and specific error formats from provider APIs/SDKs (often surfaced by the Vercel AI SDK) to `ProviderError` subtypes.
*   Handles configuration errors (missing provider, missing API key env var).

## 7. Concurrency

*   Effect's runtime manages the concurrency of handling multiple requests. No explicit locking is planned within this service itself. Rate limiting is primarily considered the provider's responsibility, though basic awareness might be added based on config.