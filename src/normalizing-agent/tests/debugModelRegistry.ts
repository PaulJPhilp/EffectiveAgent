// Simple debug script to verify model registry and task registry functionality

import { ModelRegistryService } from "../../../shared/services/model/modelRegistryService.js";
import { TaskRegistryService } from "../../../shared/implementations/task/taskRegistry.js";

// Set up global error handler to catch unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});

async function debugModelRegistry() {
    console.log("Debugging Model Registry and Task Registry...");
    
    try {
        // Initialize model registry
        console.log("Initializing Model Registry...");
        const modelRegistry = await ModelRegistryService.getInstance();
        
        // Check if we have models
        const models = modelRegistry.getAllModels();
        console.log(`Found ${models.length} models in registry`);
        
        // List all models
        models.forEach(model => {
            console.log(`Model: ${model.id} (${model.provider})`);
            console.log(`  Capabilities: ${model.capabilities?.join(", ")}`);
        });
        
        // Initialize task registry
        console.log("\nInitializing Task Registry...");
        const taskRegistry = new TaskRegistryService();
        await taskRegistry.loadTaskConfigurations();
        
        // Get all tasks
        const tasks = taskRegistry.getAllTaskConfigs();
        console.log(`Found ${tasks.length} tasks in registry`);
        
        // Find the profile normalization task
        const normalizationTask = tasks.find(task => 
            task.name === "profile_normalization");
        
        if (normalizationTask) {
            console.log("\nProfile Normalization Task:");
            console.log(JSON.stringify(normalizationTask, null, 2));
            
            // Try to get the primary model
            if (normalizationTask.preferredModelIds?.[0]) {
                console.log(`\nPreferred model ID: ${normalizationTask.preferredModelIds[0]}`);
                try {
                    const model = modelRegistry.getModelById(
                        normalizationTask.preferredModelIds[0]
                    );
                    console.log(`Found preferred model: ${model.id}`);
                } catch (error) {
                    console.error("Error finding preferred model:", error);
                }
            } else {
                console.log("No preferred model ID found in task config");
            }
        } else {
            console.log("Profile normalization task not found");
        }
        
        console.log("\nDebug completed successfully");
        return true;
    } catch (error) {
        console.error("Debug failed with error:", 
            error instanceof Error ? error.message : String(error));
        console.error("Error stack:", 
            error instanceof Error ? error.stack : "No stack available");
        return false;
    }
}

// Run the debug function
debugModelRegistry()
    .then(success => {
        console.log(`Debug ${success ? "PASSED" : "FAILED"}`);
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error("Debug execution error:", 
            error instanceof Error ? error.message : String(error));
        console.error("Error stack:", 
            error instanceof Error ? error.stack : "No stack available");
        process.exit(1);
    });
