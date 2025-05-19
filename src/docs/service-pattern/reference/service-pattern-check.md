---
status: LOCKED_REFERENCE
version: 1.0
last_modified: 2024-03-20
protection: reference_implementation
do_not_modify: true
---

# Service Pattern Checklist (Effect-TS v3.14+)

**MANDATORY:** Before creating or modifying any service, you MUST:

1. Review the latest canonical pattern in `src/docs/service-pattern/reference/service-pattern.md`.
2. Use **only** the `Effect.Service` class pattern (except for legacy repository).
3. Do **not** use `Context.Tag` (banned for all new/refactored services).
4. Implement a **single service class per file**:
   - Extends `Effect.Service<ServiceNameApi>()`
   - Includes both identifier and implementation in the same declaration
   - Defines `effect` (with `Effect.succeed` or `Effect.gen`)
   - Lists all dependencies explicitly in `dependencies` (empty array if none)
   - No inheritance or split implementation classes
5. Write all interface and method docs in clear English with full JSDoc (`@param`, `@returns`, etc.).
6. Use only TypeScript types—never `any`.

## Reviewer/Contributor Checklist

- [ ] Service interface is in `api.ts`, fully documented with JSDoc
- [ ] Service class is in `service.ts`, extends `Effect.Service<ServiceNameApi>()`
- [ ] Identifier and implementation are together in the class declaration
- [ ] `effect` property provides the full implementation (sync or async)
- [ ] `dependencies` property lists all required services (empty if none)
- [ ] No use of `Context.Tag` (except legacy repository)
- [ ] No multiple service classes in one file
- [ ] No inheritance or split implementations
- [ ] All comments and docs are in English

## Example (Canonical Pattern)

```typescript
/**
 * @file ExampleService API
 * Demonstrates the canonical Effect.Service pattern.
 */
export interface ExampleServiceApi {
  /**
   * Example method.
   * @param input Input string.
   * @returns An Effect yielding a string result.
   */
  doSomething(input: string): Effect.Effect<string, ExampleError>;
}

export class ExampleService extends Effect.Service<ExampleServiceApi>()(
  "ExampleService",
  {
    effect: Effect.succeed({
      doSomething: (input) => Effect.succeed(`Hello, ${input}`)
    }),
    dependencies: []
  }
) {}
```

**All new and refactored services MUST follow this pattern.**

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