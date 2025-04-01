// File: tokens.ts (Refactored)

/**
 * Service tokens for dependency injection.
 * These unique symbols identify services and configurations in the DI container.
 */
export const SERVICE_TOKENS = {
    // --- Core / Configuration Objects ---
    Container: Symbol.for('DependencyContainer'), // Optional: Token for the container itself
    agentConfig: Symbol.for('AgentConfig'),       // For the root AgentConfig object
    providersConfigFile: Symbol.for('ProvidersFile'), // For the loaded ProvidersFile object
    modelsConfigFile: Symbol.for('ModelConfigFile'),    // For the loaded ModelConfigFile object
    tasksConfigFile: Symbol.for('TaskConfigFile'),      // For the loaded TaskConfigFile object
    promptsConfigFile: Symbol.for('PromptConfigFile'),  // For the loaded PromptConfigFile object

    // --- Configuration Services (Services that provide access/querying for config) ---
    modelConfigService: Symbol.for('IModelConfigurationService'), // For the service that queries ModelConfigFile

    // --- Core Services ---
    providerService: Symbol.for('IProviderService'), // For the service that provides IModelProvider instances
    modelService: Symbol.for('IModelService'),       // For the service that orchestrates model generation
    taskService: Symbol.for('ITaskService'),         // For the service that executes defined tasks
    promptService: Symbol.for('IPromptService'),     // For the service that manages/renders prompts

    // --- Agent Graph Factories ---
    DefaultAgentGraphFactory: Symbol.for('DefaultAgentGraphFactory'), // For the default graph factory
    LangGraphAgentGraphFactory: Symbol.for('LangGraphAgentGraphFactory'), // For the LangGraph factory

    // Add other tokens as needed for different services or components
};

// Using Symbol.for() allows symbols with the same key to be identical across different
// files/modules if needed, which can be helpful for shared libraries, though standard
// Symbol() is usually sufficient for application-level DI. Let's stick with Symbol.for for clarity.
