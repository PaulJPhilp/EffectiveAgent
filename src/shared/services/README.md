# Shared Services

This directory contains the shared services used across the application. These services are designed following the Effect.js pattern for functional dependency injection and error handling.

## Available Services

- **Configuration Service**: Handles loading and validating configuration files
- **Model Service**: Manages model configurations and capabilities
- **Provider Service**: Implements various model providers (OpenAI, Anthropic, etc.)
- **Agent Service**: Core agent framework components
- **Prompt Service**: Manages prompt templates and rendering
- **Skill Service**: Implements reusable skills for agents

## Testing

The services can be tested using the following command:

```bash
bun run test:services
```

### Testing Guidelines

When writing tests for Effect.js services:

1. Use direct tag yielding to access services:
   ```typescript
   // Correct way to access a service in Effect.js v3.x
   const service = yield* ServiceTag;
   ```

2. Error handling in tests:
   ```typescript
   // For success cases
   const result = await Effect.runPromise(program.pipe(Effect.provide(layer)));
   expect(result).toEqual(expectedValue);
   
   // For error cases
   try {
     await Effect.runPromise(program.pipe(Effect.provide(layer)));
     expect.fail("Should have thrown an error");
   } catch (error) {
     expect(error.message).toContain("Expected error message");
   }
   ```

3. Mock dependencies by providing test layers:
   ```typescript
   const mockService = {
     someMethod: vi.fn().mockImplementation(() => Effect.succeed(result))
   };
   
   const testLayer = Layer.succeed(ServiceTag, mockService);
   ```

## TypeScript Configuration

The services have their own dedicated TypeScript configuration in `tsconfig.services.json`. To check for type errors in the services, run:

```bash
bun run typecheck:services
```

## Linting

To lint the services, run:

```bash
bun run lint:services
```

## Full Check

To run both type checking and linting on the services, run:

```bash
bun run check:services
```

## Known Issues

1. **TypeScript Errors in ConfigurationLoader**: There are currently some TypeScript errors in the `configuration-loader.ts` file related to incompatible type signatures between the `Effect` monad and the Promise-based file system operations. These errors don't affect runtime behavior as confirmed by passing tests. This should be addressed in a future update by properly aligning the types.

2. **Effect.js API Compatibility**: The codebase uses Effect.js v3.x which has some API differences from earlier versions used in examples or documentation. Always refer to the latest Effect.js documentation when modifying service code.

```typescript
// OLD pattern (Effect.js v2.x)
const service = yield* Effect.service(ServiceTag);

// NEW pattern (Effect.js v3.x)
const service = yield* ServiceTag;
``` 