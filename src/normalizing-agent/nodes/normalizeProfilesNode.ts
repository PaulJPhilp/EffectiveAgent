import type { RunnableConfig } from "@langchain/core/runnables"
import fs from "node:fs"
import path from "node:path"
import { ModelService } from "../../../shared/services/model/modelService.js"
import type { ModelCompletionOptions } from "../../../shared/services/provider/modelProvider.js"
import { TaskService } from "../../../shared/services/task/taskService.js"
import type { NormalizationResult, NormalizationState, ProfileData } from "../types.js"
import { logToRun } from "../utils.js"
import type { ModelIdentifier } from "../../../shared/interfaces/model.js"

const modelService = new ModelService()

type NormalizationStateUpdate = Partial<NormalizationState>

// Helper functions for standardization

/**
 * Standardizes a job title by capitalizing each word
 */
function standardizeTitle(title: string): string {
    // Capitalize first letter of each word
    return title
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Standardizes a location string
 */
function standardizeLocation(location: string): string {
    // Just return the original for now
    return location;
}

/**
 * Standardizes a skill name to a common format
 */
function standardizeSkill(skill: string): string {
    // Standardize common skills
    const skillMap: Record<string, string> = {
        'js': 'JavaScript',
        'javascript': 'JavaScript',
        'ts': 'TypeScript',
        'typescript': 'TypeScript',
        'react': 'React.js',
        'node': 'Node.js',
        'nodejs': 'Node.js',
        'py': 'Python',
        'python': 'Python'
    };

    const lowerSkill = skill.toLowerCase();
    return skillMap[lowerSkill] || skill;
}

/**
 * Standardizes a company name
 */
function standardizeCompany(company: string): string {
    // Just return the original for now
    return company;
}

/**
 * Detects possible industries based on profile data
 */
function detectIndustries(profile: ProfileData): string[] {
    // Extract industries from experience or skills
    const industries: string[] = [];

    // For this mock implementation, just return a placeholder
    if (profile.key_skills.some(s =>
        s.toLowerCase().includes('javascript') ||
        s.toLowerCase().includes('react')
    )) {
        industries.push('Technology');
    }

    return industries.length ? industries : ['Unknown'];
}

/**
 * Estimates years of experience based on profile data
 */
function estimateYearsOfExperience(profile: ProfileData): number {
    // Simple implementation to extract years from experience entries
    if (!profile.experience || profile.experience.length === 0) {
        return 0;
    }

    // For this mock implementation, just return a placeholder value
    return profile.experience.length * 2;
}

/**
 * Detects education level from profile data
 */
function detectEducationLevel(profile: ProfileData): string {
    // Just return a default value for the mock
    return 'Bachelor\'s Degree';
}

/**
 * Node 2: Normalize profiles in batches
 */
export async function normalizeProfilesNode(
    state: NormalizationState,
    config: RunnableConfig
): Promise<NormalizationStateUpdate> {
    console.log("normalizeProfilesNode()")

    if (!state.profiles || state.profiles.length === 0) {
        const errorMsg = "No profiles to normalize"
        logToRun(state.runInfo, errorMsg, "error")
        return {
            status: 'error',
            error: errorMsg,
            logs: state.logs ? [...state.logs, errorMsg] : [errorMsg]
        }
    }

    for (const profile of state.profiles) {
        if (!profile.name) {
            const errorMsg = `Profile is missing name: ${JSON.stringify(profile, null, 2)}`
            logToRun(state.runInfo, errorMsg, "error")
            return {
                status: 'error',
                error: errorMsg,
                logs: state.logs ? [...state.logs, errorMsg] : [errorMsg]
            }
        }
    }

    try {
        logToRun(state.runInfo, "Starting profile normalization")
        const statusUpdate = {
            status: 'normalizing_profiles',
            completedSteps: state.completedSteps ? [...state.completedSteps] : [],
            logs: state.logs ? [...state.logs, 'Normalizing profiles'] : ['Normalizing profiles']
        }

        const results: NormalizationResult[] = []
        const normalizedProfiles: ProfileData[] = []

        const batchSize = 5
        for (let i = 0; i < state.profiles.length; i += batchSize) {
            const batch = state.profiles.slice(i, i + batchSize)
            const batchResults = await Promise.all(
                batch.map(profile => normalizeProfile(profile, { modelId: "o1-mini" }))
            )

            results.push(...batchResults)
            normalizedProfiles.push(
                ...batchResults
                    .filter(r => r.success && r.normalizedProfile)
                    .map(r => r.normalizedProfile!)
            )
        }

        const successCount = results.filter(r => r.success).length
        const errorCount = results.filter(r => !r.success).length
        const summaryMsg = `Normalization complete: ${successCount} successful, ${errorCount} failed`
        logToRun(state.runInfo, summaryMsg)

        return {
            ...statusUpdate,
            normalizedProfiles,
            normalizationResults: results,
            status: 'profiles_normalized',
            completedSteps: [...(state.completedSteps || []), 'normalize_profiles'],
            logs: [...(state.logs || []), summaryMsg]
        }

    } catch (error) {
        const errorMsg = `Error normalizing profiles: ${error instanceof Error ? error.message : String(error)}`
        logToRun(state.runInfo, errorMsg, "error")
        return {
            status: 'error',
            error: errorMsg,
            logs: state.logs ? [...state.logs, errorMsg] : [errorMsg]
        }
    }
}

async function normalizeProfile(
    profile: ProfileData,
    model: ModelIdentifier
): Promise<NormalizationResult> {
    console.log(`Normalizing profile: ${profile.name}`)

    // Check cache first
    const cacheDir = path.join(process.cwd(), "data", "normalized")
    const cacheFile = path.join(cacheDir, `${profile.name}.json`)

    if (fs.existsSync(cacheFile)) {
        try {
            const cached = JSON.parse(fs.readFileSync(cacheFile, "utf8"))
            console.log(`Found cached normalized profile for ${profile.name}`)
            return {
                success: true,
                profileName: profile.name,
                normalizedProfile: cached
            }
        } catch (error) {
            console.warn(`Error reading cache file: ${error}`)
            // Continue with normalization if cache read fails
        }
    }

    // Add debug logs to understand service state
    console.log("ModelService instance available:", !!modelService)

    // Prepare prompt for normalization
    const prompt = `
    You are a profile normalizer. Your task is to normalize the given 
    profile data into a consistent format.
    The profile should maintain all important information while 
    standardizing the format.
    
    Profile to normalize:
    ${JSON.stringify(profile, null, 2)}
    
    Please return only the normalized profile as a JSON object with the 
    following structure:
    {
        "name": "string",
        "age": number,
        "location": "string",
        "gender": "string",
        "company": "string",
        "companyType": "string",
        "companySize": "string",
        "industry": "string",
        "occupation": "string",
        "interests": string[],
        "skills": string[],
        "education": string[],
        "experience": Experience[],
        "bio": "string"
    }
    `

    const completionOptions: ModelCompletionOptions = {
        prompt: prompt,
        maxTokens: 1500
    }

    try {
        const normalized = await modelService.completeWithModel(model, completionOptions)

        const normalizedProfile = JSON.parse(normalized.text) as ProfileData

        if (!normalizedProfile || !normalizedProfile.name) {
            throw new Error("Invalid normalized profile format")
        }

        // Save to cache
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true })
        }
        fs.writeFileSync(cacheFile, JSON.stringify(normalizedProfile, null, 2))

        return {
            success: true,
            profileName: profile.name,
            normalizedProfile
        }
    } catch (error) {
        console.error("Normalization failed with error:", error)
        return {
            success: false,
            profileName: profile.name,
            error: error instanceof Error ? error.message : String(error)
        }
    }
}