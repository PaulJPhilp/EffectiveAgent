import type { Experience, ProfileData } from './types'

/**
 * Simple utility to merge profiles for testing purposes
 * This avoids making API calls to the AI model
 */
export function mockMergeProfiles(pdf?: ProfileData, txt?: ProfileData): ProfileData {
    // If we only have one source, return it
    if (!pdf && txt) return txt
    if (!txt && pdf) return pdf

    // If both are undefined (shouldn't happen with proper usage), return an empty profile
    if (!pdf && !txt) {
        throw new Error("Both profiles are undefined")
    }

    // At this point, we know both pdf and txt are defined
    const pdfProfile = pdf as ProfileData
    const txtProfile = txt as ProfileData

    // Simple merge strategy
    const merged: ProfileData = {
        name: pdfProfile.name,
        title: pdfProfile.title.length > txtProfile.title.length ? pdfProfile.title : txtProfile.title,
        location: pdfProfile.location || txtProfile.location,
        // Combine and deduplicate skills
        key_skills: Array.from(new Set([...pdfProfile.key_skills, ...txtProfile.key_skills])),
        contact: {
            linkedin: pdfProfile.contact.linkedin || txtProfile.contact.linkedin,
            email: pdfProfile.contact.email || txtProfile.contact.email,
            company_website: pdfProfile.contact.company_website || txtProfile.contact.company_website,
        },
        // Combine certificates
        certificates: [...(pdfProfile.certificates || []), ...(txtProfile.certificates || [])],
        // Use experience from both sources, preferring the one with more detailed descriptions
        experience: mergeExperiences(pdfProfile.experience, txtProfile.experience)
    }

    return merged
}

/**
 * Helper function to merge experience arrays
 */
function mergeExperiences(pdfExp: Experience[], txtExp: Experience[]): Experience[] {
    const combinedExperiences: Experience[] = []
    const experienceMap = new Map<string, Experience>()

    // Process PDF experiences
    for (const exp of pdfExp) {
        const key = `${exp.company}-${exp.title}`
        experienceMap.set(key, { ...exp })
    }

    // Process TXT experiences, merging with existing ones
    for (const exp of txtExp) {
        const key = `${exp.company}-${exp.title}`

        if (experienceMap.has(key)) {
            const existing = experienceMap.get(key)
            // Handle the case where existing is undefined (shouldn't happen but satisfies TypeScript)
            if (existing) {
                // Merge descriptions - prefer longer descriptions
                const mergedDesc = existing.description.length >= exp.description.length
                    ? existing.description
                    : exp.description

                experienceMap.set(key, {
                    ...existing,
                    description: mergedDesc,
                    location: existing.location || exp.location
                })
            }
        } else {
            experienceMap.set(key, { ...exp })
        }
    }

    // Convert map back to array
    for (const exp of experienceMap.values()) {
        combinedExperiences.push(exp)
    }

    // Sort by start date (descending)
    return combinedExperiences.sort((a, b) => {
        const dateA = new Date(a.duration.start_date).getTime() || 0
        const dateB = new Date(b.duration.start_date).getTime() || 0
        return dateB - dateA
    })
} 