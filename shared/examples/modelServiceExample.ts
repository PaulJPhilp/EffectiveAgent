import { ModelService } from '../services/model/index.js'

/**
 * Example of using the ModelService
 */
async function runModelServiceExample(): Promise<void> {
    try {
        // Initialize the model service
        const modelService = await ModelService.getInstance()

        console.log('Model Service Example')
        console.log('--------------------')

        // Example 1: Using a task-specific model
        console.log('\nExample 1: Using a task-specific model for clustering')
        const clusteringResult = await modelService.completeWithTaskModel('clustering', {
            prompt: 'Cluster these personas into groups based on similarities: [...]',
            systemPrompt: 'You are a helpful assistant that clusters personas into groups.'
        })
        console.log('Clustering result:', clusteringResult.text)
        console.log('Token usage:', clusteringResult.usage)

        // Example 2: Using a specific model by ID
        console.log('\nExample 2: Using a specific model by ID')
        const specificModelResult = await modelService.completeWithModel('gpt-4o-mini', {
            prompt: 'Elaborate on this persona: [...]',
            systemPrompt: 'You are a helpful assistant that elaborates on personas.'
        })
        console.log('Specific model result:', specificModelResult.text)
        console.log('Token usage:', specificModelResult.usage)

        // Example 3: Using the default model
        console.log('\nExample 3: Using the default model')
        const defaultModelResult = await modelService.completeWithDefaultModel({
            prompt: 'Create an executive summary for this persona: [...]',
            systemPrompt: 'You are a helpful assistant that creates executive summaries.'
        })
        console.log('Default model result:', defaultModelResult.text)
        console.log('Token usage:', defaultModelResult.usage)

    } catch (error) {
        console.error('Error in model service example:', error)
    }
}

// Run the example if this file is executed directly
if (require.main === module) {
    runModelServiceExample().catch(error => {
        console.error('Unhandled error in example:', error)
        process.exit(1)
    })
}

export { runModelServiceExample }
