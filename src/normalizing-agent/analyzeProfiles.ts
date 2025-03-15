import * as fs from 'node:fs'
import * as path from 'node:path'
import type { ProfileData } from './types.js'

interface NormalizationOpportunity {
    field: string
    similarValues: Record<string, string[]>
    impact: number // 1-10 score indicating potential impact on clustering
    examples: string[]
    description: string
}

interface CompanyStats {
    count: number
    variations: Set<string>
    titles: Set<string>
}

function analyzeMergedProfiles() {
    const mergedDir = path.join(process.cwd(), 'data', 'merged')
    const profileFiles = fs.readdirSync(mergedDir).filter(file => file.endsWith('.json'))

    // Load all profiles
    const profiles: ProfileData[] = []
    for (const file of profileFiles) {
        try {
            const filePath = path.join(mergedDir, file)
            const profile = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ProfileData
            profiles.push(profile)
        } catch (error) {
            console.error(`Error parsing ${file}:`, error)
        }
    }

    console.log(`Loaded ${profiles.length} profiles for analysis`)

    // Find normalization opportunities
    const opportunities: NormalizationOpportunity[] = []

    // 1. Analyze company names
    opportunities.push(analyzeCompanyNames(profiles))

    // 2. Analyze job titles
    opportunities.push(analyzeJobTitles(profiles))

    // 3. Analyze skills
    opportunities.push(analyzeSkills(profiles))

    // 4. Analyze locations
    opportunities.push(analyzeLocations(profiles))

    // 5. Analyze date formats
    opportunities.push(analyzeDateFormats(profiles))

    // Sort opportunities by impact score (descending)
    opportunities.sort((a, b) => b.impact - a.impact)

    // Output results
    console.log('\n=== Normalization Opportunities ===\n')
    for (const [index, opp] of opportunities.entries()) {
        console.log(`${index + 1}. ${opp.field} (Impact: ${opp.impact}/10)`)
        console.log(`   ${opp.description}`)
        console.log('   Examples:')
        for (const example of opp.examples.slice(0, 5)) {
            console.log(`   - ${example}`)
        }

        // Show a few examples of similar values that could be normalized
        const similarValuesEntries = Object.entries(opp.similarValues)
        if (similarValuesEntries.length > 0) {
            console.log('   Similar values that could be normalized:')
            for (const [key, values] of similarValuesEntries.slice(0, 3)) {
                console.log(`   - ${key}: ${values.slice(0, 3).join(', ')}${values.length > 3 ? '...' : ''}`)
            }
        }
        console.log()
    }

    return opportunities
}

function analyzeCompanyNames(profiles: ProfileData[]): NormalizationOpportunity {
    const companies: Record<string, CompanyStats> = {}
    const similarCompanies: Record<string, string[]> = {}

    // Gather all company names and their variations
    for (const profile of profiles) {
        for (const exp of profile.experience) {
            const companyName = exp.company.trim()
            const normalizedName = companyName.toLowerCase()
                .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
                .replace(/\s+/g, ' ')

            if (!companies[normalizedName]) {
                companies[normalizedName] = {
                    count: 0,
                    variations: new Set<string>(),
                    titles: new Set<string>()
                }
            }

            companies[normalizedName].count++
            companies[normalizedName].variations.add(companyName)
            companies[normalizedName].titles.add(exp.title)

            // Look for likely similar companies
            const potentialMatches = Object.keys(companies).filter(name =>
                name !== normalizedName &&
                (name.includes(normalizedName.substring(0, Math.min(6, normalizedName.length))) ||
                    normalizedName.includes(name.substring(0, Math.min(6, name.length))))
            )

            for (const match of potentialMatches) {
                if (!similarCompanies[normalizedName]) {
                    similarCompanies[normalizedName] = []
                }
                if (!similarCompanies[normalizedName].includes(match)) {
                    similarCompanies[normalizedName].push(match)
                }
            }
        }
    }

    // Find companies with multiple variations
    const variationsFound: Record<string, string[]> = {}
    for (const [name, stats] of Object.entries(companies)) {
        if (stats.variations.size > 1) {
            variationsFound[name] = Array.from(stats.variations)
        }
    }

    // Generate examples of variations
    const examples = Object.entries(variationsFound)
        .map(([name, variations]) => `"${variations.join('" vs "')}"`)
        .slice(0, 10)

    return {
        field: 'Company Names',
        similarValues: variationsFound,
        impact: 9,
        examples,
        description: 'Companies with multiple spelling variations or formatting differences'
    }
}

function analyzeJobTitles(profiles: ProfileData[]): NormalizationOpportunity {
    const titles: Record<string, number> = {}
    const titlePatterns: Record<string, Set<string>> = {}
    const similarTitles: Record<string, string[]> = {}

    // Common title patterns to look for
    const patterns = [
        'Manager', 'Director', 'VP', 'Vice President', 'Engineer', 'Developer',
        'Specialist', 'Lead', 'Senior', 'Junior', 'Associate', 'Assistant'
    ]

    // Collect all job titles
    for (const profile of profiles) {
        // The main title on the profile
        if (profile.title) {
            const title = profile.title.trim()
            titles[title] = (titles[title] || 0) + 1

            // Check for patterns
            for (const pattern of patterns) {
                if (title.toLowerCase().includes(pattern.toLowerCase())) {
                    if (!titlePatterns[pattern]) {
                        titlePatterns[pattern] = new Set<string>()
                    }
                    titlePatterns[pattern].add(title)
                }
            }
        }

        // Titles from experience entries
        for (const exp of profile.experience) {
            const title = exp.title.trim()
            titles[title] = (titles[title] || 0) + 1

            // Check for patterns
            for (const pattern of patterns) {
                if (title.toLowerCase().includes(pattern.toLowerCase())) {
                    if (!titlePatterns[pattern]) {
                        titlePatterns[pattern] = new Set<string>()
                    }
                    titlePatterns[pattern].add(title)
                }
            }
        }
    }

    // Find similar titles
    const allTitles = Object.keys(titles)
    for (let i = 0; i < allTitles.length; i++) {
        const title1 = allTitles[i].toLowerCase()

        for (let j = i + 1; j < allTitles.length; j++) {
            const title2 = allTitles[j].toLowerCase()

            // Check for similarity
            if (title1.includes(title2) || title2.includes(title1) ||
                (title1.length > 5 && title2.length > 5 &&
                    (title1.substring(0, 5) === title2.substring(0, 5)))) {

                if (!similarTitles[allTitles[i]]) {
                    similarTitles[allTitles[i]] = []
                }
                if (!similarTitles[allTitles[i]].includes(allTitles[j])) {
                    similarTitles[allTitles[i]].push(allTitles[j])
                }
            }
        }
    }

    // Convert pattern sets to arrays for the result
    const patternVariations: Record<string, string[]> = {}
    for (const [pattern, titleSet] of Object.entries(titlePatterns)) {
        patternVariations[pattern] = Array.from(titleSet)
    }

    // Generate examples
    const examples = Object.entries(patternVariations)
        .map(([pattern, titles]) =>
            `${pattern}: ${titles.slice(0, 3).join(', ')}${titles.length > 3 ? '...' : ''}`)
        .slice(0, 10)

    return {
        field: 'Job Titles',
        similarValues: similarTitles,
        impact: 8,
        examples,
        description: 'Job titles with similar meanings but different formats or wording'
    }
}

function analyzeSkills(profiles: ProfileData[]): NormalizationOpportunity {
    const skills: Record<string, number> = {}
    const similarSkills: Record<string, string[]> = {}

    // Collect all skills
    for (const profile of profiles) {
        for (const skill of profile.key_skills) {
            const normalizedSkill = skill.trim()
            skills[normalizedSkill] = (skills[normalizedSkill] || 0) + 1
        }
    }

    // Find similar skills
    const allSkills = Object.keys(skills)
    for (let i = 0; i < allSkills.length; i++) {
        const skill1 = allSkills[i].toLowerCase()

        for (let j = i + 1; j < allSkills.length; j++) {
            const skill2 = allSkills[j].toLowerCase()

            // Check for similarity
            if (skill1.includes(skill2) || skill2.includes(skill1) ||
                levenshteinDistance(skill1, skill2) <= 2) {

                if (!similarSkills[allSkills[i]]) {
                    similarSkills[allSkills[i]] = []
                }
                if (!similarSkills[allSkills[i]].includes(allSkills[j])) {
                    similarSkills[allSkills[i]].push(allSkills[j])
                }
            }
        }
    }

    // Generate examples
    const examples = Object.entries(similarSkills)
        .map(([skill, similars]) => `"${skill}" vs "${similars.join('", "')}"`)
        .slice(0, 10)

    return {
        field: 'Skills',
        similarValues: similarSkills,
        impact: 7,
        examples,
        description: 'Similar skills with different wording, abbreviations, or specificity'
    }
}

function analyzeLocations(profiles: ProfileData[]): NormalizationOpportunity {
    const locations: Record<string, number> = {}
    const similarLocations: Record<string, string[]> = {}

    // Collect profile locations
    for (const profile of profiles) {
        if (profile.location) {
            const location = profile.location.trim()
            locations[location] = (locations[location] || 0) + 1
        }

        // Also collect locations from experience
        for (const exp of profile.experience) {
            if (exp.location) {
                const location = exp.location.trim()
                locations[location] = (locations[location] || 0) + 1
            }
        }
    }

    // Find similar locations
    const allLocations = Object.keys(locations)
    for (let i = 0; i < allLocations.length; i++) {
        const loc1 = allLocations[i].toLowerCase()

        for (let j = i + 1; j < allLocations.length; j++) {
            const loc2 = allLocations[j].toLowerCase()

            // Check if locations share words (like city names)
            const words1 = loc1.split(/[\s,]+/)
            const words2 = loc2.split(/[\s,]+/)

            const hasCommonWords = words1.some(w1 =>
                words2.some(w2 => w1.length > 3 && w2.length > 3 && w1 === w2)
            )

            if (hasCommonWords) {
                if (!similarLocations[allLocations[i]]) {
                    similarLocations[allLocations[i]] = []
                }
                if (!similarLocations[allLocations[i]].includes(allLocations[j])) {
                    similarLocations[allLocations[i]].push(allLocations[j])
                }
            }
        }
    }

    // Generate examples
    const examples = Object.entries(similarLocations)
        .map(([location, similars]) => `"${location}" vs "${similars.join('", "')}"`)
        .slice(0, 10)

    return {
        field: 'Locations',
        similarValues: similarLocations,
        impact: 6,
        examples,
        description: 'Variations in location formatting, abbreviations, or specificity'
    }
}

function analyzeDateFormats(profiles: ProfileData[]): NormalizationOpportunity {
    const dateFormats: Record<string, number> = {}
    const dateExamples: Record<string, Set<string>> = {}

    // Helper to identify date format patterns
    function identifyFormat(dateStr: string): string {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return 'YYYY-MM-DD'
        if (/^\d{4}-\d{2}$/.test(dateStr)) return 'YYYY-MM'
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return 'MM/DD/YYYY'
        if (/^\d{2}\/\d{2}\/\d{2}$/.test(dateStr)) return 'MM/DD/YY'
        if (/^[A-Za-z]+ \d{4}$/.test(dateStr)) return 'Month YYYY'
        if (/^[A-Za-z]+ \d{1,2}, \d{4}$/.test(dateStr)) return 'Month DD, YYYY'
        if (dateStr.toLowerCase() === 'present') return 'Present'
        return 'Other'
    }

    // Collect date formats
    for (const profile of profiles) {
        for (const exp of profile.experience) {
            const startFormat = identifyFormat(exp.duration.start_date)
            const endFormat = identifyFormat(exp.duration.end_date)

            dateFormats[startFormat] = (dateFormats[startFormat] || 0) + 1
            dateFormats[endFormat] = (dateFormats[endFormat] || 0) + 1

            if (!dateExamples[startFormat]) {
                dateExamples[startFormat] = new Set<string>()
            }
            if (!dateExamples[endFormat]) {
                dateExamples[endFormat] = new Set<string>()
            }

            dateExamples[startFormat].add(exp.duration.start_date)
            dateExamples[endFormat].add(exp.duration.end_date)
        }

        // Also check certificates with dates
        for (const cert of profile.certificates) {
            if (cert.date_earned) {
                const format = identifyFormat(cert.date_earned)
                dateFormats[format] = (dateFormats[format] || 0) + 1

                if (!dateExamples[format]) {
                    dateExamples[format] = new Set<string>()
                }
                dateExamples[format].add(cert.date_earned)
            }

            if (cert.expiry_date) {
                const format = identifyFormat(cert.expiry_date)
                dateFormats[format] = (dateFormats[format] || 0) + 1

                if (!dateExamples[format]) {
                    dateExamples[format] = new Set<string>()
                }
                dateExamples[format].add(cert.expiry_date)
            }
        }
    }

    // Convert examples from Sets to Arrays
    const dateFormatExamples: Record<string, string[]> = {}
    for (const [format, examples] of Object.entries(dateExamples)) {
        dateFormatExamples[format] = Array.from(examples)
    }

    // Generate examples
    const examples = Object.entries(dateFormatExamples)
        .map(([format, examples]) =>
            `${format}: ${examples.slice(0, 3).join(', ')}${examples.length > 3 ? '...' : ''}`)
        .slice(0, 10)

    return {
        field: 'Date Formats',
        similarValues: dateFormatExamples,
        impact: 5,
        examples,
        description: 'Inconsistent date formats across profiles'
    }
}

// Helper function to calculate Levenshtein distance for string similarity
function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = []

    // Initialize matrix
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i]
    }

    for (let i = 0; i <= a.length; i++) {
        matrix[0][i] = i
    }

    // Fill matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1]
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                )
            }
        }
    }

    return matrix[b.length][a.length]
}

// Run the analysis
analyzeMergedProfiles() 