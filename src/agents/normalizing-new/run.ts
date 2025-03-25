import { config } from 'dotenv'
import { join } from 'path'
import { NormalizingAgent } from './normalizing-agent.js'

interface RunOptions {
    readonly inputDir: string
    readonly outputDir?: string
    readonly configPath?: string
}

/**
 * Runs the normalizing agent with the specified options
 * @param options Configuration options for the agent run
 */
export async function runNormalizingAgent(options: RunOptions): Promise<void> {
    config()

    const agent = new NormalizingAgent({
        configPath: join(process.cwd(), options.configPath ?? 'agents/normalizing-new/config')
    })

    const outputDir = options.outputDir ?? join(process.cwd(), 'output')
    const inputDir = options.inputDir

    try {
        const result = await agent.run({ inputDir, outputDir })
        console.log('Normalization completed successfully')
        console.log('Summary:', result.output.summary)

        // Save LangGraph configuration for visualization
        await agent.saveLangGraphConfig(join(outputDir, 'langgraph.json'))
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error('Normalization failed:', message)
        process.exit(1)
    }
}

// Allow running directly via bun
if (require.main === module) {
    const [, , inputDir, outputDir] = process.argv

    if (!inputDir) {
        console.error('Error: Input directory is required')
        console.error('Usage: bun run run.ts <inputDir> [outputDir]')
        process.exit(1)
    }

    if (!outputDir) {
        console.error('Error: Output directory is required')
        console.error('Usage: bun run run.ts <inputDir> [outputDir]')
        process.exit(1)
    }

    void runNormalizingAgent({
        inputDir,
        outputDir,
        configPath: 'agents/normalizing-new/config'
    })
}

export type { RunOptions }
