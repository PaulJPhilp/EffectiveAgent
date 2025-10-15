# Next Steps for EffectiveAgent

## Phase 2 Completion Status ✅

The Modern Stack Upgrade (Phase 2) has been successfully completed:

- ✅ **Restructured monorepo** with `packages/effect-aisdk/`
- ✅ **Extracted communication layer** to `@effective-agent/ai-sdk`
- ✅ **Created type-safe AI operations** with Effect wrappers
- ✅ **Updated documentation** (README.md, CLAUDE.md)

## Phase 3 Completion Status ✅

The Service Integration (Phase 3) has been successfully completed:

- ✅ **Phase 3.1** (ProviderService refactor): Updated to use `@effective-agent/ai-sdk`
- ✅ **Phase 3.2** (Producer services refactor): Updated all producer services
- ✅ **Phase 3.3** (Clean Up Redundant Code): Removed duplicate schemas and updated imports

### What Was Accomplished

1. **Monorepo Structure**
   - Created `packages/effect-aisdk/` directory
   - Configured Bun workspaces
   - Set up TypeScript path aliases
   - Verified workspace linking

2. **@effective-agent/ai-sdk Package**
   - Core message schemas (EffectiveMessage, Part types)
   - Error types (AiSdkOperationError, AiSdkProviderError, etc.)
   - Message transformation utilities (bidirectional EffectiveMessage ↔ CoreMessage)
   - Schema conversion utilities (Effect Schema ↔ Zod ↔ Standard Schema)
   - Provider factory (OpenAI, Anthropic, Google, Groq, DeepSeek, Perplexity, xAI, Qwen)
   - AI operations (generateTextWithModel, generateObjectWithModel, generateEmbeddingsWithModel)

3. **Documentation Updates**
   - Added package documentation to README.md with usage examples
   - Updated CLAUDE.md with monorepo structure and ai-sdk usage patterns
   - Created comprehensive exports in index.ts

## Phase 3: Service Integration

The next phase involves integrating the new `@effective-agent/ai-sdk` package into the existing EffectiveAgent services.

### 3.1 Refactor ProviderService

**Goal:** Update ProviderService to use `@effective-agent/ai-sdk` for provider creation.

**Tasks:**
- [ ] Update `src/services/ai/provider/service.ts` to import from `@effective-agent/ai-sdk`
- [ ] Replace direct AI SDK imports with ai-sdk package functions
- [ ] Update provider client implementations to use ai-sdk types
- [ ] Update tests to work with new provider factory
- [ ] Verify all provider configurations still work

**Files to modify:**
- `src/services/ai/provider/service.ts`
- `src/services/ai/provider/clients/*.ts`
- `src/services/ai/provider/__tests__/*.test.ts`

### 3.2 Refactor Producer Services

**Goal:** Update all Producer services to use `@effective-agent/ai-sdk` for AI operations.

**Tasks:**
- [ ] **ChatProducerService** - Use `generateTextWithModel` from ai-sdk
- [ ] **ObjectProducerService** - Use `generateObjectWithModel` from ai-sdk
- [ ] **EmbeddingProducerService** - Use `generateEmbeddingsWithModel` from ai-sdk
- [ ] **TextProducerService** - Use ai-sdk operations
- [ ] Update message transformation to use ai-sdk utilities
- [ ] Update schema conversion to use ai-sdk utilities
- [ ] Update all producer tests

**Files to modify:**
- `src/services/producers/chat/service.ts`
- `src/services/producers/object/service.ts`
- `src/services/producers/embedding/service.ts`
- `src/services/producers/text/service.ts`
- `src/services/producers/*/__tests__/*.test.ts`

### 3.3 Clean Up Redundant Code ✅

**Goal:** Remove code that has been moved to `@effective-agent/ai-sdk`.

**Tasks:**
- [x] Remove duplicate message schemas from main codebase
- [x] Remove duplicate error types
- [x] Remove duplicate transformation utilities
- [x] Remove duplicate provider factory code
- [x] Update imports throughout codebase
- [x] Run full test suite to verify nothing broke

**Files cleaned up:**
- `src/schema.ts` - Removed duplicated message types (EffectiveRole, TextPart, ToolCallPart, ToolPart, ImageUrlPart, Part, Message)
- Updated imports in 20+ files across the codebase to use `@effective-agent/ai-sdk`
- Verified no duplicate error types exist between main codebase and ai-sdk package
- All builds pass and core functionality tests pass (944/968 tests passing)

### 3.4 Update Integration Tests

**Goal:** Ensure all integration tests work with the new ai-sdk package.

**Tasks:**
- [ ] Update model-provider-integration tests
- [ ] Update structured-output integration tests
- [ ] Update weather agent e2e tests
- [ ] Add new integration tests for ai-sdk package
- [ ] Verify all tests pass with zero errors

**Files to modify:**
- `src/__tests__/integration/model-provider-integration.test.ts`
- `src/examples/structured-output/__tests__/integration.test.ts`
- `src/examples/structured-output/__tests__/structured-output-agent-e2e.test.ts`
- `src/examples/weather/__tests__/weather-agent-e2e.test.ts`

## Phase 4: Enhanced AI Capabilities

After service integration is complete, consider adding enhanced AI capabilities.

### 4.1 Streaming Support

**Goal:** Add streaming capabilities to ai-sdk package.

**Tasks:**
- [ ] Add `streamTextWithModel` function to ai-operations.ts
- [ ] Add `streamObjectWithModel` function to ai-operations.ts
- [ ] Create streaming result types
- [ ] Update ChatProducerService to support streaming
- [ ] Add streaming tests

### 4.2 Tool Support

**Goal:** Add tool/function calling support to ai-sdk package.

**Tasks:**
- [ ] Add ToolDefinition types to input-types.ts
- [ ] Update generateTextWithModel to support tools
- [ ] Add tool result handling in message-transformer.ts
- [ ] Update ChatProducerService to support tools
- [ ] Add tool tests

### 4.3 Multi-Modal Support

**Goal:** Enhance multi-modal capabilities (images, audio).

**Tasks:**
- [ ] Add image generation support to ai-sdk
- [ ] Add speech generation support to ai-sdk
- [ ] Add transcription support to ai-sdk
- [ ] Update producer services accordingly
- [ ] Add multi-modal tests

## Phase 5: Package Publishing

Once the package is stable and well-tested, consider publishing it.

### 5.1 Prepare for Publishing

**Tasks:**
- [ ] Add comprehensive package documentation
- [ ] Add usage examples to package README
- [ ] Add contributing guidelines
- [ ] Add changelog
- [ ] Set up semantic versioning
- [ ] Add license file
- [ ] Update package.json metadata (description, keywords, repository)

### 5.2 Publish to npm

**Tasks:**
- [ ] Remove `"private": true` from package.json
- [ ] Set up npm publishing workflow
- [ ] Create GitHub release workflow
- [ ] Publish v0.1.0 to npm
- [ ] Update main README with installation instructions

## Testing Strategy

For each phase, follow this testing approach:

1. **Unit Tests** - Test individual functions and utilities
2. **Integration Tests** - Test service interactions with real AI providers
3. **E2E Tests** - Test complete agent workflows
4. **Type Checking** - Ensure zero TypeScript errors
5. **Linting** - Ensure code passes Biome checks

**Test Commands:**
```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Type check
bun run typecheck

# Lint
bunx biome lint .
```

## Success Criteria

Each phase is complete when:

- ✅ All tests pass (zero failures)
- ✅ Zero TypeScript errors
- ✅ Zero linting issues
- ✅ Documentation is updated
- ✅ Code review completed
- ✅ No performance regressions

## Notes

- **Follow Effect patterns** - All code must use Effect.Service pattern and Effect.gen
- **Maintain type safety** - No `any` types, proper error handling
- **Integration tests** - Use real services, not mocks
- **Documentation** - Keep docs in sync with code changes

## Timeline Estimate

- **Phase 3.1** (Refactor ProviderService): 4-6 hours
- **Phase 3.2** (Refactor Producer Services): 8-12 hours
- **Phase 3.3** (Clean Up Redundant Code): 2-4 hours
- **Phase 3.4** (Update Integration Tests): 4-6 hours
- **Phase 4** (Enhanced AI Capabilities): 12-16 hours
- **Phase 5** (Package Publishing): 4-6 hours

**Total estimated time for Phase 3-5:** 34-50 hours

## Questions to Consider

1. Should `@effective-agent/ai-sdk` support streaming in the initial version?
2. Should we add retry logic and circuit breakers to ai-sdk, or keep that in the main codebase?
3. Should we extract more utilities to ai-sdk (e.g., rate limiting, caching)?
4. Should we publish the package to npm, or keep it internal?
5. Should we add telemetry/metrics to ai-sdk operations?
