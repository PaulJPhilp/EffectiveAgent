# DDD Analysis: Model (Cognition)

**Status:** V2 (Finalized)
**Layer:** Interface (Capability)
**Role:** The Cognitive Engine Interface

---

## 1. Executive Summary
The **Model Bounded Context** abstracts the complexity of interacting with stochastic intelligence engines (LLMs, Embeddings). It provides a unified OHS that hides provider differences (OpenAI, Anthropic, Local) and manages Non-Determinism. It is responsible for Token counting, Cost tracking (Micro-USD), and Rate Limiting.

**Strategic Refinements (V2):**
*   **Capability Matrix:** Explicit capability flags (JSON, Tools, Streaming) per Engine.
*   **Telemetry:** Adopts OpenTelemetry Gen-AI Semantic Conventions.
*   **Determinism:** Best-effort via `seed` + `replayToken`.
*   **Local Engines:** Adapters for OpenAI-compatible endpoints (Ollama/llama.cpp).

## 2. Ubiquitous Language

*   **Model:** The Bounded Context itself.
*   **Engine:** A specific provider implementation (e.g., `gpt-4-turbo`).
*   **Inference:** The act of generating a completion.
*   **Embedding:** A vector representation of text.
*   **ContextWindow:** The strict token limit of an Engine.
*   **Generation:** The stochastic output (Text + Tool Calls).
*   **ReplayToken:** A hash (ModelID + Seed + Params) used to verify replay validity.

## 3. Invariants & Policies

1.  **Provider Agnosticism:** Consumers code against Capabilities, not Providers.
2.  **No Side-Effects:** Model outputs Tool Calls; it NEVER executes them.
3.  **Observability:** Every invocation emits OTel Spans + Trace Events with Cost/Usage.
4.  **Cost Control:** Invocations fail if Budget (Policy) is exhausted.
5.  **Rate Limiting:** Centralized backoff/jitter handles Provider throttling.

## 4. Published Language (The Contract)

### Core Schema
```typescript
interface EngineCapabilities {
  readonly maxContext: number;
  readonly supportsTools: boolean;
  readonly supportsJson: boolean;
  readonly supportsStreaming: boolean;
  readonly costPerInputToken: number;  // Micro-USD
  readonly costPerOutputToken: number; // Micro-USD
}

interface ModelRequest {
  readonly engineId: string;
  readonly messages: ChatMessage[];
  readonly tools?: ToolDefinition[];
  readonly config: {
    readonly temperature: number;
    readonly maxTokens: number;
    readonly seed?: number; 
    readonly jsonMode?: boolean;
  };
}

interface ModelResponse {
  readonly content: string | null;
  readonly toolCalls?: ToolCall[];
  readonly usage: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly cost: number; // Micro-USD
  };
  readonly finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  readonly replayToken: string;
}
```

### Service Interface (OHS)
*   `invoke(request) -> Effect<ModelResponse, ModelError>`
*   `stream(request) -> Stream<ModelChunk, ModelError>` (Normalized Deltas)
*   `embed(text[]) -> Effect<Vector[], ModelError>`
*   `listEngines() -> Effect<EngineInfo[], ModelError>`

## 5. Integration Patterns

*   **Upstream (Consumers):**
    *   **Skill:** Invokes Model to generate logic/code.
    *   **Mind:** Invokes Model to "think".
*   **Downstream (Infrastructure):**
    *   **Trace:** Receives Usage/Cost events.
    *   **Policy:** Enforces Safety/Budget filters (PEP).
    *   **Registry:** Defines available Engines and their Capabilities.

## 6. Strategic Boundaries

*   **Model vs. Tool:**
    *   Model *requests* a Tool Call (Output).
    *   Tool *executes* the Tool Call (Side-Effect).
*   **Model vs. Registry:**
    *   Registry defines *Compatibility*. Model enforces *Capabilities*.

## 7. Open Questions (Resolved)
1.  **Capabilities:** Registry captures flags (JSON, Tools). Model validates requests against them.
2.  **Replay:** Best-effort via `seed`. `ReplayToken` ensures we don't compare apples to oranges.
3.  **Cost:** Standardized on Micro-USD.
4.  **Streaming:** Normalized Event Stream (Chunks, Deltas, Usage) via SSE semantics.
5.  **Local:** Supported via OpenAI-compatible adapters (Ollama).
