import fs from 'node:fs'
import path from 'path'
import { ModelService } from '../../../shared/services/model/modelService.js'
import { PromptService } from '../../../shared/services/prompt/promptService.js'
import type { IProviderService } from '../../../shared/services/provider/types.js'
import { TaskService } from '../../../shared/services/task/taskService.js'
import { AgentNode } from '../../agent-service/AgentNode.js'
import type { AgentState } from '../../agent-service/types.js'
import type { PersonaDomainState, PersonaInput, PersonaOutput } from '../types.js'

interface PersonaResult {
    name: string
    description: string
    background: string
    goals: string[]
    traits: string[]
    interests: string[]
    skills: string[]
}

interface ClusterResult {
    name: string
    description: string
    traits: string[]
    interests: string[]
    skills: string[]
}

interface GenerationResults {
    personas: PersonaResult[]
    clusters: ClusterResult[]
    metadata: {
        totalProfiles: number
        totalClusters: number
        totalPersonas: number
        generatedAt: string
    }
}

/**
 * Node that saves final results and marks the agent as complete
 */
export class SaveResultsNode extends AgentNode<AgentState<PersonaInput, PersonaOutput, PersonaDomainState>> {
    constructor(
        taskService: TaskService,
        providerService: IProviderService,
        modelService: ModelService,
        promptService: PromptService
    ) {
        super(taskService, providerService, modelService, promptService)
    }

    async execute(state: AgentState<PersonaInput, PersonaOutput, PersonaDomainState>): Promise<AgentState<PersonaInput, PersonaOutput, PersonaDomainState>> {
        // Validate we have personas to save
        if (!state.agentState.personas || state.agentState.personas.length === 0) {
            throw new Error('No personas available to save')
        }

        // Save final results
        const finalResults: GenerationResults = {
            personas: state.agentState.personas,
            clusters: state.agentState.clusters,
            metadata: {
                totalProfiles: state.agentState.profiles.length,
                totalClusters: state.agentState.clusters.length,
                totalPersonas: state.agentState.personas.length,
                generatedAt: new Date().toISOString()
            }
        }

        // Save to output directory
        const outputPath = path.join(
            state.agentRun.outputDir,
            'final-results.json'
        )
        fs.writeFileSync(
            outputPath,
            JSON.stringify(finalResults, null, 2)
        )

        // Create a summary file
        const summaryPath = path.join(
            state.agentRun.outputDir,
            'summary.md'
        )
        const summary = this.generateSummary(finalResults)
        fs.writeFileSync(summaryPath, summary)

        return {
            ...state,
            status: {
                ...state.status,
                overallStatus: 'completed'
            },
            output: {
                clusters: state.agentState.clusters,
                personas: state.agentState.personas
            }
        }
    }

    private generateSummary(results: GenerationResults): string {
        const { metadata } = results

        return `# Persona Generation Results

## Overview
- Total Profiles Analyzed: ${metadata.totalProfiles}
- Clusters Generated: ${metadata.totalClusters}
- Personas Created: ${metadata.totalPersonas}
- Generated At: ${metadata.generatedAt}

## Personas
${results.personas.map((persona) => `
### ${persona.name}
- Description: ${persona.description}
- Background: ${persona.background}
- Goals: ${persona.goals.join(', ')}
- Traits: ${persona.traits.join(', ')}
- Interests: ${persona.interests.join(', ')}
- Skills: ${persona.skills.join(', ')}
`).join('\n')}

## Clusters
${results.clusters.map((cluster) => `
### ${cluster.name}
${cluster.description}
- Traits: ${cluster.traits.join(', ')}
- Interests: ${cluster.interests.join(', ')}
- Skills: ${cluster.skills.join(', ')}
`).join('\n')}
`
    }
} 