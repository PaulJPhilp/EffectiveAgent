# Changelog

All notable changes to `@effective-agent/ai-sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Tool Calling and Function Calling**: Comprehensive tool orchestration system
  - `defineTool(name, schema, handler)` - Create tool definitions
  - `defineToolWithDescription(name, description, schema, handler)` - Tools with descriptions
  - `runTools(model, messages, tools, options?)` - Orchestrate tool calling loops
  - `runToolsWithMap(model, messages, toolsMap, options?)` - Alternative API
  - Multi-turn orchestration with configurable max turns
  - Support for single and multi-tool calling
  - OpenAI (function_call) and Anthropic (tool_use) provider support
- **Tool Orchestration Features**:
  - Tool validation and argument parsing (Zod, Effect Schema, JSON Schema)
  - Configurable timeouts and error handling
  - Optional user approval callbacks for tool execution
  - Automatic provider detection and tool definition conversion
- **Provider Tool Adapters**:
  - OpenAI tool_calls mapping to unified format
  - Anthropic tool_use mapping to unified format
  - JSON Schema conversion from Zod and Effect schemas
- **Tool Examples**:
  - `examples/node/tools-multitool.ts` - Multi-tool orchestration demo
  - `examples/node/TOOLS.md` - Comprehensive tool API documentation
- **Tool Tests**:
  - `__tests__/tools.spec.ts` - Unit tests for tool system
  - Schema conversion tests
  - Provider adapter tests
  - Tool definition and execution tests

- **Streaming API**: New `streamText` and `streamObject` functions for unified streaming across providers
  - Supports OpenAI and Anthropic streaming with normalized event model
  - Compatible with Node.js and Vercel Edge Runtime
  - Provides `StreamHandle` with `readable` stream, `collectText()` helper, and `pipeToCallbacks()` utility
- **Unified Stream Events**: Normalized streaming event types including:
  - `TokenDeltaEvent` - Individual token deltas
  - `MessagePartEvent` - Partial message content
  - `ToolCallStartedEvent` - Tool call initiation
  - `ToolCallDeltaEvent` - Incremental tool call arguments
  - `ToolCallReadyEvent` - Complete tool call arguments
  - `ToolResultEvent` - Tool execution results
  - `FinalMessageEvent` - Complete message content
  - `StreamErrorEvent` - Streaming errors
  - `StreamCompleteEvent` - Stream completion
- **Provider Adapters**: Streaming adapters for OpenAI and Anthropic with automatic provider detection
- **Event Normalization**: `StreamNormalizer` class to convert provider-specific events to unified format
- **Examples**: Complete working examples for Node.js and Next.js Edge Runtime
- **Tests**: Unit tests for streaming functionality with mocked providers

### Changed

- Updated main exports to include streaming API and types
- Updated exports to include tool APIs and types
- Enhanced type safety with comprehensive streaming and tool interfaces

### Technical Details

- **Files Added (Streaming - Milestone 1)**:
  - `src/streaming/types.ts` - Stream event types and interfaces
  - `src/streaming/providers.ts` - Provider-specific streaming adapters
  - `src/streaming/normalizer.ts` - Event normalization layer
  - `src/streaming/index.ts` - Main streaming API exports
  - `__tests__/streaming.spec.ts` - Streaming unit tests
  - `examples/node/stream-text.ts` - Node.js streaming example
  - `examples/next-edge/app/api/stream/route.ts` - Edge Runtime API
  - `examples/README.md` - Examples documentation

- **Files Added (Tools - Milestone 2)**:
  - `src/tools/types.ts` - Tool definition types and interfaces
  - `src/tools/schema.ts` - Schema conversion and validation
  - `src/tools/providers.ts` - Provider-specific tool adapters
  - `src/tools/orchestration.ts` - Tool orchestration engine
  - `src/tools/index.ts` - Public tool APIs
  - `__tests__/tools.spec.ts` - Tool system unit tests
  - `examples/node/tools-multitool.ts` - Multi-tool example
  - `examples/node/TOOLS.md` - Tool documentation

- **Compatibility**: Works with Vercel AI SDK v5.1.0-beta.28 streaming and tool APIs
- **Runtimes**: Tested on Node.js 18+ and Vercel Edge Runtime
- **Schema Support**: Zod, Effect Schema, and JSON Schema formats

