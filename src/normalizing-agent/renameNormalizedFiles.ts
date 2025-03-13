import fs from 'node:fs'
import path from 'node:path'

async function renameNormalizedFiles() {
    const normalizedDir = path.join(process.cwd(), 'data', 'normalized')
    let renamedCount = 0
    let errorCount = 0

    try {
        // Get all subdirectories (name folders)
        const nameDirs = fs.readdirSync(normalizedDir)

        for (const nameDir of nameDirs) {
            const namePath = path.join(normalizedDir, nameDir)

            // Skip if not a directory
            if (!fs.statSync(namePath).isDirectory()) {
                continue
            }

            // Look for name.merged.txt file
            const txtFile = path.join(namePath, `${nameDir}.merged.txt`)
            const jsonFile = path.join(namePath, `${nameDir}.merged.json`)

            if (fs.existsSync(txtFile)) {
                try {
                    // Read the content to verify it's valid JSON
                    const content = fs.readFileSync(txtFile, 'utf-8')
                    JSON.parse(content) // This will throw if not valid JSON

                    // Rename the file
                    fs.renameSync(txtFile, jsonFile)
                    console.log(`✅ Renamed: ${txtFile} -> ${jsonFile}`)
                    renamedCount++
                } catch (error) {
                    console.error(`❌ Error processing ${txtFile}:`, error.message)
                    errorCount++
                }
            }
        }

        console.log('\nRename Operation Summary:')
        console.log(`Successfully renamed: ${renamedCount} files`)
        console.log(`Errors encountered: ${errorCount} files`)

    } catch (error) {
        console.error('Error during rename operation:', error)
        process.exit(1)
    }
}

// Run the rename operation
renameNormalizedFiles() 