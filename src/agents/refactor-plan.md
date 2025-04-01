# Agent Refactoring Plan

## Overview
This document outlines the plan to refactor all agents to use Effect.ts and the new agent service architecture. The goal is to standardize agent implementations, improve error handling, and make agents more maintainable.

## Current State
We have several agents that need to be refactored:
- persona-generator-new
- persona-image-new
- normalizing-new
- persona-evaluator-new

The agent service has two versions:
- agent-service/ (old)
- agent-service-new/ (new Effect.ts based)

## Phase 1: Agent Service Consolidation

### Current Implementation Differences

#### Old Agent Service (agent-service/)
- Manual service initialization in constructor
- Direct class instantiation of dependencies
- Mutable state management
- Basic error handling without types
- Configuration loaded directly in constructor
- Services tightly coupled:
  ```typescript
  constructor({ configPath }: { configPath: string }) {
      this.configLoader = new ConfigurationLoader({...});
      this.config = this.configLoader.loadConfig('config.json');
      this.taskService = new TaskService(this.config);
      this.providerService = new ProviderService(this.config);
      // ... more direct instantiation
  }
  ```

#### New Agent Service (agent-service-new/)
- Effect.ts based implementation
- Dependency injection for all services
- Immutable state management
- Typed error handling through Effect.ts
- Service layer pattern
- Clear separation between Agent, AgentNode, and AgentGraph
- Standardized interfaces:
  ```typescript
  export interface AgentService<I extends JSONObject, O extends JSONObject, A extends JSONObject> {
    readonly run: (input: I) => Effect.Effect<AgentState<I, O, A>, never>;
    readonly buildGraph: () => Effect.Effect<void, AgentExecutionError>;
    readonly saveLangGraphConfig: (outputPath?: string) => Effect.Effect<void, AgentExecutionError>;
  }
  ```

### Implementation Steps

1. Finalize agent-service-new:
   - Complete Effect.ts integration
   - Verify all interfaces are properly defined
   - Ensure comprehensive error handling
   - Add complete test coverage
   - Validate dependency injection
   - Verify state management patterns

2. Service Migration:
   - Move existing services to use Effect.ts:
     - TaskService
     - ProviderService
     - ModelService
     - PromptService
   - Update service interfaces to use Effect.ts patterns
   - Implement proper error types for each service

3. Configuration Updates:
   - Standardize configuration loading through Effect.ts
   - Update configuration schemas
   - Implement validation using Effect.ts
   - Create proper type definitions for all configurations

4. Testing Infrastructure:
   - Create test utilities for Effect.ts based services
   - Add mock implementations for testing
   - Update test suites to use Effect.ts patterns
   - Ensure proper error case coverage

5. Cleanup:
   - Remove -new suffix from agent-service-new
   - Update all imports to use new service
   - Archive old agent-service for reference
   - Remove any unused dependencies
   - Update documentation

### Success Criteria for Phase 1
1. All services properly implement Effect.ts patterns
2. Complete test coverage for new implementation
3. No direct service instantiation in agent code
4. Proper error handling through Effect.ts
5. Clear separation of concerns between components
6. All configuration properly validated
7. No remaining references to old service implementation

## Phase 2: Agent Refactoring Template

Create a standard template for agent refactoring that includes:

1. Base Structure:
   ```typescript
   import { Effect } from "effect";
   import { Agent } from "../agent-service/Agent.js";
   import type { AgentState } from "../agent-service/types.js";
   
   export class SpecificAgent extends Agent<InputType, OutputType, AgentStateType> {
     protected buildGraphDefinition(): GraphDefinition<AgentState<InputType, OutputType, AgentStateType>> {
       // Define graph structure
     }
     
     protected getStartNodeId(): string {
       return "initialNode";
     }
   }
   ```

2. Node Structure:
   ```typescript
   import { Effect } from "effect";
   import { AgentNode } from "../agent-service/AgentNode.js";
   
   export class SpecificNode extends AgentNode<AgentState<InputType, OutputType, AgentStateType>> {
     execute(state: AgentState<...>): Effect.Effect<AgentState<...>, Error> {
       // Node implementation
     }
   }
   ```

## Phase 3: Agent-Specific Refactoring

### 1. Persona Generator Agent
- Convert state management to Effect.ts
- Implement new graph structure
- Update nodes to use Effect.ts
- Add proper error handling
- Update tests

### 2. Persona Image Agent
- Convert state management to Effect.ts
- Implement new graph structure
- Update image generation nodes
- Add proper error handling
- Update tests

### 3. Normalizing Agent
- Convert state management to Effect.ts
- Implement new graph structure
- Update normalization nodes
- Add proper error handling
- Update tests

### 4. Persona Evaluator Agent
- Convert state management to Effect.ts
- Implement new graph structure
- Update evaluation nodes
- Add proper error handling
- Update tests

## Phase 4: Testing and Integration

1. Unit Tests:
   - Test each agent independently
   - Test error handling scenarios
   - Test state management
   - Test graph execution

2. Integration Tests:
   - Test agent interactions
   - Test end-to-end workflows
   - Test error propagation

3. Performance Tests:
   - Measure execution time
   - Monitor memory usage
   - Test concurrent execution

## Phase 5: Cleanup and Documentation

1. Remove -new suffixes from all agent directories
2. Update documentation:
   - Add Effect.ts usage guidelines
   - Document error handling patterns
   - Update agent configuration docs
   - Add examples for common patterns

3. Code cleanup:
   - Remove unused code
   - Standardize naming conventions
   - Update import paths
   - Remove any remaining legacy code

## Timeline
1. Phase 1: 1 day
2. Phase 2: 1 day
3. Phase 3: 4 days (1 day per agent)
4. Phase 4: 2 days
5. Phase 5: 1 day

Total estimated time: 9 days

## Success Criteria
1. All agents use Effect.ts for state management
2. All agents use the new agent service architecture
3. 100% test coverage for critical paths
4. No legacy code remains
5. Documentation is complete and up-to-date
6. All tests pass
7. Performance metrics meet or exceed previous implementation 