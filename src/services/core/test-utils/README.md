# Test Utilities

Simple test utilities for pipeline services that provide properly initialized AgentRuntime services without complex configuration file dependencies.

## Usage

### Basic Test Layer

Use `PipelineTestLayer` to provide all necessary services:

```typescript
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { PipelineTestLayer } from "@/services/core/test-utils/index.js";
import { MyPipelineService } from "../service.js";

describe("MyPipelineService", () => {
  it("should work with AgentRuntime", async () => {
    const test = Effect.gen(function* () {
      const service = yield* MyPipelineService;
      const result = yield* service.someMethod();
      expect(result).toBeDefined();
      return result;
    }).pipe(
      Effect.provide(PipelineTestLayer)
    );

    await Effect.runPromise(test);
  });
});
```

### Simple Test Runner

Use `runPipelineTest` for even simpler testing:

```typescript
import { runPipelineTest } from "@/services/core/test-utils/index.js";

describe("MyPipelineService", () => {
  it("should work with AgentRuntime", async () => {
    await runPipelineTest(Effect.gen(function* () {
      const service = yield* MyPipelineService;
      const result = yield* service.someMethod();
      expect(result).toBeDefined();
      return result;
    }));
  });
});
```

### Test Runner with Runtime Access

For tests that need direct runtime access:

```typescript
import { runPipelineTestWithRuntime } from "@/services/core/test-utils/index.js";

describe("MyPipelineService", () => {
  it("should work with runtime", async () => {
    await runPipelineTestWithRuntime((runtime) => Effect.gen(function* () {
      const service = yield* MyPipelineService;
      
      // Use the service
      yield* service.someMethod();
      
      // Check runtime state
      const state = yield* runtime.getState();
      expect(state).toBeDefined();
      
      return state;
    }));
  });
});
```

## What's Provided

The `PipelineTestLayer` provides:

- `PipelineService.Default` - Core pipeline service
- `AgentRuntimeService.Default` - AgentRuntime dependency injection
- `ExecutiveService.Default` - Execution management 
- `NodeFileSystem.layer` - File system operations

All services use proper dependency injection through the AgentRuntime, avoiding the need for configuration files or complex setup.

## Benefits

- ✅ No configuration file dependencies
- ✅ Proper AgentRuntime dependency injection
- ✅ Simple and fast test setup
- ✅ Works with all pipeline services
- ✅ Clean test isolation 