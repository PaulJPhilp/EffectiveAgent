# Service Pattern Check Rule

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