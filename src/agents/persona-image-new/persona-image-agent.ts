import { AgentGraph } from '../agent-service/AgentGraph.js'
import type { AgentState } from '../agent-service/types.js'
import { GenerateImagesNode } from './nodes/generate-images.js'
import { InitializeRunNode } from './nodes/initialize-run.js'
import { LoadProfilesNode } from './nodes/load-profiles.js'
import { SaveResultsNode } from './nodes/save-results.js'
import type { ImageDomainState, ImageInput, ImageOutput } from './types.js'

/**
 * Agent that generates images for personas
 */
export class PersonaImageAgent extends AgentGraph<ImageInput, ImageOutput, ImageDomainState> {
    constructor(configPath: string) {
        super(configPath)
    }

    protected buildGraph(): void {
        const initializeRunNode = new InitializeRunNode()
        const loadProfilesNode = new LoadProfilesNode()
        const generateImagesNode = new GenerateImagesNode()
        const saveResultsNode = new SaveResultsNode()

        this.addNode('initialize-run', initializeRunNode)
        this.addNode('load-profiles', loadProfilesNode)
        this.addNode('generate-images', generateImagesNode)
        this.addNode('save-results', saveResultsNode)

        this.addEdge('initialize-run', 'load-profiles')
        this.addEdge('load-profiles', 'generate-images')
        this.addEdge('generate-images', 'save-results')
    }

    protected generateLangGraphConfig(): Record<string, unknown> {
        return {
            nodes: [
                {
                    id: 'initialize-run',
                    data: {
                        type: 'InitializeRunNode',
                        description: 'Initializes a new image generation run'
                    }
                },
                {
                    id: 'load-profiles',
                    data: {
                        type: 'LoadProfilesNode',
                        description: 'Loads normalized profiles from input directory'
                    }
                },
                {
                    id: 'generate-images',
                    data: {
                        type: 'GenerateImagesNode',
                        description: 'Generates images for each profile'
                    }
                },
                {
                    id: 'save-results',
                    data: {
                        type: 'SaveResultsNode',
                        description: 'Saves final results and generates summary'
                    }
                }
            ],
            edges: [
                {
                    source: 'initialize-run',
                    target: 'load-profiles',
                    data: {
                        type: 'state',
                        description: 'Passes initialized state'
                    }
                },
                {
                    source: 'load-profiles',
                    target: 'generate-images',
                    data: {
                        type: 'state',
                        description: 'Passes loaded profiles'
                    }
                },
                {
                    source: 'generate-images',
                    target: 'save-results',
                    data: {
                        type: 'state',
                        description: 'Passes generated images'
                    }
                }
            ]
        }
    }

    async run(input: ImageInput): Promise<AgentState<ImageInput, ImageOutput, ImageDomainState>> {
        const initialState: AgentState<ImageInput, ImageOutput, ImageDomainState> = {
            input,
            output: {
                images: [],
                imageResults: [],
                summary: {
                    totalProfiles: 0,
                    successfulGenerations: 0,
                    failedGenerations: 0,
                    totalDuration: 0,
                    totalTokensUsed: 0
                }
            },
            agentState: {
                profiles: [],
                images: [],
                imageResults: []
            },
            status: {
                overallStatus: 'initialized',
                currentNode: 'initialize-run'
            },
            errors: {
                errors: [],
                errorCount: 0
            }
        }

        return this.execute(initialState)
    }
} 