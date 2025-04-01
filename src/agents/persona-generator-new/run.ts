import { config } from 'dotenv'
import { join } from 'path'
import { PersonaGeneratorAgent } from './persona-generator-agent.ts'
import type { PersonaInput } from './types.ts'


/**
 * Runs the persona generator agent with the specified options
 * @param options Configuration options for the agent run
 */
export async function runPersonaGeneratorAgent(options: PersonaInput): Promise<void> {
    options.inputDir = options.inputDir ?? join(process.cwd(), 'input')
    options.outputDir = options.outputDir ?? join(process.cwd(), 'output')
    config()

    const agent = new PersonaGeneratorAgent('persona-generator-new')

    const outputDir = options.outputDir
    const inputDir = options.inputDir
    try {
        const result = await agent.run({ inputDir, outputDir })
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
