# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EffectiveAgent is a TypeScript framework for building robust, scalable AI agents using Effect-TS. The framework provides a modular architecture with strong type safety, composable async operations, and comprehensive dependency management.

## Build Commands

**Install dependencies:**
```bash
bun install
```

**Build the project:**
```bash
bun run build
```

**Type checking:**
```bash
bun run typecheck
```

**Clean build artifacts:**
```bash
bun run clean
```

**Run tests:**
```bash
bun test
```

**Run tests with coverage:**
```bash
bun test --coverage
```

**Run single test file:**
```bash
bun test path/to/test-file.test.ts
```

**Lint code:**
```bash
bunx biome lint .
```

## Architecture Overview

### Core Service Pattern

**All services use the Effect.Service class pattern (v3.16+).** NEVER use `Context.Tag` directly or the class-based tag pattern.

```typescript
// Correct service definition
export class MyService extends Effect.Service<MyServiceInterface>()("MyService", {
  effect: Effect.gen(function* () {
    // Implementation
  })
})
```

### Service Self-Configuration

Each domain service loads its own configuration via `ConfigurationService`:
- **ModelService** - Self-configures from `models.json` via `MODELS_CONFIG_PATH`
- **ProviderService** - Self-configures from `providers.json` via `PROVIDERS_CONFIG_PATH`
- **PolicyService** - Self-configures from `policies.json` via `POLICY_CONFIG_PATH`

Services use the `bootstrap()` function to access master configuration paths from `MASTER_CONFIG_PATH`.

### AgentRuntimeService

The central orchestration layer that provides:
- **Agent lifecycle management** - Create, terminate, monitor agent actors
- **Service access** - Unified interface to ModelService, ProviderService, PolicyService
- **Message handling** - Prioritized mailbox processing with activity streaming
- **State management** - Type-safe agent state with concurrent updates via Effect.Ref

### Monorepo Structure

The project uses a Bun workspace monorepo structure:

```
EffectiveAgent/
├── src/                            # Main application code
├── packages/                       # Internal packages
│   └── effect-aisdk/              # @effective-agent/ai-sdk
└── package.json                    # Workspace configuration
```

**Internal Packages:**
- **`@effective-agent/ai-sdk`** - Standalone Effect-TS communication layer for AI operations
  - Type-safe wrappers around Vercel AI SDK
  - Message transformation utilities
  - Schema conversion utilities
  - Provider factory for creating AI provider instances
  - Error handling with Effect integration

### Path Aliases

The project uses TypeScript path aliases defined in tsconfig.json:
- `@/*` - src/*
- `@core/*` - src/services/core/*
- `@ai/*` - src/services/ai/*
- `@capabilities/*` - src/services/capabilities/*
- `@pipeline/*` - src/services/pipeline/*
- `@ea-agent-runtime/*` - src/ea-agent-runtime/*
- `@effective-agent/ai-sdk` - packages/effect-aisdk/src/index.ts

## Service Architecture

```
services/
├── ai/
│   ├── model/          # AI model definitions and capabilities
│   ├── policy/         # Usage policies and rate limiting
│   ├── provider/       # AI provider configurations and clients
│   ├── tool-registry/  # Central tool registry
│   └── tools/          # Tool execution and validation
├── core/
│   ├── configuration/  # Configuration loading and validation
│   ├── health/         # Service health monitoring
│   ├── performance/    # Performance metrics
│   └── test-utils/     # Testing utilities (effect-test-harness)
├── execution/
│   ├── orchestrator/   # Policy-enforced operation orchestration
│   └── resilience/     # Circuit breakers, retries, fallback strategies
├── capabilities/
│   └── skill/          # Modular agent skills
└── producers/
    ├── chat/           # AI chat completions
    ├── embedding/      # Vector embeddings
    ├── image/          # Image generation
    ├── object/         # Structured object generation
    ├── text/           # Text generation
    └── transcription/  # Audio transcription
```

### Agent Runtime Structure

```
ea-agent-runtime/
├── api.ts                  # Public API surface
├── service.ts              # AgentRuntimeService implementation
├── initialization.ts       # Service bootstrap and composition
├── bootstrap.ts            # Master config loading
└── types.ts                # Core type definitions
```

## Configuration

Configuration files are stored in `configuration/config/`:
- `master-config.json` - Master configuration with file system settings, logging, and service config paths
- `models.json` - AI model definitions and capabilities
- `providers.json` - AI provider configurations and API keys
- `policies.json` - Usage policies and rate limits

Environment variables for configuration paths:
- `MASTER_CONFIG_PATH` - Path to master config (default: ./configuration/config/master-config.json)
- `MODELS_CONFIG_PATH` - Loaded from master config
- `PROVIDERS_CONFIG_PATH` - Loaded from master config
- `POLICY_CONFIG_PATH` - Loaded from master config

## Effect-TS Patterns

### Service Definition and Usage

```typescript
// Define service interface
export interface MyServiceInterface {
  readonly operation: (input: Input) => Effect.Effect<Output, MyError>
}

// Create service using Effect.Service class
export class MyService extends Effect.Service<MyServiceInterface>()("MyService", {
  effect: Effect.gen(function* () {
    const dependency = yield* DependencyService

    const operation = (input: Input): Effect.Effect<Output, MyError> =>
      Effect.succeed(/* implementation */)

    return { operation }
  })
})

// Access service in Effect.gen
const program = Effect.gen(function* () {
  const service = yield* MyService
  const result = yield* service.operation(input)
  return result
})
```

### Error Handling

- Use `Effect.fail` instead of throwing errors
- Define domain-specific error hierarchies
- Preserve error context using `cause`
- Use `Effect.catchAll` or `Effect.mapError` for error transformation

### Resource Management

- Use `Effect.acquireRelease` for resource cleanup
- Use `Effect.addFinalizer` in tests
- Ensure proper cleanup in error cases

### Using @effective-agent/ai-sdk

The `@effective-agent/ai-sdk` package provides Effect wrappers around the Vercel AI SDK:

```typescript
import {
  createProvider,
  getLanguageModel,
  generateTextWithModel,
  type EffectiveInput,
} from "@effective-agent/ai-sdk";
import { Effect, Chunk } from "effect";

const program = Effect.gen(function* () {
  // Create provider
  const provider = yield* createProvider("openai", {
    apiKey: process.env.OPENAI_API_KEY!
  });

  // Get model
  const model = yield* getLanguageModel(provider, "gpt-4");

  // Generate text
  const input: EffectiveInput = {
    text: "Hello, AI!",
    messages: Chunk.empty()
  };

  const response = yield* generateTextWithModel(model, input);
  return response.data.text;
});
```

**Key Features:**
- Type-safe AI operations with Effect error handling
- Message transformation between EffectiveMessage and Vercel CoreMessage
- Schema conversion utilities (Effect Schema ↔ Zod ↔ Standard Schema)
- Provider factory supporting multiple AI providers
- Comprehensive error types (AiSdkOperationError, AiSdkProviderError, etc.)

**Remaining Legacy Code:**
- **Image and Transcription producers** still use `getProviderClient` since image generation and transcription operations are not yet implemented in the ai-sdk package
- **Deprecated method maintained** for backward compatibility until these features are added to ai-sdk

## Testing Guidelines

### Test Framework

Use `vitest` (NOT `@effect/vitest`). Tests are located in `__tests__` directories co-located with source files.

### Testing Strategy

**Prefer integration tests with real services:**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Effect } from 'effect'

describe('MyService Integration Test', () => {
  beforeEach(() => {
    // Setup test configs
    writeFileSync(configPath, JSON.stringify(testConfig))
  })

  afterEach(() => {
    // Cleanup
    rmSync(tempDir, { recursive: true })
  })

  it('should perform operation', async () => {
    const program = Effect.gen(function* () {
      const service = yield* MyService
      const result = yield* service.operation(input)
      expect(result).toEqual(expected)
    })

    await Effect.runPromise(program.pipe(
      Effect.provide(Layer.mergeAll(
        ConfigurationService.Default,
        MyService.Default
      ))
    ))
  })
})
```

### Test Utilities

Use `createServiceTestHarness` from `@/services/core/test-utils/effect-test-harness.js`:

```typescript
const serviceHarness = createServiceTestHarness(
  MyService,
  createTestImpl
)

await serviceHarness.runTest(effect)
await serviceHarness.expectError(effect, "ErrorTag")
```

### Testing Best Practices

- Use real service implementations, not mocks
- Create temporary test configs in `beforeEach`
- Clean up test files in `afterEach`
- Use `Layer.mergeAll` for dependency composition
- Test both success and error paths
- Use `Effect.runPromise` to run test effects

## Code Style

### TypeScript Guidelines

- Use TypeScript 5.8+
- Use Effect version 3.16
- Prefer interfaces over types
- Avoid enums - use maps instead
- Use the `function` keyword for pure functions
- Never use `any` - create proper types
- Declare types for all variables, parameters, and return values

### Effect Patterns

- Use `Effect.gen` for complex operations (without `_` parameter)
- Use `pipe()` for chaining operations
- Use `yield*` for dependency access (not `yield* _()`)
- Use `Effect.flatMap` for async operations
- Use `Effect.logDebug`, `Effect.logWarning`, `Effect.logError` for logging

### Naming Conventions

- PascalCase for classes
- camelCase for variables, functions, methods
- kebab-case for file and directory names
- UPPERCASE for environment variables
- Avoid magic numbers - define constants

### Function Guidelines

- Keep functions short and single-purpose (<20 lines)
- Use early returns to avoid nesting
- Use arrow functions for simple cases (<3 instructions)
- Use default parameters instead of null/undefined checks
- Use RO-RO (Receive Object, Return Object) for multiple parameters

### Code Organization

- One export per file
- Use JSDoc for public classes and methods
- Structure: exports, subcomponents, helpers, types
- Don't leave blank lines within functions

## Development Notes

- **Build system:** Bun (use `bun` not `npm`, `pnpm`, or `yarn`)
- **Monorepo:** Bun workspaces with internal packages in `packages/`
- **Testing:** Vitest (not Jest)
- **Linting:** Biome (formatting disabled)
- **Effect version:** 3.16+ with Effect.Service pattern
- **File system:** Cross-platform via `@effect/platform` (NodeFileSystem)
- **AI SDK:** Vercel AI SDK v4+ wrapped in Effect via `@effective-agent/ai-sdk`

## Important Constraints

1. **Never use `Context.Tag` directly** - Always use `Effect.Service` class pattern
2. **Services self-configure** - Don't pass config to services, they load their own
3. **No mocking in tests** - Use real service implementations with test configs
4. **One service per file** - Clear module boundaries
5. **Effect-first architecture** - Prefer Effect patterns over async/await
6. **Never move or delete biome directives** in source files

## Service Dependencies

Core dependencies (from Dependency_Graph.md):
- ConfigurationService requires: Path, FileSystem (from @effect/platform)
- ModelService requires: ConfigurationService
- ProviderService requires: ConfigurationService
- PolicyService requires: ConfigurationService
- ToolService requires: ToolRegistryService
- ToolRegistryService requires: ConfigurationService

All services ultimately depend on ConfigurationService and the Effect FileSystem.
