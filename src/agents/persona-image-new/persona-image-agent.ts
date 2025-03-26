import { Agent } from '../agent-service/Agent.js'
import type { AgentGraphImplementation } from '../agent-service/AgentGraph.js'
import { createLangGraphAgentGraph } from '../agent-service/LangGraphAgentGraph.js'
import type { AgentState } from '../agent-service/types.js'
import { GenerateImagesNode } from './nodes/generate-images.js'
import { InitializeRunNode } from './nodes/initialize-run.js'
import { LoadProfilesNode } from './nodes/load-profiles.js'
import { SaveResultsNode } from './nodes/save-results.js'
import type { ImageDomainState, ImageInput, ImageOutput } from './types.js'

/**
 * Agent that generates images for personas
 */
export class PersonaImageAgent extends Agent<ImageInput, ImageOutput, ImageDomainState> {
    protected buildGraph(): AgentGraphImplementation<AgentState<ImageInput, ImageOutput, ImageDomainState>> {
        const graph = {
            'initialize-run': {
                node: new InitializeRunNode(this.taskService, this.providerService, this.modelService, this.promptService),
                next: ['load-profiles']
            },
            'load-profiles': {
                node: new LoadProfilesNode(this.taskService, this.providerService, this.modelService, this.promptService),
                next: ['generate-images']
            },
            'generate-images': {
                node: new GenerateImagesNode(this.taskService, this.providerService, this.modelService, this.promptService),
                next: ['save-results']
            },
            'save-results': {
                node: new SaveResultsNode(this.taskService, this.providerService, this.modelService, this.promptService),
                next: []
            }
        }

        return createLangGraphAgentGraph(
            graph,
            'initialize-run',
            this.taskService,
            this.providerService,
            this.modelService,
            this.promptService
        )
    }

    protected generateLangGraphConfig() {
        return {
            nodes: [
                {
                    id: 'initialize-run',
                    type: 'InitializeRunNode',
                    next: ['load-profiles'],
                    data: {
                        description: 'Initializes a new image generation run'
                    }
                },
                {
                    id: 'load-profiles',
                    type: 'LoadProfilesNode',
                    next: ['generate-images'],
                    data: {
                        description: 'Loads normalized profiles from input directory'
                    }
                },
                {
                    id: 'generate-images',
                    type: 'GenerateImagesNode',
                    next: ['save-results'],
                    data: {
                        description: 'Generates images for each profile'
                    }
                },
                {
                    id: 'save-results',
                    type: 'SaveResultsNode',
                    next: [],
                    data: {
                        description: 'Saves final results and generates summary'
                    }
                }
            ],
            edges: [
                {
                    from: 'initialize-run',
                    to: 'load-profiles'
                },
                {
                    from: 'load-profiles',
                    to: 'generate-images'
                },
                {
                    from: 'generate-images',
                    to: 'save-results'
                }
            ],
            start_node_id: 'initialize-run',
            metadata: {
                description: 'Graph for generating persona images',
                version: '1.0.0'
            }
        }
    }

    async run(input: ImageInput): Promise<AgentState<ImageInput, ImageOutput, ImageDomainState>> {
        return super.run(input)
    }
} 