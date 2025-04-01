# Known Issues in Shared Services

## Configuration Loader Type Errors

**Issue**: The configuration-loader.ts file contains TypeScript errors related to type incompatibilities between Effect.js and the Promise-based FileSystem operations.

**Symptoms**:
- TypeScript errors in the `readFile` function: `Type 'Effect<string, PlatformError, never>' is not assignable to type 'string'`
- Error in `Effect.try` return type: `Type 'Promise<BaseConfig>' is missing properties from type 'BaseConfig'`

**Impact**:
- No runtime impact (all tests pass)
- TypeScript type checking fails with `bun run typecheck:services`

**Proposed Solution**:
1. Modify the `readFile` function to properly unwrap the Effect monad:
   ```typescript
   const readFile = async (filePath: string): Promise<string> => {
     try {
       const fileEffect = fs.readFileString(filePath, "utf8");
       // Need to properly convert the Effect to a Promise
       return await Effect.runPromise(fileEffect);
     } catch (error) {
       throw new ConfigReadError({ filePath, cause: error });
     }
   };
   ```

2. Fix the `Effect.try` return type by ensuring the returned promise is properly awaited:
   ```typescript
   return Effect.promise(async () => {
     // Implementation here
     return await loadProcess() as BaseConfig;
   });
   ```

**Priority**: Medium (tests pass, but type checking is important for code quality)

## Effect.js API Version Compatibility

**Issue**: The codebase uses Effect.js v3.x but some patterns may be based on earlier versions of the library.

**Symptoms**:
- Code using `Effect.service(Tag)` fails (correct pattern is `yield* Tag`)
- Some Effect API methods may have changed signatures

**Impact**:
- Runtime errors if outdated patterns are used
- Confusion for developers familiar with earlier versions

**Proposed Solution**:
1. Document the correct API usage patterns in the README.md
2. Consider adding ESLint rules to catch outdated patterns
3. Review all Effect.js usage across the codebase to ensure compliance with v3.x

**Priority**: High (can cause runtime errors)

## Action Items

- [ ] Fix type errors in configuration-loader.ts
- [ ] Add linting rules for Effect.js v3 patterns
- [ ] Create comprehensive documentation for service patterns 