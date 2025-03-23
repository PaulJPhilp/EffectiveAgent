import { join } from 'path';
import { config } from 'dotenv';
import { ImageAgent } from './agent';

interface RunOptions {
  readonly inputDir: string;
  readonly outputDir?: string;
  readonly configPath?: string;
}

/**
 * Runs the normalizing agent with the specified options
 * @param options Configuration options for the agent run
 * @returns Result of the normalization process
 */
const runImageAgent = async (
  options: RunOptions,
): Promise<void> => {
  config();
  const agent = new ImageAgent({ configPath: options.configPath ?? './agents/persona-image/config/config.json' });
  const outputDir = options.outputDir ?? join(process.cwd(), 'output');
  const inputDir = options.inputDir ?? join(process.cwd(), 'data');
  
  try {
    const result = await agent.run(inputDir, outputDir);
    console.log('Image generation completed successfully');
    console.log('Summary:', result.summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Image generation failed:', message);
    process.exit(1);
  }
};

// Allow running directly via bun
if (require.main === module) {
  const [,, inputDir, outputDir] = process.argv;
  if (!inputDir) {
    console.error('Error: Input directory is required');
    console.error('Usage: bun run run.ts <inputDir> [outputDir]');
    process.exit(1);
  }

  if (!outputDir) {
    console.error('Error: Output directory is required');
    console.error('Usage: bun run run.ts <inputDir> [outputDir]');
    process.exit(1);
  }
  void runImageAgent({ inputDir, outputDir, configPath: './agents/persona-image/config/config.json'  });
}

export { runImageAgent, type RunOptions };