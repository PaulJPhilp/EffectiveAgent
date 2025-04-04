# Effect.ts-based Agents

This directory contains the refactored agents using Effect.ts and the new agent service architecture. Each agent follows the standardized patterns for state management, error handling, and service integration.

## Directory Structure

```
agents-effect/
├── persona-generator/    # Persona generation agent
├── persona-image/       # Persona image generation agent
├── normalizing/         # Data normalization agent
├── persona-evaluator/   # Persona evaluation agent
└── shared/             # Shared utilities and types
```

## Implementation Details

All agents in this directory follow these principles:

1. Effect.ts Integration
   - Use Effect.ts for all asynchronous operations
   - Leverage Effect.ts for error handling
   - Implement proper state management

2. Service Architecture
   - Use dependency injection
   - Follow service layer pattern
   - Maintain clear separation of concerns

3. Testing
   - Comprehensive unit tests
   - Integration tests for workflows
   - Performance benchmarks

4. Error Handling
   - Typed errors using Effect.ts
   - Proper error propagation
   - Comprehensive error recovery

5. Configuration
   - Standardized configuration loading
   - Validated schemas
   - Environment-aware settings

## Migration Status

This directory is part of the agent refactoring project. See `src/agents/refactor-plan.md` for the complete refactoring plan and current status. 