#!/usr/bin/env node

// Simple script to test structured output with Gemini
// This bypasses the CLI argument parsing issues

import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

// Set environment variables
process.env.MASTER_CONFIG_PATH = join(process.cwd(), "config-master/test.json");
process.env.PROJECT_ROOT = process.cwd();

// Main function
async function main() {
  try {
    // Import modules
    const { runWithAgentRuntime } = await import('./src/ea-agent-runtime/production-runtime.js');
    const { Effect, Console } = await import('effect');
    const { GoogleProviderClient } = await import('./src/services/ai/provider/clients/google-provider-client.js');
    
    // Read test config
    const inputFile = "/Users/paul/Projects/EffectiveAgent/test-config.json";
    const outputDir = "/Users/paul/Projects/EffectiveAgent/test-outputs";
    const modelId = "gemini-2.0-flash";
    
    console.log(`Reading input file: ${inputFile}`);
    const inputContent = readFileSync(inputFile, 'utf8');
    const config = JSON.parse(inputContent);
    
    console.log(`Found ${config.cases.length} test cases`);
    
    // Create output directory
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const resultsDir = join(outputDir, `results-${timestamp}`);
    mkdirSync(resultsDir, { recursive: true });
    
    console.log(`Created output directory: ${resultsDir}`);
    
    // Define test runner
    const runTest = Effect.gen(function* () {
      // Get Google client
      const googleClient = yield* GoogleProviderClient;
      
      // Process each test case
      for (const testCase of config.cases) {
        yield* Console.log(`Running test case: ${testCase.id}`);
        
        try {
          // Create messages for the model
          const messages = [
            {
              role: "user",
              content: `${testCase.prompt}\n\nSchema: ${JSON.stringify(testCase.schema, null, 2)}`
            }
          ];
          
          // Generate structured output
          const result = yield* googleClient.generateObject(
            { messages },
            { modelId, schema: testCase.schema }
          );
          
          // Save result
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
    await runWithAgentRuntime(runTest);
    console.log('Tests completed successfully');
    
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

main();
