import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import { gemini2Flash } from './models.js'
import { generateText } from 'ai'

// Schema for a single persona cluster
const PersonaClusterSchema = z.object({
    personaName: z.string().describe('A human-like name that represents this persona (e.g., "Marketing Maven Molly")'),
    title: z.string().describe('A descriptive title for this persona cluster'),
    description: z.object({
        role: z.string().describe('A detailed description of the professional role and responsibilities'),
        values: z.array(z.string()).describe('Core professional values that drive this persona'),
        motivations: z.array(z.string()).describe('Key motivations and aspirations in their career'),
        impact: z.string().describe('How this persona makes an impact in their organization'),
        goals: z.array(z.object({
            timeframe: z.string().describe('When they aim to achieve this goal (e.g., "Next 2-3 years", "Within 5 years")'),
            goal: z.string().describe('Specific professional goal'),
            type: z.enum(['career_advancement', 'certification', 'skill_development', 'business_impact', 'leadership']).describe('Type of professional goal')
        })).describe('Professional goals and aspirations'),
        challenges: z.array(z.object({
            challenge: z.string().describe('Description of the professional challenge'),
            impact: z.string().describe('How this challenge affects their work'),
            type: z.enum(['resource_management', 'technical', 'organizational', 'market_related', 'skill_related', 'measurement']).describe('Type of challenge')
        })).min(3).describe('Key professional challenges faced (minimum 3)'),
        problems: z.array(z.object({
            problem: z.string().describe('Description of the day-to-day operational problem'),
            frequency: z.enum(['daily', 'weekly', 'monthly']).describe('How often this problem typically occurs'),
            severity: z.enum(['low', 'medium', 'high']).describe('Impact level of the problem on daily work')
        })).min(3).describe('Common day-to-day operational problems faced (minimum 3)'),
        emotions: z.object({
            dominant: z.array(z.string()).min(2).max(4).describe('2-4 dominant emotions regularly experienced (e.g., "enthusiasm", "pride", "stress")'),
            triggers: z.array(z.string()).min(2).max(4).describe('2-4 common emotional triggers (e.g., "tight deadlines", "client presentations")'),
            fears: z.array(z.string()).min(3).max(5).describe('3-5 professional fears or anxieties (e.g., "fear of failure", "fear of irrelevance")')
        }).describe('Emotional profile describing how this persona typically feels at work'),
        successMetrics: z.array(z.object({
            metric: z.string().describe('Description of the success metric'),
            importance: z.enum(['critical', 'high', 'medium']).describe('How important this metric is to the persona'),
            measurement: z.string().describe('How this metric is typically measured or evaluated')
        })).min(3).max(5).describe('3-5 key metrics this persona uses to measure their professional success'),
        informationEcosystem: z.object({
            influencers: z.array(z.object({
                name: z.string().describe('Name of the influencer or thought leader'),
                platform: z.string().describe('Platform where they follow this influencer (e.g., LinkedIn, Twitter, industry events)'),
                reason: z.string().describe('Why this persona follows or values this influencer')
            })).min(3).max(5).describe('3-5 professional influencers or thought leaders this persona follows'),
            mediaSources: z.array(z.object({
                source: z.string().describe('Name of the media source or publication'),
                type: z.enum(['industry_publication', 'podcast', 'newsletter', 'blog', 'social_media', 'research_report']).describe('Type of media source'),
                frequency: z.enum(['daily', 'weekly', 'monthly']).describe('How often this persona consumes this media')
            })).min(3).max(5).describe('3-5 trusted media sources this persona regularly consumes'),
            conferences: z.array(z.object({
                name: z.string().describe('Name of the conference or industry event'),
                focus: z.string().describe('Main focus or theme of the conference'),
                attendance: z.enum(['regular', 'occasional', 'aspiring']).describe('How often they attend this conference')
            })).min(0).max(2).describe('0-2 industry conferences or events this persona attends or follows')
        }).describe('Professional information sources and knowledge network')
    }).describe('A comprehensive description of the persona'),
    personalityProfile: z.string().describe('A description of the persona\'s professional personality traits and working style'),
    commonCharacteristics: z.array(z.string()).describe('Key characteristics shared by profiles in this cluster'),
    skills: z.array(z.string()).describe('Common skills found in this cluster'),
    typicalBackground: z.string().describe('Typical educational and professional background'),
    percentageOfTotal: z.number().describe('Approximate percentage of total profiles in this cluster'),
    representativeProfiles: z.array(z.string()).describe('Names of representative profiles in this cluster'),
    estimatedAge: z.object({
        range: z.string().describe('Age range for this persona (e.g., "25-35")'),
        average: z.number().describe('Estimated average age'),
        explanation: z.string().describe('Brief explanation for the age estimation')
    }).describe('Age estimation for this persona')
})

// Schema for the complete clustering result
const ClusteringResultSchema = z.object({
    clusters: z.array(PersonaClusterSchema),
    analysis: z.string().describe('Overall analysis of the clustering results'),
    totalProfiles: z.number().describe('Total number of profiles analyzed'),
    date: z.string().describe('Date when clustering was performed')
})

export type PersonaCluster = z.infer<typeof PersonaClusterSchema>
export type ClusteringResult = z.infer<typeof ClusteringResultSchema>

/**
 * Loads all normalized profiles from the normalized directory structure
 */
async function loadNormalizedProfiles() {
    const normalizedDir = path.join(process.cwd(), 'data', 'normalized')
    const profiles = []

    try {
        // Get all subdirectories (name folders)
        const nameDirs = fs.readdirSync(normalizedDir)

        for (const nameDir of nameDirs) {
            const namePath = path.join(normalizedDir, nameDir)

            // Skip if not a directory
            if (!fs.statSync(namePath).isDirectory()) {
                continue
            }

            // Look for name.merged.json file
            const jsonFile = path.join(namePath, `${nameDir}.merged.json`)

            if (fs.existsSync(jsonFile)) {
                try {
                    const content = fs.readFileSync(jsonFile, 'utf-8')
                    const profile = JSON.parse(content)
                    // Add the filename as a reference
                    profile.sourceFile = jsonFile
                    profiles.push(profile)
                } catch (error) {
                    console.error(
                        `Error reading profile from ${jsonFile}:`,
                        error instanceof Error ? error.message : String(error)
                    )
                }
            }
        }

        if (profiles.length === 0) {
            throw new Error('No valid profiles found in the normalized directory')
        }

        return profiles
    } catch (error) {
        console.error('Error loading normalized profiles:', error)
        throw error
    }
}

/**
 * Uses an LLM to identify persona clusters from normalized profiles
 */
export async function identifyPersonaClusters(): Promise<ClusteringResult> {
    try {
        console.log('[CLUSTER] Loading normalized profiles...')
        const profiles = await loadNormalizedProfiles()
        console.log(`[CLUSTER] Loaded ${profiles.length} profiles`)

        const promptModel = gemini2Flash

        const prompt = `You are a professional data analyst specializing in identifying meaningful patterns and clusters in professional profile data.

Analyze these ${profiles.length} professional profiles and identify meaningful persona clusters.

Focus on finding patterns in:
- Skills and expertise
- Professional background
- Career trajectory
- Industry focus
- Typical responsibilities
- Career stage and experience level
- Working style and professional personality traits
- Core values and motivations
- Professional goals and aspirations
- Common challenges and obstacles

For each cluster you identify:
1. Persona Name: Create a memorable, human-like name that embodies this persona. Use alliteration, wordplay, or descriptive first names combined with their key trait. Examples:
   - "Event Expert Emma" for an event coordinator
   - "Strategic Sam" for a communications strategist
   - "Digital Dynamo Diana" for a digital marketing expert
   - "Creative Chris" for a creative director
   - "Marketing Maven Molly" for a marketing manager
2. Title: Give a clear, descriptive title that captures the professional role of the persona
3. Description: Provide a comprehensive profile including:
   - Role: A detailed description of their professional role and responsibilities
   - Values: List 3-5 core professional values that drive them (e.g., "innovation", "collaboration", "excellence")
   - Motivations: List 3-5 key motivations in their career (e.g., "creating impactful experiences", "driving business growth")
   - Impact: Describe how they make a difference in their organization
   - Goals: List 3-4 specific professional goals with timeframes, such as:
     * Career advancement goals (e.g., "Advance to Director of Marketing within 3 years")
     * Certification goals (e.g., "Obtain Advanced Digital Marketing Certification in the next year")
     * Skill development goals (e.g., "Master emerging marketing technologies in the next 2 years")
     * Business impact goals (e.g., "Lead campaigns that increase revenue by 25% within 18 months")
     * Leadership goals (e.g., "Build and mentor a high-performing team of 10+ within 2 years")
   - Challenges: List exactly 3-4 significant professional challenges they face, categorized as one of: resource_management, technical, organizational, market_related, skill_related, or measurement. Each persona MUST have at least 3 distinct challenges. Examples:
     * Resource management challenges (e.g., "Managing multiple projects with limited resources", type: resource_management)
     * Technical challenges (e.g., "Keeping up with rapidly evolving marketing technologies", type: technical)
     * Organizational challenges (e.g., "Aligning multiple stakeholders around campaign objectives", type: organizational)
     * Market-related challenges (e.g., "Standing out in an increasingly competitive market", type: market_related)
     * Skill-related challenges (e.g., "Developing expertise in emerging platforms", type: skill_related)
     * Measurement challenges (e.g., "Quantifying the ROI of brand building initiatives", type: measurement)
   - Problems: List exactly 3-5 common day-to-day operational problems they face. These should be specific, tactical issues that occur regularly. Each problem should include frequency (daily/weekly/monthly) and severity (low/medium/high). Examples:
     * "Managing multiple concurrent deadlines" (frequency: daily, severity: high)
     * "Coordinating with remote team members in different time zones" (frequency: daily, severity: medium)
     * "Tracking project expenses and staying within budget" (frequency: weekly, severity: high)
     * "Following up on pending approvals from stakeholders" (frequency: weekly, severity: medium)
     * "Scheduling and rescheduling meetings efficiently" (frequency: daily, severity: low)
     * "Maintaining up-to-date project documentation" (frequency: weekly, severity: medium)
     * "Gathering feedback from multiple stakeholders" (frequency: weekly, severity: high)
     * "Finding time for focused work between meetings" (frequency: daily, severity: high)
   - Emotions: Describe the emotional profile of this persona, including:
     * Dominant Emotions: 2-4 emotions they regularly experience at work (e.g., "enthusiasm", "pride", "stress", "pressure")
     * Emotional Triggers: 2-4 situations that commonly trigger emotional responses (e.g., "tight deadlines", "client presentations", "team conflicts")
     * Professional Fears: 3-5 specific fears or anxieties they experience (e.g., "fear of failure", "fear of irrelevance", "fear of disappointing stakeholders", "fear of not being creative enough")
     
     For example: "Molly is often enthusiastic about new projects but feels stress and pressure to succeed. She experiences anxiety before client presentations and feels overwhelmed when managing multiple deadlines. Her professional fears include fear of failure, fear of not being creative enough, and fear of disappointing her boss."
   - Success Metrics: List 3-5 key metrics this persona uses to measure their professional success. Each metric should include:
     * Description of the metric
     * Importance level (critical, high, or medium)
     * How the metric is typically measured or evaluated
     
     Examples:
     * "Client satisfaction ratings" (importance: critical, measurement: post-event surveys and client feedback)
     * "Campaign ROI" (importance: high, measurement: revenue generated compared to campaign costs)
     * "Team productivity" (importance: medium, measurement: project completion rates and adherence to timelines)
     * "Social media engagement" (importance: high, measurement: likes, shares, comments, and follower growth)
     * "Brand awareness increase" (importance: critical, measurement: market research surveys and brand recall studies)
     * "Event attendance" (importance: high, measurement: attendance numbers compared to targets)
     * "Lead generation" (importance: critical, measurement: number of qualified leads from marketing activities)
     * "Website traffic growth" (importance: medium, measurement: monthly analytics reports)
   - Information Ecosystem: Describe the professional information sources and knowledge network this persona engages with:
     * Influencers: List EXACTLY 3-5 specific thought leaders, industry experts, or influential figures this persona follows. Each persona MUST have at least 3 influencers. Include:
       - Name of the influencer
       - Platform where they follow them (LinkedIn, Twitter, conferences, etc.)
       - Why they value this influencer's content or perspective
       
       Examples:
       * "Seth Godin" (platform: blog and books, reason: innovative marketing perspectives)
       * "Brené Brown" (platform: podcasts and LinkedIn, reason: insights on leadership and vulnerability)
       * "Gary Vaynerchuk" (platform: social media and conferences, reason: cutting-edge digital marketing strategies)
       * "Ann Handley" (platform: newsletter and Twitter, reason: content marketing expertise)
       * "Simon Sinek" (platform: TED talks and books, reason: leadership philosophy)
     
     * Media Sources: List EXACTLY 3-5 specific publications, platforms, or content sources this persona regularly consumes. Each persona MUST have at least 3 media sources. Include:
       - Name of the source
       - Type of media (industry_publication, podcast, newsletter, blog, social_media, research_report)
       - How frequently they consume it (daily, weekly, monthly)
       
       Examples:
       * "Harvard Business Review" (type: industry_publication, frequency: monthly)
       * "Marketing Brew" (type: newsletter, frequency: daily)
       * "The Marketing Podcast" (type: podcast, frequency: weekly)
       * "AdAge" (type: industry_publication, frequency: weekly)
       * "Forrester Research Reports" (type: research_report, frequency: monthly)
       * "Content Marketing Institute Blog" (type: blog, frequency: weekly)
     
     * Conferences: List 0-2 industry conferences or events this persona attends or aspires to attend. Include:
       - Name of the conference
       - Main focus or theme of the conference
       - Attendance pattern (regular, occasional, aspiring)
       
       Examples:
       * "South by Southwest (SXSW)" (focus: innovation and creativity across industries, attendance: regular)
       * "Cannes Lions International Festival of Creativity" (focus: advertising and creative communications, attendance: aspiring)
       * "Content Marketing World" (focus: content marketing strategy and implementation, attendance: occasional)
       * "Adobe MAX" (focus: creative tools and digital experiences, attendance: regular)
4. Personality Profile: Write a paragraph describing the persona's professional personality traits and working style. For example:
   "Molly is a highly organized and detail-oriented individual with strong communication and presentation skills. She thrives in collaborative environments and excels at creative problem-solving. Her natural leadership abilities and strategic mindset make her an invaluable team member who can both execute tasks efficiently and inspire others to achieve their best work."
5. Key Characteristics: List 4-7 defining characteristics shared by profiles in this cluster
6. Common Skills: List 5-10 skills frequently found in this cluster
7. Background: Describe the typical educational and professional background
8. Percentage: Estimate what percentage of the total profiles fit this persona
9. Examples: List 2-3 representative profile names from the data
10. Age Estimation: Based on career progression, experience level, and typical industry patterns:
    - Provide an age range
    - Estimate average age
    - Brief explanation for this estimation

Guidelines for clustering:
- Create memorable and relatable persona names using real first names combined with their key professional traits
- Use alliteration or wordplay in persona names when possible
- Make the personas feel like real people you might meet in the industry
- Include both professional competencies and interpersonal traits in personality profiles
- Describe working styles and approaches to problem-solving
- Focus on what drives and motivates each persona in their career
- Highlight the values that guide their professional decisions
- Set ambitious but realistic professional goals aligned with career stage
- Ensure goals are specific, measurable, and time-bound
- Include a mix of short-term and long-term goals
- Identify realistic challenges that resonate with the industry
- Ensure challenges reflect both individual and systemic obstacles
- Include both tactical and strategic challenges
- IMPORTANT: Identify EXACTLY 3-5 distinct, meaningful clusters - no more, no less
- Ensure each cluster represents a clear and coherent professional persona
- Base clusters on strong patterns in the data
- Avoid overlapping or redundant clusters
- Each cluster should contain at least 10% of profiles
- Total percentages should sum to approximately 100%
- Age estimations should be based on career progression and industry norms

Here are the profiles to analyze:
${JSON.stringify(profiles, null, 2)}

Return ONLY a valid JSON object with this exact structure:
{
    "clusters": [
        {
            "personaName": "string",
            "title": "string",
            "description": {
                "role": "string",
                "values": ["string"],
                "motivations": ["string"],
                "impact": "string",
                "goals": [
                    {
                        "timeframe": "string",
                        "goal": "string",
                        "type": "career_advancement" | "certification" | "skill_development" | "business_impact" | "leadership"
                    }
                ],
                "challenges": [
                    {
                        "challenge": "string",
                        "impact": "string",
                        "type": "resource_management" | "technical" | "organizational" | "market_related" | "skill_related" | "measurement"
                    }
                ],
                "problems": [
                    {
                        "problem": "string",
                        "frequency": "daily" | "weekly" | "monthly",
                        "severity": "low" | "medium" | "high"
                    }
                ],
                "emotions": {
                    "dominant": ["string"],
                    "triggers": ["string"],
                    "fears": ["string"]
                },
                "successMetrics": [
                    {
                        "metric": "string",
                        "importance": "critical" | "high" | "medium",
                        "measurement": "string"
                    }
                ],
                "informationEcosystem": {
                    "influencers": [
                        {
                            "name": "string",
                            "platform": "string",
                            "reason": "string"
                        }
                    ],
                    "mediaSources": [
                        {
                            "source": "string",
                            "type": "industry_publication" | "podcast" | "newsletter" | "blog" | "social_media" | "research_report",
                            "frequency": "daily" | "weekly" | "monthly"
                        }
                    ],
                    "conferences": [
                        {
                            "name": "string",
                            "focus": "string",
                            "attendance": "regular" | "occasional" | "aspiring"
                        }
                    ]
                }
            },
            "personalityProfile": "string",
            "commonCharacteristics": ["string"],
            "skills": ["string"],
            "typicalBackground": "string",
            "percentageOfTotal": number,
            "representativeProfiles": ["string"],
            "estimatedAge": {
                "range": "string",
                "average": number,
                "explanation": "string"
            }
        }
    ],
    "analysis": "string - overall analysis of the clustering results",
    "totalProfiles": number,
    "date": "${new Date().toISOString().split('T')[0]}"
}

Ensure your response is EXACTLY in this JSON format with no additional text or markdown.`

        console.log('[CLUSTER] Calling LLM for cluster analysis...')
        const { text: responseText } = await generateText({
            model: gemini2Flash,
            prompt
        });

        // Extract and parse the JSON response
        let jsonStr = responseText
        // Remove any markdown code blocks if present
        jsonStr = jsonStr.replace(/```json\n?|\n?```/g, '')
        // Find the JSON object in the response
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            throw new Error('Could not extract JSON from LLM response')
        }

        try {
            // Log a sample of the response for debugging
            console.log('[CLUSTER] Response sample (first 100 chars):', jsonMatch[0].substring(0, 100))

            // Parse and validate against our schema
            const parsedResponse = JSON.parse(jsonMatch[0])
            const result = await ClusteringResultSchema.parseAsync(parsedResponse)

            // Validate cluster percentages
            const totalPercentage = result.clusters.reduce((sum, cluster) => sum + cluster.percentageOfTotal, 0)
            if (Math.abs(totalPercentage - 100) > 5) {
                console.warn(`[CLUSTER] Warning: Cluster percentages sum to ${totalPercentage}%, expected close to 100%`)
            }

            // Save the clustering results
            const outputDir = path.join(process.cwd(), 'data', 'clusters')
            fs.mkdirSync(outputDir, { recursive: true })

            const outputPath = path.join(outputDir, `clusters_${new Date().toISOString().split('T')[0]}.json`)
            fs.writeFileSync(outputPath, JSON.stringify(result, null, 2))

            console.log(`[CLUSTER] Successfully identified ${result.clusters.length} persona clusters`)
            console.log(`[CLUSTER] Results saved to ${outputPath}`)

            return result
        } catch (error) {
            // Save the raw response for debugging
            const debugDir = path.join(process.cwd(), 'logs')
            fs.mkdirSync(debugDir, { recursive: true })
            const debugPath = path.join(debugDir, `cluster_response_error_${new Date().toISOString().replace(/:/g, '-')}.txt`)
            fs.writeFileSync(debugPath, jsonMatch[0])
            console.error(`[CLUSTER] JSON parsing error. Raw response saved to ${debugPath}`)

            throw error
        }
    } catch (error) {
        console.error('[CLUSTER] Error identifying persona clusters:', error)
        throw error
    }
} 