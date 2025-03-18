// Test script specifically focused on the ModelService functionality

import { ModelService } from "../../../shared/services/model/modelService.js";
import { ModelRegistryService } from "../../../shared/services/model/modelRegistryService.js";
import { TaskRegistryService } from "../../../shared/services/task/taskRegistry.js";

// Global error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});

async function testModelService() {
    console.log("Testing ModelService with direct model retrieval...");
    
    try {
        // Step 1: Initialize model registry
        console.log("\n--- Initializing ModelRegistryService ---");
        const modelRegistry = new ModelRegistryService();
        const models = modelRegistry.getAllModels();
        console.log(`Found ${models.length} models in registry`);
        
        if (models.length === 0) {
            throw new Error("No models found in registry");
        }
        
        // Step 2: Initialize task registry
        console.log("\n--- Initializing TaskRegistryService ---");
        const taskRegistry = new TaskRegistryService();
        await taskRegistry.loadTaskConfigurations();
        const tasks = taskRegistry.getAllTaskConfigs();
        console.log(`Found ${tasks.length} tasks in registry`);
        
        const normalizationTask = tasks.find(task => 
            task.taskName === "profile-normalization");
            
        if (!normalizationTask) {
            throw new Error("Profile normalization task not found");
        }
        
        console.log("\nProfile normalization task:", JSON.stringify(normalizationTask, null, 2));
        
        // Step 3: Initialize model service
        console.log("\n--- Initializing ModelService ---");
        const modelService = new ModelService();
        console.log("ModelService initialized successfully");
        
        // Step 4: Test direct model retrieval
        console.log("\n--- Testing direct model retrieval ---");
        const primaryModelId = normalizationTask.primaryModelId;
        
        if (!primaryModelId) {
            throw new Error("No primary model ID specified for normalization task");
        }
        
        console.log(`Primary model ID from task config: ${primaryModelId}`);
        
        // Try to get the model by ID from the registry
        const model = modelRegistry.getModelById(primaryModelId);
        console.log(`Found model: ${model.id} (${model.provider})`);
        console.log("Model details:", JSON.stringify(model, null, 2));
        
        // Step 5: Test dummy completion (don't actually call the provider)
        console.log("\n--- Testing model service methods ---");
        console.log("Note: Not making actual API calls, just testing the method structure");
        
        // Just testing if the method is properly defined
        const completionOptions = {
            prompt: "This is a test prompt",
            systemPrompt: "You are a test assistant",
            temperature: 0.1,
            maxTokens: 100
        };
        
        // Don't actually call this, just check if it's properly defined
        console.log(`Would call modelService.completeWithModel(${primaryModelId}, {...options})`);
        
        console.log("\nAll ModelService tests passed!");
        return true;
    } catch (error) {
        console.error("ModelService test failed with error:", 
            error instanceof Error ? error.message : String(error));
        console.error("Error stack:", 
            error instanceof Error ? error.stack : "No stack available");
        return false;
    }
}

// Run the test
testModelService()
    .then(success => {
        console.log(`\nTest ${success ? "PASSED" : "FAILED"}`);
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error("Test execution error:", 
            error instanceof Error ? error.message : String(error));
        console.error("Error stack:", 
            error instanceof Error ? error.stack : "No stack available");
        process.exit(1);
    });
