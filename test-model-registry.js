// Simple CommonJS test script for model registry
// Run with: node test-model-registry.js

// Import fs for file operations
const fs = require('fs');
const path = require('path');

// Function to read and parse JSON files
function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return null;
  }
}

// Main function to test model registry
function testModelRegistry() {
  console.log('Testing model registry functionality...');
  
  // Read models config
  const modelsPath = path.join(process.cwd(), 'src', 'shared', 'config', 'models.json');
  console.log(`Reading models from: ${modelsPath}`);
  const modelConfig = readJsonFile(modelsPath);
  
  if (!modelConfig || !modelConfig.models) {
    console.error('Failed to read or parse models config file');
    return false;
  }
  
  console.log(`Found ${modelConfig.models.length} models:`);
  modelConfig.models.forEach(model => {
    console.log(`- ${model.id} (${model.provider}): ${model.capabilities?.join(', ')}`);
  });
  
  // Read tasks config
  const tasksPath = path.join(process.cwd(), 'src', 'shared', 'config', 'tasks.json');
  console.log(`\nReading tasks from: ${tasksPath}`);
  const taskConfig = readJsonFile(tasksPath);
  
  if (!taskConfig || !taskConfig.taskMappings) {
    console.error('Failed to read or parse tasks config file');
    return false;
  }
  
  console.log(`Found ${taskConfig.taskMappings.length} task mappings:`);
  taskConfig.taskMappings.forEach(task => {
    console.log(`- ${task.taskName}: primary model=${task.primaryModelId}`);
  });
  
  // Look for profile normalization task
  const normalizationTask = taskConfig.taskMappings.find(
    task => task.taskName === 'profile_normalization'
  );
  
  if (normalizationTask) {
    console.log('\nFound profile normalization task:');
    console.log(JSON.stringify(normalizationTask, null, 2));
    
    // Check if primary model exists
    const primaryModelId = normalizationTask.primaryModelId;
    const primaryModel = modelConfig.models.find(model => model.id === primaryModelId);
    
    if (primaryModel) {
      console.log(`\nPrimary model ${primaryModelId} exists!`);
      console.log(JSON.stringify(primaryModel, null, 2));
    } else {
      console.error(`\nPrimary model ${primaryModelId} not found in model registry!`);
    }
  } else {
    console.error('\nProfile normalization task not found in task registry!');
  }
  
  return true;
}

// Run the test
try {
  const success = testModelRegistry();
  console.log(`\nTest ${success ? 'PASSED' : 'FAILED'}`);
} catch (error) {
  console.error('\nTest failed with error:', error.message);
  console.error(error.stack);
}
