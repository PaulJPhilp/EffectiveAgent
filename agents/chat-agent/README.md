# Chat Agent

A fully functional chat agent built with Effective Agent and LangGraph, demonstrating modern TypeScript patterns and Effect-based architecture.

## ✅ Status: Working

The chat agent is **fully functional** and ready for use! All core components are implemented and tested.

## 🚀 Quick Start

### Simple Demo (Recommended)
```bash
cd agents/chat-agent
bun simple-demo.ts
```

This runs a complete demonstration showing:
- ✅ Chat agent creation with configuration
- ✅ Initial state creation with user/session context  
- ✅ Message addition using state transformers
- ✅ LangGraph compilation and structure
- ✅ State management and conversation tracking
- ✅ Summary generation

### Run Tests
```bash
bun test
```

## 🏗️ Architecture

### Core Components

1. **ChatAgent Class** (`agent/agent.ts`)
   - Main agent implementation using LangGraph StateGraph
   - State management with TypeScript annotations
   - Message handling and conversation tracking
   - Integration with EA SDK helpers

2. **LangGraph Nodes** (`agent/nodes/index.ts`)
   - `validateConversation` - Policy and limit validation
   - `processUserMessage` - Message processing and topic extraction
   - `generateResponse` - AI response generation using EA services

3. **State Management** (`agent/agent-state.ts`)
   - Typed state interfaces for chat conversations
   - Context management for user sessions
   - Conversation metadata tracking

4. **Actor Integration** (`actor/chat-actor.ts`)
   - Mailbox-based message processing
   - Asynchronous state updates
   - Activity streaming and subscription

### Key Features

- **TypeScript LangGraph Integration**: Uses current LangGraph TypeScript API with proper state annotations
- **Effect-Based Architecture**: Full integration with Effect-TS for error handling and service management
- **EA SDK Integration**: Leverages EA SDK helpers for bridging Effect and LangGraph
- **State Transformers**: Clean, functional state updates using EA SDK patterns
- **Activity Logging**: Structured logging through EA logging system
- **Policy Validation**: Integration with EA policy service for conversation limits
- **Actor Model**: Optional actor-based processing with mailbox pattern

## 📁 File Structure

```
agents/chat-agent/
├── agent/
│   ├── agent.ts           # Main ChatAgent class
│   ├── agent-state.ts     # State type definitions
│   ├── types.ts           # Configuration types
│   ├── nodes/
│   │   └── index.ts       # LangGraph node implementations
│   └── utils/
│       ├── actions.ts     # Promise-based EA service wrappers
│       ├── effect-definitions.ts  # Effect-based service logic
│       └── index.ts       # Utility exports
├── actor/
│   ├── chat-actor.ts      # Actor implementation with mailbox
│   └── index.ts           # Actor exports
├── __tests__/
│   └── chat-agent.test.ts # Integration tests
├── main.ts                # Example usage functions
├── simple-demo.ts         # Working demo (✅ Recommended)
├── demo.ts                # Full EA integration demo
├── actor-demo.ts          # Actor pattern demo
└── README.md              # This file
```

## 🔧 Configuration

The chat agent accepts configuration options:

```typescript
interface ChatAgentConfig {
    readonly maxMessages: number           // Default: 50
    readonly responseTimeoutMs: number     // Default: 300000 (5 min)
    readonly enableTopicTracking: boolean  // Default: true
    readonly defaultTone: "formal" | "casual" | "friendly"  // Default: "friendly"
}
```

## 💡 Usage Examples

### Basic Usage
```typescript
import { createChatAgent } from "./agent/agent.js"

// Create agent with EA runtime service
const chatAgent = createChatAgent(agentRuntimeService, {
    maxMessages: 10,
    defaultTone: "friendly"
})

// Initialize conversation
let state = await chatAgent.createInitialState("user123", "session456")

// Add user message
state = chatAgent.addMessage({
    role: "user",
    content: "Hello, I need help!"
}, state)

// Run LangGraph processing
state = await chatAgent.getCompiledGraph().invoke(state)

// Get conversation summary
const summary = await chatAgent.getSummary(state)
```

### Actor Pattern Usage
```typescript
import { startChatActor } from "./actor/index.js"

// Start chat actor
const chatActor = await startChatActor({
    runtimeSvc: agentRuntimeService,
    userId: "user123",
    sessionId: "session456",
    config: { maxMessages: 10, defaultTone: "friendly" }
})

// Send messages asynchronously
await chatActor.postUserMessage("Hello!")

// Get current state
const state = await chatActor.getState()

// Subscribe to activities
for await (const activity of chatActor.subscribe()) {
    console.log("Activity:", activity)
}

// Stop actor
await chatActor.stop()
```

## 🧪 Testing

The chat agent includes comprehensive tests:

- ✅ Configuration validation
- ✅ State management
- ✅ Message handling
- ✅ LangGraph integration
- ✅ EA service integration

All tests use real services only - mocks are completely forbidden in this codebase.

## 🔗 Integration Points

### EA Services Used
- **AgentRuntimeService**: Core runtime and service access
- **ModelService**: AI response generation
- **PolicyService**: Conversation validation
- **ConfigurationService**: Configuration management
- **FileService**: File operations
- **ToolRegistryService**: Tool management

### LangGraph Features
- **StateGraph**: Graph-based conversation flow
- **Annotations**: Type-safe state management
- **Nodes**: Modular processing steps
- **Conditional Edges**: Dynamic flow control
- **Streaming**: Real-time processing support

## 🎯 Next Steps

The chat agent is ready for:

1. **Production Deployment**: All core functionality is implemented
2. **Custom Node Development**: Add domain-specific processing nodes
3. **Advanced Workflows**: Extend with complex conversation flows
4. **Tool Integration**: Add external tool calling capabilities
5. **Multi-Modal Support**: Extend for images, files, etc.

## 🐛 Known Limitations

- Actor demo requires full EA actor runtime setup
- Some advanced LangGraph features may need additional configuration
- Real AI model integration requires valid API keys and configuration

## 📚 Related Documentation

- [EA SDK Documentation](../../src/ea-langgraph-sdk/)
- [LangGraph TypeScript Guide](https://langchain-ai.github.io/langgraph/)
- [Effect-TS Documentation](https://effect.website/)

---

**Status**: ✅ **Working and Ready for Use**

The chat agent demonstrates a complete, production-ready implementation of a conversational AI agent using modern TypeScript, Effect-TS, and LangGraph patterns. 