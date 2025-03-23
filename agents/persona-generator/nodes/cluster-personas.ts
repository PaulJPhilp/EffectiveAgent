import type { RunnableFunc } from '@langchain/core/runnables';
import fs from 'node:fs';
import path from 'node:path';
import { TaskService } from '../../../shared/services/task/taskService';
import { extractJsonFromResponse, logToRun } from '../../utils';
import type { ClusteringState } from '../state.js';
import type { BasicClusteringResult } from '../types.js';

/**
 * Handles persona clustering using LLM models
 */
class PersonaClusterer {
    private readonly debug: boolean = true;
    private readonly taskService: TaskService;
    private readonly state: ClusteringState;

    constructor(state: ClusteringState) {
        if (this.debug) console.log(`[PersonaClusterer] Initializing with config path: ${process.cwd()}/agents/persona-generator/config`);
        this.state = state;
        this.taskService = new TaskService(state.config.rootPath);
        if (this.debug) console.log(`[PersonaClusterer] Task service initialized`);
    }

    /**
     * Creates basic persona clusters from normalized profiles
     */
    async createBasicClusters(): Promise<BasicClusteringResult> {
        if (this.debug) console.log(`[PersonaClusterer] Creating basic persona clusters`);
        // Prepare profiles for clustering
        const profileData = this.state.normalizedProfiles

        if (!profileData || profileData.length === 0) {
            throw new Error('No profile data available for clustering');
        }

        if (this.debug) console.log(`[PersonaClusterer] Profiles for clustering: ${profileData.length}`);

        // Execute clustering task
        const taskResult = await this.taskService.executeTask('basic-clustering', {
            variables: {
                input_profiles: JSON.stringify(profileData, null, 2)
            },
            format: 'json' // Specify format at top level
        });

        // Parse result
        const clusteringResult = JSON.parse(extractJsonFromResponse(taskResult.result)) as BasicClusteringResult;
        if (this.debug) console.log(`[PersonaClusterer] Created ${clusteringResult.clusters.length} basic persona clusters.`);

        // Save intermediate results
        const clusteringOutputPath = path.join(
            this.state.runInfo.outputDir,
            'clusters',
            'basic-clusters.json'
        );
        fs.writeFileSync(
            clusteringOutputPath,
            JSON.stringify(clusteringResult, null, 2)
        );

        return clusteringResult;
    }
}

/**
 * Node handler for clustering profiles into personas
 * @param state Current clustering state
 * @returns Updated state with clustered personas
 */
export const clusterPersonasNode: RunnableFunc<ClusteringState, ClusteringState> = async (
    state: ClusteringState
): Promise<ClusteringState> => {
    logToRun(state.runInfo, 'Creating persona clusters');

    // Validate input
    if (!state.normalizedProfiles || state.normalizedProfiles.length === 0) {
        throw new Error('No normalized profiles available for clustering');
    }

    // Create clusterer instance
    const clusterer = new PersonaClusterer(state);

    // Generate clusters
    const basicClusters = await clusterer.createBasicClusters();

    // Return updated state
    return {
        ...state,
        status: 'clustering_complete',
        completedSteps: [...(state.completedSteps || []), 'cluster_personas'],
        logs: [...(state.logs || []), 'Created persona clusters'],
        basicClusters
    };
};

