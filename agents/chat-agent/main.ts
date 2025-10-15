/**
 * Main entry point for the Chat Agent
 * @file Demonstrates how to create and run a LangGraph agent with EA SDK using current patterns
 */

import type { AgentRuntimeServiceApi } from "@/ea-agent-runtime/api.js"
import { createChatAgent } from "./agent/agent.js"

/**
 * Example usage function showing how to use the chat agent with current API
 */
export async function runChatAgent(agentRuntime: AgentRuntimeServiceApi): Promise<void> {
    // Create agent instance
    const chatAgent = createChatAgent(agentRuntime, {
        maxMessages: 10,
        defaultTone: "casual"
    })

    try {
        // Initialize conversation
        let state = await chatAgent.createInitialState("user123", "session456")

        // Add user message using current add_messages pattern
        state = chatAgent.addMessage({
            role: "user",
            content: "Hello, I need help with my account"
        }, state)

        // Run the agent using compiled graph
        state = await chatAgent.getCompiledGraph().invoke(state)

        // Get summary
        const summary = await chatAgent.getSummary(state)
        console.log("Conversation Summary:")
        console.log(summary)

        // Log final state
        console.log("\nFinal State:")
        console.log("Messages:", state.messages.length)
        console.log("Current Step:", state.currentStep)
        if (state.error) {
            console.log("Error:", state.error)
        }

    } catch (error) {
        console.error("Error running chat agent:", error)
    }
}

/**
 * Example using current LangGraph streaming API
 */
export async function runChatAgentWithStreaming(agentRuntime: AgentRuntimeServiceApi): Promise<void> {
    try {
        // Create agent instance
        const chatAgent = createChatAgent(agentRuntime, {
            maxMessages: 10,
            defaultTone: "casual"
        })

        // Initialize state
        let state = await chatAgent.createInitialState("user123", "session456")

        // Add user message
        state = chatAgent.addMessage({
            role: "user",
            content: "Hello, I need help with my account"
        }, state)

        // Stream the agent execution using current streaming API
        console.log("Streaming agent execution…")
        const stream = await chatAgent.getCompiledGraph().stream(state)

        for await (const event of stream) {
            console.log("Event:", event)
            // Update state with the latest event data
            if (event && typeof event === 'object') {
                const eventKeys = Object.keys(event)
                const nodeKey = eventKeys[0]
                if (nodeKey) {
                    const nodeOutput = event[nodeKey]
                    if (nodeOutput && typeof nodeOutput === 'object') {
                        state = { ...state, ...nodeOutput }
                    }
                }
            }
        }

        // Get summary
        const summary = await chatAgent.getSummary(state)
        console.log("\nFinal Summary:")
        console.log(summary)

    } catch (error) {
        console.error("Error running chat agent with streaming:", error)
        // Fallback to basic execution
        await runChatAgent(agentRuntime)
    }
}

/**
 * Example using LangGraph runtime with current patterns
 */
export async function runChatAgentWithLangGraph(agentRuntime: AgentRuntimeServiceApi): Promise<void> {
    try {
        // Create agent instance
        const chatAgent = createChatAgent(agentRuntime, {
            maxMessages: 10,
            defaultTone: "casual"
        })

        // Initialize state
        let state = await chatAgent.createInitialState("user123", "session456")

        // Add user message
        state = chatAgent.addMessage({
            role: "user",
            content: "Hello, I need help with my account"
        }, state)

        // Get the compiled graph and run with current API
        const compiledGraph = chatAgent.getCompiledGraph()

        // Use current invoke method
        state = await compiledGraph.invoke(state)

        // Get summary
        const summary = await chatAgent.getSummary(state)
        console.log("LangGraph Execution Summary:")
        console.log(summary)

    } catch (error) {
        console.error("Error running chat agent with LangGraph:", error)
        // Fallback to basic execution
        await runChatAgent(agentRuntime)
    }
}

/**
 * Example demonstrating multiple conversation turns
 */
export async function runMultiTurnConversation(agentRuntime: AgentRuntimeServiceApi): Promise<void> {
    try {
        const chatAgent = createChatAgent(agentRuntime, {
            maxMessages: 20,
            defaultTone: "friendly"
        })

        let state = await chatAgent.createInitialState("user456", "session789")

        // Simulate a multi-turn conversation
        const userMessages = [
            "Hello, can you help me?",
            "I have a question about my billing",
            "How can I update my payment method?"
        ]

        for (const message of userMessages) {
            console.log(`\n--- User: ${message} ---`)

            // Add user message
            state = chatAgent.addMessage({
                role: "user",
                content: message
            }, state)

            // Run the agent using compiled graph
            state = await chatAgent.getCompiledGraph().invoke(state)

            // Show the latest assistant response
            const lastMessage = state.messages[state.messages.length - 1]
            if (lastMessage && lastMessage._getType() === "ai") {
                console.log(`Assistant: ${lastMessage.content}`)
            }
        }

        // Final summary
        const summary = await chatAgent.getSummary(state)
        console.log(`\n${"=".repeat(50)}`)
        console.log("Final Conversation Summary:")
        console.log(summary)

    } catch (error) {
        console.error("Error in multi-turn conversation:", error)
    }
}

/**
 * Main function to demonstrate the chat agent
 */
export async function main(): Promise<void> {
    console.log("Chat Agent Example - Current LangGraph API")
    console.log("==========================================")

    // Note: In a real implementation, you would get AgentRuntimeService from EA
    // For this example, we'll need to be provided with a runtime instance
    console.log("This agent requires an AgentRuntimeService instance to run.")
    console.log("Please use this agent through the EA framework.")
    console.log("\nAvailable functions:")
    console.log("- runChatAgent()")
    console.log("- runChatAgentWithStreaming()")
    console.log("- runChatAgentWithLangGraph()")
    console.log("- runMultiTurnConversation()")
}

// Run main if this is the entry point
if (import.meta.main) {
    main().catch(console.error)
} 