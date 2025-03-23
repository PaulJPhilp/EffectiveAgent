import fs from 'node:fs'
import path from 'node:path'
import { getLLM  } from '../models.js'
import type { ClusteringResult } from '../tools/personaClusters.js'
import { generateText } from "ai"

/**
 * Loads the most recent clustering result
 */
async function loadLatestClusters(): Promise<ClusteringResult> {
    const clustersDir = path.join(process.cwd(), 'data', 'clusters')

    // Get all cluster files
    const files = fs.readdirSync(clustersDir)
        .filter(f => f.startsWith('clusters_') && f.endsWith('.json'))
        .sort()
        .reverse() // Most recent first

    if (files.length === 0) {
        throw new Error('No cluster files found')
    }

    const latestFile = path.join(clustersDir, files[0])
    console.log(`Loading clusters from ${latestFile}`)

    const content = fs.readFileSync(latestFile, 'utf-8')
    return JSON.parse(content)
}

/**
 * Formats a single persona into a concise executive summary (1-page)
 */
async function formatPersonaExecutiveSummary(cluster: ClusteringResult['clusters'][0]): Promise<string> {
    const promptModel = getLLM("gemini-1.5-pro")

    const prompt = `You are a professional marketer working for a marketing agency. You create clear, engaging persona documents.
Format this persona data into a concise, visually appealing ONE-PAGE executive summary in markdown format.

Use this persona data:
${JSON.stringify(cluster, null, 2)}

Guidelines:
- STRICT ONE-PAGE LIMIT - be extremely concise
- Create a clear visual hierarchy with effective section headings
- Use markdown formatting effectively (headers, lists, bold, etc.)
- Focus on the most essential information only
- Include these key sections:
  * Basic information (name, title, age)
  * Role and impact (very brief)
  * Top 3 values and motivations
  * 2-3 key personality traits
  * 1-2 most important goals
  * 2-3 biggest challenges
  * 2-3 key success metrics
  * 3-4 core skills
- Include a fictional stock photo placeholder ([Photo: Brief description of what the photo should show])
- Make it engaging and professional
- This is an EXECUTIVE SUMMARY - prioritize brevity and impact

Return ONLY the markdown content with no additional text or explanations.`

    const { text: responseText } = await generateText({
        model: getLLM("gemini-1.5-pro"),
        prompt
    });
    return responseText
}

/**
 * Formats a single persona into a comprehensive full profile (2-4 pages)
 */
async function formatPersonaFullProfile(cluster: ClusteringResult['clusters'][0]): Promise<string> {
    const promptModel = getLLM("gemini-1.5-pro")

    const prompt = `You are a professional marketer working for a marketing agency. You create comprehensive, engaging persona documents.
Format this persona data into a detailed, well-structured 2-4 PAGE markdown document.

Use this persona data:
${JSON.stringify(cluster, null, 2)}

Guidelines:
- Create a clear visual hierarchy with effective section headings
- Use markdown formatting effectively (headers, lists, bold, etc.)
- Make it easy to scan and read
- Include ALL information from the persona data
- Organize the information in a logical flow
- Include detailed sections for:
  * Basic information (name, title, age)
  * Role and impact
  * Values and motivations (with explanations)
  * Personality and working style (with examples)
  * Goals and aspirations (with context)
  * Challenges and day-to-day problems (with impact descriptions)
  * Emotional profile and fears (with context)
  * Success metrics (with measurement details)
  * Information ecosystem (influencers, media sources, conferences)
  * Skills and background (with context)
- Use tables, bullet points, and other formatting to enhance readability
- Include a fictional stock photo placeholder ([Photo: Brief description of what the photo should show])
- Make it engaging and professional
- This is a COMPREHENSIVE PROFILE - include all details and provide context

Return ONLY the markdown content with no additional text or explanations.`

    const { text: responseText } = await generateText({
        model: getLLM("gemini-1.5-pro"),
        prompt
    });
    return responseText
}

/**
 * Main function to generate formatted personas
 */
async function generateFormattedPersonas() {
    try {
        // Load the clusters
        const clusters = await loadLatestClusters()
        console.log(`Found ${clusters.clusters.length} personas to format`)

        // Create output directories
        const baseOutputDir = path.join(process.cwd(), 'data', 'personas')
        const summaryOutputDir = path.join(baseOutputDir, 'executive-summary')
        const fullOutputDir = path.join(baseOutputDir, 'full-profile')

        fs.mkdirSync(summaryOutputDir, { recursive: true })
        fs.mkdirSync(fullOutputDir, { recursive: true })

        // Format each persona
        for (const cluster of clusters.clusters) {
            console.log(`Formatting persona: ${cluster.personaName}`)

            // Generate safe filename
            const safeFileName = cluster.personaName.toLowerCase().replace(/[^a-z0-9]+/g, '_')

            // Create executive summary
            console.log('Creating executive summary...')
            const summaryMarkdown = await formatPersonaExecutiveSummary(cluster)
            const summaryPath = path.join(summaryOutputDir, `${safeFileName}.md`)
            fs.writeFileSync(summaryPath, summaryMarkdown)
            console.log(`  ✅ Saved executive summary to ${summaryPath}`)

            // Create full profile
            console.log('  Creating full profile...')
            const fullMarkdown = await formatPersonaFullProfile(cluster)
            const fullPath = path.join(fullOutputDir, `${safeFileName}.md`)
            fs.writeFileSync(fullPath, fullMarkdown)
            console.log(`  ✅ Saved full profile to ${fullPath}`)
        }

        // Create index files
        const createIndexFile = (outputDir: string, title: string, description: string) => {
            const indexPath = path.join(outputDir, 'README.md')
            const indexContent = `# ${title}
Generated on ${new Date().toISOString().split('T')[0]}

${description}

${clusters.analysis}

## Personas
${clusters.clusters.map(c => `- [${c.personaName}](${c.personaName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.md) - ${c.title} (${c.percentageOfTotal}% of profiles)`).join('\n')}
`
            fs.writeFileSync(indexPath, indexContent)
            console.log(`✅ Created index at ${indexPath}`)
        }

        // Create main index
        const mainIndexPath = path.join(baseOutputDir, 'README.md')
        const mainIndexContent = `# Persona Profiles
Generated on ${new Date().toISOString().split('T')[0]}

This directory contains two versions of each persona profile:

- [Executive Summaries](./executive-summary/): Concise one-page overviews of each persona
- [Full Profiles](./full-profile/): Comprehensive 2-4 page detailed profiles

${clusters.analysis}

## Personas
${clusters.clusters.map(c => `- **${c.personaName}** - ${c.title} (${c.percentageOfTotal}% of profiles)
  - [Executive Summary](./executive-summary/${c.personaName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.md)
  - [Full Profile](./full-profile/${c.personaName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.md)`).join('\n')}
`
        fs.writeFileSync(mainIndexPath, mainIndexContent)
        console.log(`✅ Created main index at ${mainIndexPath}`)

        // Create specific index files
        createIndexFile(
            summaryOutputDir,
            "Persona Executive Summaries",
            "These one-page executive summaries provide a quick overview of each persona's key characteristics, goals, and challenges."
        )

        createIndexFile(
            fullOutputDir,
            "Persona Full Profiles",
            "These comprehensive profiles provide detailed information about each persona, including their values, motivations, challenges, emotional profile, and information ecosystem."
        )

        console.log('\nAll personas have been formatted and saved!')
        console.log(`📁 Location: ${baseOutputDir}`)

    } catch (error) {
        console.error('Error generating formatted personas:', error)
        process.exit(1)
    }
}

// Run the formatter
generateFormattedPersonas() 