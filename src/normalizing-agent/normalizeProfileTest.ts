import * as fs from 'node:fs'
import * as path from 'node:path'
import { normalizeProfile } from './normalizeProfile'
import type { ProfileData } from './types'

// Get the first argument (profile name) or default to "Ali Parker"
const profileName = process.argv[2] || 'Ali Parker'

async function main() {
    try {
        // Load the source profile
        const profilePath = path.join(process.cwd(), 'data', 'merged', `${profileName}.json`)
        if (!fs.existsSync(profilePath)) {
            console.error(`Profile not found: ${profilePath}`)
            process.exit(1)
        }

        const profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8')) as ProfileData
        console.log(`Loaded profile for ${profile.name}`)

        // Normalize the profile
        console.log('Normalizing profile...')
        const normalizedProfile = await normalizeProfile(profile)

        // Create normalized output directory if it doesn't exist
        const normalizedDir = path.join(process.cwd(), 'data', 'normalized')
        if (!fs.existsSync(normalizedDir)) {
            fs.mkdirSync(normalizedDir, { recursive: true })
        }

        // Save the normalized profile
        const outputPath = path.join(normalizedDir, `${profileName}.json`)
        fs.writeFileSync(outputPath, JSON.stringify(normalizedProfile, null, 2))

        console.log(`Normalized profile saved to ${outputPath}`)

        // Print some stats about the normalization
        if (normalizedProfile.normalization_notes) {
            console.log('\nNormalization Notes:')
            console.log(normalizedProfile.normalization_notes)
        }

        // Print some comparisons
        console.log('\nKey Normalizations:')
        console.log('Title:')
        console.log(`  Original: ${profile.title}`)
        console.log(`  Normalized: ${normalizedProfile.title}`)

        if (profile.location !== normalizedProfile.location) {
            console.log('Location:')
            console.log(`  Original: ${profile.location}`)
            console.log(`  Normalized: ${normalizedProfile.location}`)
        }

        // Compare company names
        console.log('\nCompany Name Normalizations:')
        const companies = new Set([
            ...profile.experience.map(e => e.company),
            ...normalizedProfile.experience.map(e => e.company)
        ])
        for (const company of companies) {
            const originalExp = profile.experience.find(e => e.company === company)
            const normalizedExp = normalizedProfile.experience.find(e =>
                e.company === company ||
                e.company.toLowerCase() === company.toLowerCase()
            )

            if (originalExp && normalizedExp && originalExp.company !== normalizedExp.company) {
                console.log(`  "${originalExp.company}" → "${normalizedExp.company}"`)
            }
        }

    } catch (error) {
        console.error('Error:', error)
    }
}

main() 