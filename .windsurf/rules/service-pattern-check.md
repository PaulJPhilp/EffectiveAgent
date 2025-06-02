---
trigger: manual
description:
globs:
---
# Service Pattern Check Rule

## Overview
The agent MUST verify the user is following the correct Effect.Service pattern before providing service implementation advice.

## Required Steps
1. MUST check if codebase context shows existing services follow the pattern
2. MUST understand the current Effect.Service pattern (v3.16+)
3. MUST verify pattern compliance before suggesting alternatives

## Current Pattern (Effect v3.16+)
```typescript
// This is the ONLY acceptable pattern
export class MyService extends Effect.Service<MyServiceInterface>()("MyService", {
  effect: Effect.gen(function* () {
    // Implementation
  })
}) {}
```

## Forbidden Patterns
- DO NOT suggest Context.Tag usage
- DO NOT suggest class-based tag patterns  
- DO NOT suggest Layer.succeed patterns for services

## Response Protocol
If user asks about service patterns:
1. Confirm they want Effect.Service class pattern
2. Provide example using the correct pattern only
3. Explain why other patterns are deprecated

**IMPORTANT**: Before making ANY changes to services or starting ANY commands related to services:

1. MUST review `src/docs/service-pattern.md` in full
2. MUST understand the current Effect.Service pattern (v3.14+)
3. MUST NOT use Context.Tag pattern (banned)
4. MUST follow single service class implementation with:
   - Extends Effect.Service
   - Has both identifier and implementation in one place
   - No inheritance or separate implementation classes
   - Proper effect and dependencies defined

## Key Points to Check

1. Service Definition:
   ```typescript
   export class MyService extends Effect.Service<MyServiceApi>()(
     "MyService",
     {
       effect: Effect.succeed({ /* implementation */ }),
       dependencies: [] // List required services
     }
   ) {}
   ```

2. No Split Implementation:
   - NO separate api.ts/service.ts/layer.ts split
   - NO inheritance between service classes
   - NO Context.Tag usage

3. Dependencies:
   - List ALL required services in dependencies array
   - Access via yield* in implementation

4. Error Handling:
   - Map ALL errors to domain-specific errors
   - Use proper Effect error handling patterns

## Checklist Before Changes

- [ ] Read service-pattern.md completely
- [ ] Understand current service structure
- [ ] Verify no Context.Tag usage
- [ ] Plan changes to match correct pattern
- [ ] Consider impact on dependent code
