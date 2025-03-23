import { config } from 'dotenv';
import { join } from 'path';
import { ClusteringAgent } from './agent';

interface RunOptions {
  readonly inputDir: string;
  readonly outputDir?: string;
  readonly configPath?: string;
}

/**
 * Runs the persona generator agent with the specified options
 * @param options Configuration options for the agent run
 * @returns Result of the persona generation process
 */
const runPersonaGeneratorAgent = async (
  options: RunOptions,
): Promise<void> => {
  config();
  try {
    const rootPath = options.configPath ?? join(process.cwd(), 'agents', 'persona-generator');
    const agent = await new Promise<ClusteringAgent>((resolve) => {
      const agent = new ClusteringAgent({ rootPath });
      resolve(agent);
    });
    await agent.run();
    console.log('Persona generation completed successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Persona generation failed:', message);
    process.exit(1);
  }
};

// Allow running directly via bun
if (require.main === module) {
  const [, , inputDir, outputDir] = process.argv;
  if (!inputDir) {
    console.error('Usage: bun run agents/persona-generator/run.ts <inputDir> [outputDir]');
    process.exit(1);
  }

  runPersonaGeneratorAgent({
    inputDir,
    outputDir,
    configPath: join(process.cwd(), 'agents', 'persona-generator')
  }).catch((error) => {
    console.error('Failed to run persona generator:', error);
    process.exit(1);
  });
}

export { runPersonaGeneratorAgent, type RunOptions };
