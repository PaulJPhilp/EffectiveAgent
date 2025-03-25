import { generateText } from "ai";
import * as fs from "node:fs";
import * as path from "node:path";
import { NORMALIZATION_PROMPT, fillPromptTemplate } from "../../agents/normalizing/prompts/prompts/index.js";
import { getLLM } from "./models.js";
import type { ProfileData } from "./types.js";
import { logProfile } from "./utils.js";

/**
 * Extracts JSON content from LLM response
 * This handles cases where the model might wrap JSON in markdown code blocks
 */
function extractJsonFromResponse(content: string): string {
    // Try to find JSON content within markdown code blocks
    const jsonRegex = /```(?:json)?\s*([{[][\s\S]*?[}\]])\s*```/;
    const match = content.match(jsonRegex);

    if (match?.[1]) {
        return match[1];
    }

    // If no code blocks, try to extract any JSON-like content
    const jsonStart = content.indexOf("{");
    const jsonEnd = content.lastIndexOf("}");

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        return content.substring(jsonStart, jsonEnd + 1);
    }

    // Return original content if no JSON-like structure found
    return content;
}

/**
 * Checks if a normalized profile already exists in the cache
 */
function checkExistingNormalizedProfile(profileName: string): ProfileData | null {
    const normalizedPath = path.join(process.cwd(), "data", "normalized", profileName, `${profileName}.merged.txt`);

    try {
        if (fs.existsSync(normalizedPath)) {
            console.log(`Found existing normalized profile for ${profileName}`);
            const content = fs.readFileSync(normalizedPath, 'utf-8');
            return JSON.parse(content) as ProfileData;
        }
    } catch (error) {
        console.warn(`Error reading existing normalized profile for ${profileName}:`, error);
    }

    return null;
}

/**
 * Normalizes a profile using the AI-driven normalization prompt
 * This standardizes company names, job titles, skills, locations and dates
 */
export async function normalizeProfile(
    profile: ProfileData,
): Promise<ProfileData> {
    console.log("normalizeProfile()")
    if (!profile || !profile.name) {
        throw new Error('Invalid profile data: Profile must have a name property');
    }

    console.log(`Normalizing profile for ${profile.name}...`);

    // Check for existing normalized profile
    const existingNormalized = checkExistingNormalizedProfile(profile.name);
    if (existingNormalized) {
        console.log(`Using cached normalized profile for ${profile.name}`);
        return existingNormalized;
    }

    try {

        // Build the prompt with the profile data
        const prompt = fillPromptTemplate(NORMALIZATION_PROMPT, {
            input_profile: JSON.stringify(profile, null, 2)
        });

        // Send to the model
        const messages = [{ role: "user", content: prompt }];
        console.log(`Sending request to model for ${profile.name}`);
        const response = await generateText({ model: getLLM("gpt-4o"), prompt: prompt });
        console.log(`Received response from model for ${profile.name}`);

        // Extract JSON content from the response
        const jsonContent = extractJsonFromResponse(response.text);

        // Parse the JSON
        try {
            console.log(`Parsing response for ${profile.name}`);
            const normalizedProfile = JSON.parse(jsonContent) as ProfileData;
            console.log(`Successfully normalized profile for ${profile.name}`);
            logProfile(profile.name, 'MERGED', normalizedProfile, 'normalized');
            return normalizedProfile;
        } catch (parseError) {
            console.error(`Error parsing JSON response for ${profile.name}:`, parseError);
            console.log(
                `Response content for ${profile.name}: ${response.text.substring(0, 500)}...`,
            );
            if (parseError instanceof Error) {
                throw new Error(`Failed to parse model response: ${parseError.message}`);
            }
            throw new Error('Failed to parse model response: Unknown error');
        }
    } catch (error) {
        console.error(`Error normalizing profile for ${profile.name}:`, error);
        // Re-throw the error so it can be properly handled by the caller
        throw error;
    }
}

/**
 * Interface for normalization result with status
 */
export interface NormalizationResult {
    status: 'success' | 'error'
    profile: ProfileData
    error?: string
}

/**
 * Batch normalize multiple profiles
 */
export async function batchNormalizeProfiles(
    profiles: ProfileData[]
): Promise<NormalizationResult[]> {
    const results: NormalizationResult[] = [];

    for (const profile of profiles) {
        try {
            const normalized = await normalizeProfile(profile);
            results.push({
                status: 'success',
                profile: normalized
            });
        } catch (error) {
            console.error(`Error normalizing profile for ${profile.name}:`, error);
            results.push({
                status: 'error',
                profile,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    return results;
}
