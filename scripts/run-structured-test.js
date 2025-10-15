#!/usr/bin/env node

// Simple script to run the structured output test directly
// This bypasses the CLI argument parsing issues

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Set environment variables
process.env.MASTER_CONFIG_PATH = join(process.cwd(), "configuration/config-master/test.json");
process.env.PROJECT_ROOT = process.cwd();

// Import the necessary modules
import('./src/ea-agent-runtime/production-runtime.js').then(async ({ runWithAgentRuntime }) => {
  const { StructuredOutputAgent } = await import('./src/examples/structured-output/agent.js');
  const { Effect, Console } = await import('effect');
  
  // Configuration
  const inputFile = "/Users/paul/Projects/EffectiveAgent/test-config.json";
  const outputDir = "/Users/paul/Projects/EffectiveAgent/test-outputs";
  const modelId = "gemini-2.0-flash";
  const _runs = 1;
  
  // Main function
  const runTest = Effect.gen(function* () {
    // Read input file
    yield* Console.log(`Reading input file: ${inputFile}`);
    const inputContent = readFileSync(inputFile, 'utf8');
    const config = JSON.parse(inputContent);
    
    yield* Console.log(`Found ${config.cases.length} test cases`);
    
    // Create output directory
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const resultsDir = join(outputDir, `results-${timestamp}`);
    mkdirSync(resultsDir, { recursive: true });
    
    yield* Console.log(`Created output directory: ${resultsDir}`);
    
    // Get the agent
    const agent = yield* StructuredOutputAgent.Default;
    
    // Run tests
    for (const testCase of config.cases) {
      yield* Console.log(`Running test case: ${testCase.id}`);
      
      try {
        // Run the test
        const result = yield* agent.generateStructuredOutput({
          schema: testCase.schema,
          prompt: testCase.prompt,
          modelId
        });
        
        // Save the result
        const outputFile = join(resultsDir, `${testCase.id}-${modelId}.json`);
        writeFileSync(outputFile, JSON.stringify(result, null, 2));
        
        yield* Console.log(`✅ Test completed: ${testCase.id}`);
      } catch (error) {
        yield* Console.error(`❌ Test failed: ${testCase.id} - ${error}`);
      }
    }
    
    yield* Console.log(`All tests completed. Results saved to: ${resultsDir}`);
  });
  
  // Run with agent runtime
  runWithAgentRuntime(runTest)
    .then(() => console.log('Tests completed successfully'))
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
});
