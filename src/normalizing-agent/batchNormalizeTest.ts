import fs from 'node:fs'
import path from 'node:path'
import { batchNormalizeProfiles } from './normalizeProfile'

async function runBatchTest() {
    console.log('Starting batch normalization test...')

    // Select a few profiles to normalize
    const profileNames = [
        'Ali Parker',
        'Chris Beck',
        'Lucy Wright'
    ]

    // Map profile names to file paths
    const profilePaths = profileNames.map(name => ({
        name,
        path: path.join(process.cwd(), 'data', 'merged', `${name}.json`)
    }))

    // Load profile data
    const profiles = profilePaths.map(({ name, path }) => {
        console.log(`Loading profile for ${name}...`)
        try {
            const fileContent = fs.readFileSync(path, 'utf-8')
            return JSON.parse(fileContent)
        } catch (error) {
            console.error(`Error loading profile for ${name}:`, error)
            return null
        }
    }).filter(Boolean)

    console.log(`Loaded ${profiles.length} profiles. Starting batch normalization...`)

    // Normalize profiles
    const results = await batchNormalizeProfiles(profiles)

    // Save normalized profiles
    const outputDir = path.join(process.cwd(), 'data', 'normalized')
    fs.mkdirSync(outputDir, { recursive: true })

    // Track statistics
    let successCount = 0
    let errorCount = 0

    for (const result of results) {
        if (result.status === 'success') {
            successCount++
            const outputPath = path.join(outputDir, `${result.profile.name}.json`)
            fs.writeFileSync(outputPath, JSON.stringify(result.profile, null, 2))
            console.log(`✅ Normalized profile saved to ${outputPath}`)

            if (result.profile.normalization_notes) {
                console.log(`\nNormalization Notes:\n${result.profile.normalization_notes}\n`)
            }
        } else {
            errorCount++
            console.error(`❌ Failed to normalize profile for ${result.profile.name}: ${result.error || 'Unknown error'}`)
        }
    }

    console.log(`\nBatch normalization completed!\nSuccess: ${successCount}\nErrors: ${errorCount}`)
}

runBatchTest().catch(error => {
    console.error('Batch test failed:', error)
    process.exit(1)
}) 