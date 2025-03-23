import type { RunnableFunc } from '@langchain/core/runnables';
import fs from 'node:fs';
import path from 'node:path';
import { vi } from 'vitest';
import { logToRun } from '../../utils';
import type { ClusteringState } from '../state.js';
import type { NormalizedProfile } from '../types.js';
import { ProfileDataSchema } from '../types.js';

vi.mock('../../../shared/services/task/taskService.js')
vi.mock('../../../shared/services/configuration/index.js')

/**
 * Handles loading and validating normalized profiles
 */
class ProfileLoader {
    private readonly debug: boolean = true;
    private readonly state: ClusteringState;

    constructor(state: ClusteringState) {
        if (this.debug) console.log(`[ProfileLoader] Initializing with config path: ${process.cwd()}/agents/persona-generator/config`);
        this.state = state;
    }

    /**
     * Loads and validates normalized profiles
     */
    async loadProfiles(): Promise<NormalizedProfile[]> {
        if (this.debug) console.log(`[ProfileLoader] Loading normalized profiles`);
        // Define the path to normalized profiles
        const normalizedProfilesDir = this.state.config.inputPath;
        if (this.debug) console.log(`[ProfileLoader] Normalized profiles directory: ${normalizedProfilesDir}`);

        // Ensure directory exists
        if (!fs.existsSync(normalizedProfilesDir)) {
            console.error(`[ProfileLoader] Directory not found: ${normalizedProfilesDir}`);
            throw new Error(`Directory not found: ${normalizedProfilesDir}`);
        }

        // Get all JSON files in the directory
        const files = fs.readdirSync(normalizedProfilesDir).filter(file => file.endsWith('.json'));
        if (this.debug) console.log(`[ProfileLoader] Found ${files.length} normalized profile files`);

        if (files.length === 0) {
            throw new Error('No normalized profile files found');
        }

        // Load and validate all profiles
        const normalizedProfiles: NormalizedProfile[] = [];
        for (const file of files) {
            const filePath = path.join(normalizedProfilesDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const rawProfile = JSON.parse(content);

            // Validate profile against schema
            try {
                const validatedProfile = ProfileDataSchema.parse(rawProfile);
                normalizedProfiles.push(validatedProfile);
            } catch (error) {
                console.error(`[ProfileLoader] Failed to validate profile in ${file}:`, error);
                throw new Error(`Failed to validate profile in ${file}: ${error.message}`);
            }
        }

        if (this.debug) console.log(`[ProfileLoader] Loaded ${normalizedProfiles.length} valid profiles`);
        return normalizedProfiles;
    }
}

/**
 * Node handler for loading normalized profiles for persona generation
 * @param state Current clustering state
 * @returns Updated state with loaded profiles
 */
export const loadProfilesNode: RunnableFunc<ClusteringState, ClusteringState> = async (
    state: ClusteringState
): Promise<ClusteringState> => {
    logToRun(state.runInfo, 'Loading normalized profiles');

    // Create loader instance
    const loader = new ProfileLoader(state);

    // Load and validate profiles
    const normalizedProfiles = await loader.loadProfiles();

    // Return updated state
    return {
        ...state,
        status: 'loading_profiles',
        completedSteps: [...(state.completedSteps || []), 'load_profiles'],
        logs: [...(state.logs || []), 'Loaded normalized profiles'],
        normalizedProfiles
    };
}