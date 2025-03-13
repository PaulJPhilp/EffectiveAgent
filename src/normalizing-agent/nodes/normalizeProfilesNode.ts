import type { RunnableConfig } from "@langchain/core/runnables"
import fs from "node:fs"
import path from "node:path"
import { getLLM } from "../../shared/llm.js"
import type { NormalizationResult, NormalizationState, ProfileData } from "../types.js"
import { logToRun } from "../utils.js"
import { extractJsonFromResponse } from "../utils/extractJson.js"

type NormalizationStateUpdate = Partial<NormalizationState>

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

    try {
        logToRun(state.runInfo, "Starting profile normalization")
        const statusUpdate = {
            status: 'normalizing_profiles',
            completedSteps: state.completedSteps ? [...state.completedSteps] : [],
            logs: state.logs ? [...state.logs, 'Normalizing profiles'] : ['Normalizing profiles']
        }

        const llm = getLLM('o1-mini')
        const results: NormalizationResult[] = []
        const normalizedProfiles: ProfileData[] = []

        // Process profiles in batches
        const batchSize = 5
        for (let i = 0; i < state.profiles.length; i += batchSize) {
            const batch = state.profiles.slice(i, i + batchSize)
            const batchResults = await Promise.all(
                batch.map(profile => normalizeProfile(profile, llm))
            )

            results.push(...batchResults)
            normalizedProfiles.push(
                ...batchResults
                    .filter(r => r.success && r.normalizedProfile)
                    .map(r => r.normalizedProfile!)
            )

            // Log batch progress
            const progressMsg = `Normalized batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(state.profiles.length / batchSize)}`
            logToRun(state.runInfo, progressMsg)
        }

        // Save normalized profiles
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
    llm: any
): Promise<NormalizationResult> {
    try {
        // Check cache first
        const cacheDir = path.join(process.cwd(), "data", "normalized")
        const cacheFile = path.join(cacheDir, `${profile.name}.json`)

        if (fs.existsSync(cacheFile)) {
            const cached = JSON.parse(fs.readFileSync(cacheFile, "utf8"))
            return {
                success: true,
                profileName: profile.name,
                normalizedProfile: cached
            }
        }

        // Generate normalization prompt
        const prompt = `
        You are a profile normalizer. Your task is to normalize the given profile data into a consistent format.
        The profile should maintain all important information while standardizing the format.
        
        Profile to normalize:
        ${JSON.stringify(profile, null, 2)}
        
        Please return only the normalized profile as a JSON object with the following structure:
        {
            "name": "string",
            "age": number,
            "location": "string",
            "occupation": "string",
            "interests": string[],
            "skills": string[],
            "education": string[],
            "experience": string[],
            "bio": "string"
        }
        `

        const response = await llm.invoke(prompt)
        const normalizedJson = extractJsonFromResponse(response)
        const normalizedProfile = JSON.parse(normalizedJson) as ProfileData

        // Validate normalized profile
        if (!normalizedProfile || !normalizedProfile.name) {
            throw new Error("Invalid normalized profile format")
        }

        // Cache the result
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
        return {
            success: false,
            profileName: profile.name,
            error: error instanceof Error ? error.message : String(error)
        }
    }
} 