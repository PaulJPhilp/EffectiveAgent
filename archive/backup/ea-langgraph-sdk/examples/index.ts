/**
 * EA SDK Examples - Complete Sample Implementations
 * @file Export all example agents and patterns for easy import
 * 
 * This module provides production-ready examples of how to use the EA SDK
 * with LangGraph agents. Each example demonstrates different use cases and
 * integration patterns.
 */


// Re-export all helper utilities for convenient access
export {
    createActivity, createNodeErrorHandler, createStateTransformer, getStateProperty, mergeState, runEffect, setStateProperty, validateStateStructure, wrapLangGraphNode
} from "../helpers.js"
// Re-export core types for example usage
export type {
    LangGraphActivityPayload, LangGraphAgentConfig, LangGraphAgentState
} from "../types.js"
// Chat Agent Example
export {
    ChatAgent,
    createChatAgent,
    exampleChatAgentUsage
} from "./chat-agent.js"
// Workflow Agent Example  
export {
    createWorkflowAgent,
    exampleWorkflowDefinition, WorkflowAgent
} from "./workflow-agent.js"

/**
 * Quick Start Guide
 * 
 * 1. **Chat Agent**: For conversational AI applications
 *    ```typescript
 *    import { createChatAgent } from '@/agent-runtime/langgraph-support/examples'
 *    const agent = createChatAgent(agentRuntime, { maxMessages: 20 })
 *    ```
 * 
 * 2. **Workflow Agent**: For complex multi-step processes  
 *    ```typescript
 *    import { createWorkflowAgent, exampleWorkflowDefinition } from '@/agent-runtime/langgraph-support/examples'
 *    const agent = createWorkflowAgent(agentRuntime)
 *    const state = agent.createWorkflowState("wf1", "user1", exampleWorkflowDefinition)
 *    ```
 * 
 * 3. **Custom Nodes**: Build your own LangGraph nodes
 *    ```typescript
 *    import { wrapLangGraphNode, runEffect } from '@/agent-runtime/langgraph-support/examples'
 *    const myNode = wrapLangGraphNode("my-node", async (state) => { ... })
 *    ```
 * 
 * 4. **State Management**: Use helper utilities
 *    ```typescript
 *    import { getStateProperty, setStateProperty, createStateTransformer } from '@/agent-runtime/langgraph-support/examples'
 *    const value = getStateProperty(state, "path.to.value", "fallback")
 *    ```
 */ 