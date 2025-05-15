# Test Harness Utilities

This directory provides utilities for robust, DRY, and idiomatic Effect-based testing.

## Barrel Export

Import all helpers from the barrel:

```typescript
import {
  createServiceTestHarness,
  createServiceTestLayer,
  createInMemoryRepositoryMock,
  createTrackedMockLayer
} from "@/services/core/test-harness/utils"
```

---

## Usage Examples

### 1. Service + Repository Test Layer

```typescript
const repo = createInMemoryRepositoryMock<MyEntity>("MyEntity")
const testLayer = createServiceTestLayer(MyServiceLive, RepositoryService<MyEntity>().Tag, repo)
```

### 2. Test Harness for Effect-based Services

```typescript
const harness = createServiceTestHarness(testLayer)

it("should do something", async () => {
  const effect = Effect.gen(function* () {
    const service = yield* MyService
    // ...test logic...
  })
  await harness.runTest(effect)
})
```

### 3. Configurable In-Memory Repository Mock

```typescript
const repo = createInMemoryRepositoryMock<MyEntity>("MyEntity", {
  failOnCreate: ["fail-id"],
  simulateNetworkIssue: true
})
```

### 4. Call-Tracking Mock Layer

```typescript
const { layer: mockLayer, calls, reset } = createTrackedMockLayer(MyService, {
  doSomething: () => Effect.succeed("ok")
})
// Use mockLayer in your test layer
// Use calls("doSomething") to assert call arguments
// Use reset() to clear call history
```

---

## Best Practices
- Use these helpers for all Effect-based service tests.
- Never duplicate repository or mock logic in individual tests.
- Always import from the barrel for consistency. 