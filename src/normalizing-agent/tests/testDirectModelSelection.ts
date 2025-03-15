import { ModelRegistryService } from "../../../shared/services/model/modelRegistryService.js";
import { TaskRegistryService } from "../../../shared/services/task/taskRegistryService.js";

async function testDirectModelSelection() {
  console.log("Testing Direct Model Selection...");
  
  // Initialize services
  const taskRegistry = new TaskRegistryService();
  
  // Get task config for profile normalization
  const taskConfig = await taskRegistry.getTaskConfig("profile_normalization");
  if (!taskConfig) {
    console.error("Task config not found for profile_normalization");
    return;
  }
  
  console.log("Task config:", JSON.stringify(taskConfig, null, 2));
  
  try {
    // Directly get the primary model from registry without using selectModel
    const modelRegistry = new ModelRegistryService();
    const model = modelRegistry.getModelById(taskConfig.primaryModelId);
    
    console.log("Primary model:", JSON.stringify(model, null, 2));
    console.log("TEST PASSED");
    return true;
  } catch (error) {
    console.error("Error selecting model:", error);
    console.log("TEST FAILED");
    return false;
  }
}

// Run the test
testDirectModelSelection()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error("Test execution error:", error);
    process.exit(1);
  });
