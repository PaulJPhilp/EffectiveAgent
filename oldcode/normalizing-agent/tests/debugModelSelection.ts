import { ModelSelectionFactory } from "../../../shared/services/model/modelSelectionFactory.js";
import { TaskRegistryService } from "../../../shared/services/task/taskRegistryService.js";

async function debugModelSelection() {
  console.log("Debugging Model Selection...");  
  
  // Initialize services
  const modelSelectionFactory = new ModelSelectionFactory();
  const taskRegistry = new TaskRegistryService();
  
  // Get task config for profile normalization
  const taskConfig = taskRegistry.getTaskConfig("profile_normalization");
  if (!taskConfig) {
    console.error("Task config not found for profile_normalization");
    return;
  }
  
  console.log("Task config:", JSON.stringify(taskConfig, null, 2));
  
  try {
    // Try to select a model using the task requirements
    const modelSelection = modelSelectionFactory.selectModel({
      contextWindowSize: taskConfig.contextWindowSize,
      thinkingLevel: taskConfig.thinkingLevel,
      temperature: taskConfig.temperature,
      preferredModelId: taskConfig.primaryModelId
    });
    
    console.log("Selected model:", JSON.stringify(modelSelection, null, 2));
  } catch (error) {
    console.error("Error selecting model:", error);
  }
  
  // List all available models
  const allModels = modelSelectionFactory.getAllModels();
  console.log(`Found ${allModels.length} models:`);
  allModels.forEach(model => {
    console.log(`- ${model.id} (${model.provider}): `, {
      contextWindow: model.contextWindow,
      capabilities: model.capabilities,
      thinkingLevel: model.thinkingLevel
    });
  });
}

// Run the debug function
debugModelSelection()
  .then(() => console.log("Debug complete"))
  .catch(error => console.error("Debug failed:", error));
