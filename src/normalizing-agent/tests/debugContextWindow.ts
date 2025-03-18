import { ModelRegistryService } from "../../../shared/services/model/modelRegistryService.js";
import { ModelSelectionFactory } from "../../../shared/services/model/modelSelectionFactory.js";
import type { ModelConfig } from "../../../shared/services/model/schemas/modelConfig.js";

async function debugContextWindow() {
  console.log("===== Debugging Context Window Size Matching =====");

  // Initialize services directly
  const modelRegistry = new ModelRegistryService();
  const modelSelectionFactory = new ModelSelectionFactory();

  const requiredContextWindowSize = "medium-context-window";
  console.log(`Required context window size: "${requiredContextWindowSize}" (${typeof requiredContextWindowSize})`);

  // Get all available models
  const allModels = modelSelectionFactory.getAllModels();
  console.log(`Found ${allModels.length} models`);

  // Test context window matching for each model
  allModels.forEach((model: ModelConfig) => {
    console.log(`\nTesting model: ${model.id}`);
    console.log(`Model context window size: "${model.contextWindowSize}" (${typeof model.contextWindowSize})`);

    // Direct equality comparison
    const strictEqual = model.contextWindowSize === requiredContextWindowSize;
    const looseEqual = model.contextWindowSize == requiredContextWindowSize;

    console.log(`Direct strict equality (===): ${strictEqual}`);
    console.log(`Direct loose equality (==): ${looseEqual}`);

    // String comparison
    const stringEqual = String(model.contextWindowSize) === String(requiredContextWindowSize);
    console.log(`String comparison: ${stringEqual}`);

    // Try to manually call meetsContextWindowRequirement
    try {
      // @ts-ignore - Accessing private method for debugging
      const result = modelSelectionFactory["meetsContextWindowRequirement"](model, requiredContextWindowSize);
      console.log(`meetsContextWindowRequirement result: ${result}`);
    } catch (error) {
      console.error(`Error calling meetsContextWindowRequirement: ${error}`);
    }
  });

  // Attempt to perform model selection
  try {
    console.log("\n===== Testing model selection =====");
    const modelSelection = modelSelectionFactory.selectModel({
      contextWindowSize: requiredContextWindowSize
    });
    console.log("Selected model:", modelSelection.model.id);
  } catch (error) {
    console.error("Model selection failed:", error);
  }
}

// Run the debug function
debugContextWindow()
  .then(() => console.log("\nDebug complete"))
  .catch(error => console.error("Debug failed:", error));
