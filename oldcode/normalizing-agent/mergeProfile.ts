// src/mergeProfile.ts

import type { AIMessage } from "@langchain/core/messages"
import { z } from "zod"
import type { ProfileData } from "./types"
import { DataCleaningModel } from "./types"
import { loadChatModel } from "./utils"

interface MergeProfileOptions {
    preferRecent: boolean
    consolidateSkills: boolean
    normalizeCompanyNames: boolean
    normalizeTitles: boolean
}

const defaultMergeOptions: MergeProfileOptions = {
    preferRecent: true,
    consolidateSkills: true,
    normalizeCompanyNames: true,
    normalizeTitles: true
}

export interface ProfileSource {
    pdf?: Record<string, unknown>
    txt?: Record<string, unknown>
}

// Schema for validating merged profile
export const MergedProfileSchema = z.object({
    name: z.string(),
    title: z.string(),
    location: z.string().nullable(),
    key_skills: z.array(z.string()),
    contact: z.object({
        email: z.string().nullable(),
        linkedin: z.string().nullable(),
        company_website: z.string().nullable()
    }),
    certificates: z.array(z.object({
        status: z.enum(["Active", "Expired", "In Progress"]),
        name: z.string(),
        issuing_organization: z.string(),
        issue_date: z.string().nullable(),
        expiration_date: z.string().nullable(),
        credential_id: z.string().nullable()
    })),
    experience: z.array(z.object({
        company: z.string(),
        title: z.string(),
        duration: z.string(),
        description: z.array(z.string())
    }))
})

export class ProfileMergeError extends Error {
    constructor(
        message: string,
        public readonly data: unknown
    ) {
        super(message)
        this.name = "ProfileMergeError"
    }
}

/**
 * Merges two profiles (from PDF and TXT sources) into a single normalized profile
 */
export async function mergeProfiles(
    sources: ProfileSource,
    options: Partial<MergeProfileOptions> = {}
): Promise<ProfileData> {
    const mergeOptions = { ...defaultMergeOptions, ...options }

    // If we only have one source, use it
    if (sources.pdf && !sources.txt) {
        return sources.pdf as unknown as ProfileData
    }
    if (sources.txt && !sources.pdf) {
        return sources.txt as unknown as ProfileData
    }

    try {
        const promptModel = await loadChatModel(DataCleaningModel)

        const prompt = `
    Given two profiles for the same person from different sources:

    PDF Profile:
    ${JSON.stringify(sources.pdf, null, 2)}

    TXT Profile:
    ${JSON.stringify(sources.txt, null, 2)}

    Merge these profiles following these rules:
    1. ${mergeOptions.preferRecent ? "Prefer more recent information when dates are available" : "Preserve all date variations"}
    2. ${mergeOptions.consolidateSkills ? "Consolidate and deduplicate skills" : "Keep all skills"}
    3. ${mergeOptions.normalizeCompanyNames ? "Normalize company names" : "Keep original company names"}
    4. ${mergeOptions.normalizeTitles ? "Standardize job titles" : "Keep original titles"}
    5. Remove any duplicate experiences or certificates
    6. Ensure all dates are in YYYY-MM-DD format
    7. Keep the most complete contact information

    IMPORTANT: Return ONLY a valid JSON object containing the merged profile data. Do not include the schema definition, any explanations, or markdown formatting.
    The JSON must include these fields with their proper types:
    - name: string
    - title: string
    - location: string or null
    - key_skills: array of strings
    - contact: object with linkedin (string or null), email (string or null), company_website (string or null)
    - certificates: array of objects with name (string), issuer (string), date_earned (string or null), expiry_date (string or null), credential_id (string or null), status ("Active", "Expired", or "In Progress")
    - experience: array of objects with company (string), title (string), duration (object with start_date, end_date, date_range as strings), location (string or null), description (array of strings), company_url (string or null)

    Return the merged profile as a JSON object following this structure.`

        const messages = [{ role: "user", content: prompt }]
        const response: AIMessage = await promptModel.invoke(messages)

        // Try to extract JSON from the response if it's wrapped in text
        let jsonStr = response.content.toString()

        // Remove any markdown code block markers
        jsonStr = jsonStr.replace(/```json\n?|\n?```/g, '')

        // Try to find JSON object in the text if there's surrounding text
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
            jsonStr = jsonMatch[0]
        }

        // Parse and validate the merged profile
        try {
            const merged = JSON.parse(jsonStr)
            const validated = await MergedProfileSchema.parseAsync(merged)
            return validated
        } catch (parseError) {
            throw new ProfileMergeError(
                "Invalid JSON in merged profile",
                { error: parseError, response: jsonStr, sources }
            )
        }

    } catch (error) {
        if (error instanceof z.ZodError) {
            throw new ProfileMergeError(
                "Invalid merged profile structure",
                { error: error.format(), sources }
            )
        }
        if (error instanceof SyntaxError) {
            throw new ProfileMergeError(
                "Invalid JSON in merged profile",
                { error, sources }
            )
        }
        throw error
    }
}

// Helper functions for testing
export function compareProfiles(a: ProfileData, b: ProfileData): number {
    // Return similarity score between 0-1
    // Useful for testing merge quality
    // TODO: Implement comparison logic
    return 0
}

export function validateMergedProfile(
    merged: ProfileData,
    sources: ProfileSource
): boolean {
    // Verify merged profile contains all required information
    // and no data was incorrectly dropped
    // TODO: Implement validation logic
    return true
}