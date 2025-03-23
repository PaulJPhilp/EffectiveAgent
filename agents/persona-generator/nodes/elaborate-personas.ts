import type { RunnableFunc } from '@langchain/core/runnables';
import type { FullPersona } from '../types.js';
import type { ClusteringState } from '../state.js';
import { TaskService } from '../../../shared/services/task/taskService';
import { extractJsonFromResponse, logToRun } from '../../utils';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Handles persona elaboration using LLM models
 */
class PersonaElaborator {
    private readonly debug: boolean = true;
    private readonly taskService: TaskService;
    private readonly state: ClusteringState;

    constructor(state: ClusteringState) {
        if (this.debug) console.log(`[PersonaElaborator] Initializing with config path: ${JSON.stringify(state.runInfo, null, 2)}`);
        this.taskService = new TaskService({
            configPath: process.cwd() + '/agents/persona-generator/config',
        });
        if (this.debug) console.log(`[PersonaElaborator] Task service initialized`);
        this.state = state;
    }

    /**
     * Elaborates a basic persona cluster into a full persona
     */
    async elaboratePersona(cluster: unknown): Promise<FullPersona> {
        // Execute elaboration task
        const taskResult = await this.taskService.executeTask('persona-elaboration', {
            variables: {
                input_cluster: JSON.stringify(cluster, null, 2)
            },
            format: 'json' // Specify format at top level
        });

        // Parse and validate result
        const rawPersona = JSON.parse(extractJsonFromResponse(taskResult.result));
        
        // Ensure required fields exist
        const persona: FullPersona = {
            personaName: rawPersona.personaName || '',
            title: rawPersona.title || '',
            description: {
                role: rawPersona.description?.role || '',
                impact: rawPersona.description?.impact || '',
                workStyle: rawPersona.description?.workStyle || ''
            },
            values: (rawPersona.values || []).map(v => ({
                name: v.name || '',
                description: v.description || ''
            })),
            motivations: (rawPersona.motivations || []).map(m => ({
                name: m.name || '',
                description: m.description || ''
            })),
            goals: (rawPersona.goals || []).map(g => ({
                name: g.name || '',
                description: g.description || '',
                timeline: g.timeline || '',
                obstacles: g.obstacles || []
            })),
            skills: rawPersona.skills || [],
            toolsUsed: (rawPersona.toolsUsed || []).map(t => ({
                name: t.name || '',
                proficiency: t.proficiency || 'basic',
                frequency: t.frequency || 'rarely'
            })),
            challenges: (rawPersona.challenges || []).map(c => ({
                name: c.name || '',
                description: c.description || '',
                impact: c.impact || '',
                currentSolutions: c.currentSolutions || []
            })),
            learningStyle: {
                preferredMethods: rawPersona.learningStyle?.preferredMethods || [],
                resources: rawPersona.learningStyle?.resources || [],
                paceOfLearning: rawPersona.learningStyle?.paceOfLearning || ''
            },
            background: rawPersona.background || '',
            informationEcosystem: {
                influencers: (rawPersona.informationEcosystem?.influencers || []).map(i => ({
                    name: i.name || '',
                    platform: i.platform || '',
                    reason: i.reason || ''
                })),
                mediaSources: (rawPersona.informationEcosystem?.mediaSources || []).map(m => ({
                    source: m.source || '',
                    type: m.type || 'industry_publication',
                    frequency: m.frequency || 'monthly'
                })),
                conferences: (rawPersona.informationEcosystem?.conferences || []).map(c => ({
                    name: c.name || '',
                    focus: c.focus || '',
                    attendance: c.attendance || 'occasional'
                }))
            },
            personalityProfile: rawPersona.personalityProfile || '',
            commonCharacteristics: rawPersona.commonCharacteristics || [],
            typicalBackground: rawPersona.typicalBackground || '',
            percentageOfTotal: rawPersona.percentageOfTotal || 0,
            representativeProfiles: rawPersona.representativeProfiles || [],
            estimatedAge: {
                range: rawPersona.estimatedAge?.range || '30-40',
                average: rawPersona.estimatedAge?.average || 35,
                explanation: rawPersona.estimatedAge?.explanation || ''
            }
        };

        return persona;
    }

    /**
     * Elaborates all basic clusters into full personas
     */
    async elaboratePersonas(): Promise<FullPersona[]> {
        if (!this.state.basicClusters?.clusters) {
            throw new Error('No basic clusters available for elaboration');
        }

        if (this.debug) console.log(`[PersonaElaborator] Elaborating ${this.state.basicClusters.clusters.length} basic clusters into full personas`);

        const elaboratedPersonas: FullPersona[] = [];
        for (const cluster of this.state.basicClusters.clusters) {
            if (this.debug) console.log(`[PersonaElaborator] Elaborating cluster: ${cluster.title}`);
            const elaboratedPersona = await this.elaboratePersona(cluster);
            elaboratedPersonas.push(elaboratedPersona);
        }

        // Save elaborated personas
        const elaborationOutputPath = path.join(
            this.state.runInfo.outputDir,
            'personas',
            'elaborated-personas.json'
        );
        if (this.debug) console.log(`[PersonaElaborator] Saving elaborated personas to ${elaborationOutputPath}`);
        fs.writeFileSync(
            elaborationOutputPath,
            JSON.stringify(elaboratedPersonas, null, 2)
        );

        return elaboratedPersonas;
    }
}

/**
 * Node handler for elaborating basic personas into full personas
 * @param state Current clustering state
 * @returns Updated state with elaborated personas
 */
export const elaboratePersonasNode: RunnableFunc<ClusteringState, ClusteringState> = async (
    state: ClusteringState
): Promise<ClusteringState> => {
    logToRun(state.runInfo, 'Elaborating personas');

    // Validate input
    if (!state.basicClusters) {
        throw new Error('No basic clusters available for elaboration');
    }

    // Create elaborator instance
    const elaborator = new PersonaElaborator(state);

    // Generate elaborated personas
    const fullPersonas = await elaborator.elaboratePersonas();
    
    // Convert FullPersona to ElaboratedPersona format for state
    const elaboratedPersonas = fullPersonas.map(persona => {
        // Extract influencer names from the complex structure
        const influencers = persona.informationEcosystem?.influencers?.map(i => i.name) || [];
        
        // Extract media source names
        const publications = persona.informationEcosystem?.mediaSources?.map(m => m.source) || [];
        
        // Extract conference names
        const communities = persona.informationEcosystem?.conferences?.map(c => c.name) || [];
        
        return {
            personaName: persona.personaName,
            title: persona.title,
            description: persona.description,
            values: persona.values,
            motivations: persona.motivations,
            goals: persona.goals,
            skills: persona.skills,
            toolsUsed: persona.toolsUsed,
            challenges: persona.challenges,
            learningStyle: persona.learningStyle,
            background: persona.background,
            // Convert to the simplified structure expected by ElaboratedPersona
            informationEcosystem: {
                preferredResources: [],
                influencers,
                organizations: [],
                publications,
                communities
            },
            personalityProfile: persona.personalityProfile,
            commonCharacteristics: persona.commonCharacteristics,
            typicalBackground: persona.typicalBackground,
            percentageOfTotal: persona.percentageOfTotal,
            representativeProfiles: persona.representativeProfiles
        };
    });

    // Return updated state
    return {
        ...state,
        status: 'elaboration_complete',
        completedSteps: [...(state.completedSteps || []), 'elaborate_personas'],
        logs: [...(state.logs || []), 'Elaborated personas'],
        elaboratedPersonas
    };
};

