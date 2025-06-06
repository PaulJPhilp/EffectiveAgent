# Test Directory Consolidation Plan

## Current State

We currently have three test-related directories:
1. `src/test/` - Empty directory
2. `src/tests/` - Contains `chat-app-integration.ts`
3. `src/__tests__/` - Main test directory with:
   - `integration/`
   - `mocks/`

## Target Structure

We will consolidate into a single `src/__tests__` directory following Vitest and TypeScript best practices:

```
src/
└── __tests__/
    ├── unit/               # Unit tests
    │   └── [module]/      # Tests matching source directory structure
    ├── integration/       # Integration tests
    │   ├── chat-app/      # Chat app integration tests
    │   └── e2e/          # End-to-end tests
    ├── mocks/            # Mock data and utilities
    └── helpers/          # Shared test helpers
```

## Migration Steps

### 1. Preparation
- [x] Document current test locations and files
- [ ] Create new directories in `src/__tests__` if needed:
  ```bash
  mkdir -p src/__tests__/unit
  mkdir -p src/__tests__/integration/chat-app
  mkdir -p src/__tests__/helpers
  ```

### 2. File Migration
- [ ] Move `chat-app-integration.ts`:
  - From: `src/tests/chat-app-integration.ts`
  - To: `src/__tests__/integration/chat-app/chat-app-integration.test.ts`
  - Update imports and paths
  - Add `.test.ts` suffix for Vitest convention

### 3. Cleanup
- [ ] Remove empty `src/test` directory
- [ ] Remove `src/tests` directory after migration
- [ ] Update any import references in other files
- [ ] Update any test scripts in package.json

### 4. Configuration Updates
- [ ] Update Vitest configuration if needed:
  ```typescript
  // vitest.config.ts
  export default defineConfig({
    test: {
      include: ['src/**/*.test.ts'],
      exclude: ['**/node_modules/**'],
      coverage: {
        reporter: ['text', 'json', 'html'],
        include: ['src/**/*.ts'],
        exclude: ['src/**/*.test.ts', 'src/**/__tests__/**']
      }
    }
  })
  ```

### 5. Documentation Updates
- [ ] Update README.md with new test structure
- [ ] Update any test-related documentation
- [ ] Add testing guidelines to project documentation

## Testing Guidelines

### File Naming
- Unit tests: `*.test.ts`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts`
- Test helpers: `*.helper.ts`
- Mock data: `*.mock.ts`

### Directory Structure
- Match source directory structure in `unit/`
- Group integration tests by feature
- Keep mocks close to their usage
- Share common helpers in `helpers/`

### Best Practices
1. Use descriptive test names
2. Follow AAA pattern (Arrange, Act, Assert)
3. Use shared fixtures and helpers
4. Mock external dependencies
5. Clean up after tests
6. Use proper assertions
7. Handle async operations correctly

## Execution Plan

### Phase 1: Setup (Day 1)
- [ ] Create new directory structure
- [ ] Update Vitest configuration
- [ ] Create initial test helpers

### Phase 2: Migration (Day 1-2)
- [ ] Move chat-app integration tests
- [ ] Update import paths
- [ ] Verify all tests pass
- [ ] Run test coverage

### Phase 3: Cleanup (Day 2)
- [ ] Remove old directories
- [ ] Update documentation
- [ ] Final verification

### Phase 4: Validation (Day 2-3)
- [ ] Run full test suite
- [ ] Check coverage reports
- [ ] Verify CI/CD pipeline
- [ ] Team review

## Success Criteria
1. All tests consolidated in `src/__tests__`
2. All tests passing
3. No broken imports or references
4. Documentation updated
5. CI/CD pipeline passing
6. Test coverage maintained or improved

## Rollback Plan
1. Keep old directories until successful migration
2. Maintain backup of original structure
3. Document all changes for potential rollback
4. Test new structure thoroughly before cleanup 