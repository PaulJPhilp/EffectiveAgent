import { config } from 'dotenv'
import { join } from 'path'
import { PersonaGeneratorAgent } from './persona-generator-agent.ts'

interface RunOptions {
    readonly inputDir: string
    readonly outputDir?: string
    readonly configPath?: string
}

/**
 * Runs the normalizing agent with the specified options
 * @param options Configuration options for the agent run
 */
export async function runPersonaGeneratorAgent(options: RunOptions): Promise<void> {
    config()

    const agent = new PersonaGeneratorAgent('persona-generator-new')

    const outputDir = options.outputDir ?? join(process.cwd(), 'output')
    const inputDir = options.inputDir
    try {
        const result = await agent.run({ inputDir })
        console.log('PersonaGeneratorAgent completed successfully')
        console.log('Summary:', result.output)

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

    void runPersonaGeneratorAgent({
        inputDir,
        outputDir
    })
}

export type { RunOptions }
