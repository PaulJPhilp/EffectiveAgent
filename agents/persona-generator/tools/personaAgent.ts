import { generateText, type LanguageModelV1 } from 'ai';
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

// Interface for normalized profile data
interface NormalizedProfileData {
    [key: string]: unknown;
}

// Step 1: Basic Persona Cluster Schema (just for clustering)
const BasicPersonaClusterSchema = z.object({
    title: z.string().describe("A descriptive title for this persona cluster"),
    description: z
        .string()
        .describe("A concise description of this persona type"),
    commonCharacteristics: z
        .array(z.string())
        .describe("Key characteristics shared by profiles in this cluster"),
    skills: z.array(z.string()).describe("Common skills found in this cluster"),
    typicalBackground: z
        .string()
        .describe("Typical educational and professional background"),
    percentageOfTotal: z
        .number()
        .describe("Approximate percentage of total profiles in this cluster"),
    representativeProfiles: z
        .array(z.string())
        .describe("Names of representative profiles in this cluster"),
});

// Step 2: Full Persona Schema (for elaboration)
const FullPersonaClusterSchema = z.object({
    personaName: z
        .string()
        .describe(
            'A human-like name that represents this persona (e.g., "Marketing Maven Molly")',
        ),
    title: z.string().describe("A descriptive title for this persona cluster"),
    description: z
        .object({
            role: z
                .string()
                .describe(
                    "A detailed description of the professional role and responsibilities",
                ),
            values: z
                .array(z.string())
                .describe("Core professional values that drive this persona"),
            motivations: z
                .array(z.string())
                .describe("Key motivations and aspirations in their career"),
            impact: z
                .string()
                .describe("How this persona makes an impact in their organization"),
            goals: z
                .array(
                    z.object({
                        timeframe: z
                            .string()
                            .describe(
                                'When they aim to achieve this goal (e.g., "Next 2-3 years", "Within 5 years")',
                            ),
                        goal: z.string().describe("Specific professional goal"),
                        type: z
                            .enum([
                                "career_advancement",
                                "certification",
                                "skill_development",
                                "business_impact",
                                "leadership",
                            ])
                            .describe("Type of professional goal"),
                    }),
                )
                .describe("Professional goals and aspirations"),
            challenges: z
                .array(
                    z.object({
                        challenge: z
                            .string()
                            .describe("Description of the professional challenge"),
                        impact: z
                            .string()
                            .describe("How this challenge affects their work"),
                        type: z
                            .enum([
                                "resource_management",
                                "technical",
                                "organizational",
                                "market_related",
                                "skill_related",
                                "measurement",
                            ])
                            .describe("Type of challenge"),
                    }),
                )
                .min(3)
                .describe("Key professional challenges faced (minimum 3)"),
            problems: z
                .array(
                    z.object({
                        problem: z
                            .string()
                            .describe("Description of the day-to-day operational problem"),
                        frequency: z
                            .enum(["daily", "weekly", "monthly"])
                            .describe("How often this problem typically occurs"),
                        severity: z
                            .enum(["low", "medium", "high"])
                            .describe("Impact level of the problem on daily work"),
                    }),
                )
                .min(3)
                .describe("Common day-to-day operational problems faced (minimum 3)"),
            emotions: z
                .object({
                    dominant: z
                        .array(z.string())
                        .min(2)
                        .max(4)
                        .describe(
                            '2-4 dominant emotions regularly experienced (e.g., "enthusiasm", "pride", "stress")',
                        ),
                    triggers: z
                        .array(z.string())
                        .min(2)
                        .max(4)
                        .describe(
                            '2-4 common emotional triggers (e.g., "tight deadlines", "client presentations")',
                        ),
                    fears: z
                        .array(z.string())
                        .min(3)
                        .max(5)
                        .describe(
                            '3-5 professional fears or anxieties (e.g., "fear of failure", "fear of irrelevance")',
                        ),
                })
                .describe(
                    "Emotional profile describing how this persona typically feels at work",
                ),
            successMetrics: z
                .array(
                    z.object({
                        metric: z.string().describe("Description of the success metric"),
                        importance: z
                            .enum(["critical", "high", "medium"])
                            .describe("How important this metric is to the persona"),
                        measurement: z
                            .string()
                            .describe("How this metric is typically measured or evaluated"),
                    }),
                )
                .min(3)
                .max(5)
                .describe(
                    "3-5 key metrics this persona uses to measure their professional success",
                ),
            informationEcosystem: z
                .object({
                    influencers: z
                        .array(
                            z.object({
                                name: z
                                    .string()
                                    .describe("Name of the influencer or thought leader"),
                                platform: z
                                    .string()
                                    .describe(
                                        "Platform where they follow this influencer (e.g., LinkedIn, Twitter, industry events)",
                                    ),
                                reason: z
                                    .string()
                                    .describe(
                                        "Why this persona follows or values this influencer",
                                    ),
                            }),
                        )
                        .min(3)
                        .max(5)
                        .describe(
                            "3-5 professional influencers or thought leaders this persona follows",
                        ),
                    mediaSources: z
                        .array(
                            z.object({
                                source: z
                                    .string()
                                    .describe("Name of the media source or publication"),
                                type: z
                                    .enum([
                                        "industry_publication",
                                        "podcast",
                                        "newsletter",
                                        "blog",
                                        "social_media",
                                        "research_report",
                                    ])
                                    .describe("Type of media source"),
                                frequency: z
                                    .enum(["daily", "weekly", "monthly"])
                                    .describe("How often this persona consumes this media"),
                            }),
                        )
                        .min(3)
                        .max(5)
                        .describe(
                            "3-5 trusted media sources this persona regularly consumes",
                        ),
                    conferences: z
                        .array(
                            z.object({
                                name: z
                                    .string()
                                    .describe("Name of the conference or industry event"),
                                focus: z
                                    .string()
                                    .describe("Main focus or theme of the conference"),
                                attendance: z
                                    .enum(["regular", "occasional", "aspiring"])
                                    .describe("How often they attend this conference"),
                            }),
                        )
                        .min(0)
                        .max(2)
                        .describe(
                            "0-2 industry conferences or events this persona attends or follows",
                        ),
                })
                .describe("Professional information sources and knowledge network"),
        })
        .describe("A comprehensive description of the persona"),
    personalityProfile: z
        .string()
        .describe(
            "A description of the persona's professional personality traits and working style",
        ),
    commonCharacteristics: z
        .array(z.string())
        .describe("Key characteristics shared by profiles in this cluster"),
    skills: z.array(z.string()).describe("Common skills found in this cluster"),
    typicalBackground: z
        .string()
        .describe("Typical educational and professional background"),
    percentageOfTotal: z
        .number()
        .describe("Approximate percentage of total profiles in this cluster"),
    representativeProfiles: z
        .array(z.string())
        .describe("Names of representative profiles in this cluster"),
    estimatedAge: z
        .object({
            range: z.string().describe('Age range for this persona (e.g., "25-35")'),
            average: z.number().describe("Estimated average age"),
            explanation: z
                .string()
                .describe("Brief explanation for the age estimation"),
        })
        .describe("Age estimation for this persona"),
});

// Schema for the clustering results and elaborated personas
const BasicClusteringResultSchema = z.object({
    clusters: z.array(BasicPersonaClusterSchema),
    analysis: z.string().describe("Overall analysis of the clustering results"),
    totalProfiles: z.number().describe("Total number of profiles analyzed"),
    date: z.string().describe("Date when clustering was performed"),
});

const ElaboratedPersonasSchema = z.object({
    personas: z.array(FullPersonaClusterSchema),
    analysis: z.string().describe("Overall analysis of the personas"),
    totalProfiles: z.number().describe("Total number of profiles analyzed"),
    date: z.string().describe("Date when personas were created"),
});

// Type definitions
type BasicPersonaCluster = z.infer<typeof BasicPersonaClusterSchema>;
type FullPersonaCluster = z.infer<typeof FullPersonaClusterSchema>;
type BasicClusteringResult = z.infer<typeof BasicClusteringResultSchema>;
type ElaboratedPersonas = z.infer<typeof ElaboratedPersonasSchema>;

type AIModel = LanguageModelV1

/**
 * Step 1: Load normalized profiles from disk
 */
async function loadNormalizedProfiles() {
    const normalizedDir = path.join(process.cwd(), "data", "normalized");

    if (!fs.existsSync(normalizedDir)) {
        throw new Error(
            `Normalized profiles directory not found: ${normalizedDir}`,
        );
    }

    // Get all directories (each representing a person)
    const personDirs = fs
        .readdirSync(normalizedDir, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

    if (personDirs.length === 0) {
        throw new Error("No normalized profile directories found");
    }

    console.log(
        `[AGENT] Found ${personDirs.length} normalized profile directories`,
    );

    const profiles: NormalizedProfileData[] = [];
    for (const personDir of personDirs) {
        // Look for the profile.json file in each person's directory
        const profilePath = path.join(normalizedDir, personDir, "profile.json");

        if (fs.existsSync(profilePath)) {
            const content = fs.readFileSync(profilePath, "utf-8");
            try {
                const profile = JSON.parse(content) as NormalizedProfileData;
                profiles.push(profile);
            } catch (error) {
                console.warn(
                    `[AGENT] Warning: Could not parse profile for ${personDir}, skipping`,
                );
            }
        } else {
            console.warn(
                `[AGENT] Warning: No profile.json found for ${personDir}, checking for any JSON file`,
            );

            // If profile.json doesn't exist, try to find any JSON file
            const files = fs
                .readdirSync(path.join(normalizedDir, personDir))
                .filter((f) => f.endsWith(".json"));

            if (files.length > 0) {
                const firstJsonPath = path.join(normalizedDir, personDir, files[0]);
                const content = fs.readFileSync(firstJsonPath, "utf-8");
                try {
                    const profile = JSON.parse(content) as NormalizedProfileData;
                    profiles.push(profile);
                } catch (error) {
                    console.warn(
                        `[AGENT] Warning: Could not parse ${files[0]} for ${personDir}, skipping`,
                    );
                }
            } else {
                console.warn(
                    `[AGENT] Warning: No JSON files found for ${personDir}, skipping`,
                );
            }
        }
    }

    if (profiles.length === 0) {
        throw new Error("No valid profiles found");
    }

    console.log(
        `[AGENT] Successfully loaded ${profiles.length} normalized profiles`,
    );
    return profiles;
}

/**
 * Step 2: Create basic persona clusters from normalized profiles
 */
async function createBasicPersonaClusters(
    profiles: Record<string, unknown>[],
    model: AIModel
): Promise<BasicClusteringResult> {
    console.log(
        `[AGENT] Creating basic persona clusters from ${profiles.length} profiles`,
    );

    // Define the prompt for basic clustering
    const prompt = `You are a professional data analyst specializing in identifying meaningful patterns and clusters in professional profile data.

Analyze these ${profiles.length} professional profiles and identify meaningful persona clusters.

Focus on finding patterns in:
- Skills and expertise
- Professional background
- Career trajectory
- Industry focus
- Typical responsibilities

For each cluster you identify:
1. Title: Give a clear, descriptive title for this persona type
2. Description: Write a concise description of this persona type
3. Key Characteristics: List 4-7 defining characteristics shared by profiles in this cluster
4. Common Skills: List 5-10 skills frequently found in this cluster
5. Background: Describe the typical educational and professional background
6. Percentage: Estimate what percentage of the total profiles fit this persona
7. Examples: List 2-3 representative profile names from the data

Guidelines for clustering:
- IMPORTANT: Identify EXACTLY 3-5 distinct, meaningful clusters - no more, no less
- Ensure each cluster represents a clear and coherent professional persona
- Base clusters on strong patterns in the data
- Avoid overlapping or redundant clusters
- Each cluster should contain at least 8% of profiles
- Total percentages should sum to approximately 100%

Here are the profiles to analyze:
${JSON.stringify(profiles, null, 2)}

Return ONLY a valid JSON object with this exact structure:
{
    "clusters": [
        {
            "title": "string",
            "description": "string",
            "commonCharacteristics": ["string"],
            "skills": ["string"],
            "typicalBackground": "string",
            "percentageOfTotal": number,
            "representativeProfiles": ["string"]
        }
    ],
    "analysis": "string - overall analysis of the clustering results",
    "totalProfiles": number,
    "date": "${new Date().toISOString().split("T")[0]}"
}`;

    console.log("[AGENT] Calling LLM for basic clustering...");
    const { text: responseText } = await generateText({
        model,
        prompt
    });

    // Declare jsonMatch outside try block to make it accessible in catch block
    let jsonMatch: RegExpMatchArray | null = null;

    try {
        // Extract JSON from the response
        jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("Could not extract JSON from LLM response");
        }

        // Parse and validate the response
        const parsedResponse = JSON.parse(jsonMatch[0]);
        const result = await BasicClusteringResultSchema.parseAsync(parsedResponse);

        // Save the basic clusters
        const outputDir = path.join(
            process.cwd(),
            "data",
            "personas",
            "clusters",
            "basic",
        );
        fs.mkdirSync(outputDir, { recursive: true });
        const outputPath = path.join(
            outputDir,
            `basic_clusters_${new Date().toISOString().split("T")[0]}.json`,
        );
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

        console.log(
            `[AGENT] Successfully created ${result.clusters.length} basic persona clusters`,
        );
        console.log(`[AGENT] Results saved to ${outputPath}`);

        return result;
    } catch (error) {
        console.error("[AGENT] Error creating basic persona clusters:", error);
        throw error;
    }
}

/**
 * Step 3: Elaborate each basic persona into a full persona
 */
async function elaboratePersona(
    basicPersona: BasicPersonaCluster,
    model: AIModel
): Promise<FullPersonaCluster> {
    console.log(`[AGENT] Elaborating persona: ${basicPersona.title}`);

    // Define the prompt for persona elaboration
    const prompt = `You are a professional marketer specialized in creating detailed persona profiles.

I'll provide you with a basic persona profile, and I need you to elaborate it into a comprehensive persona with a human-like name, detailed characteristics, motivations, goals, challenges, and more.

Basic Persona Information:
${JSON.stringify(basicPersona, null, 2)}

Please elaborate this basic persona into a comprehensive profile with the following elements:

1. Give the persona a memorable, human-like name that embodies their role, using alliteration or wordplay (e.g., "Marketing Maven Molly" or "Strategic Sam")

2. Provide a comprehensive description including:
   - Detailed role description
   - 3-5 core professional values
   - 3-5 key motivations
   - Description of how they make an impact in their organization
   - 3-4 specific professional goals with timeframes
   - EXACTLY 3-5 professional challenges they face (with impact descriptions)
   - EXACTLY 3-5 day-to-day operational problems (with frequency and severity)
   - Emotional profile (2-4 dominant emotions, 2-4 triggers, EXACTLY 3-5 professional fears)
   - EXACTLY 3-5 key success metrics they use (with importance level and measurement method)
   - Information ecosystem:
     * EXACTLY 3-5 professional influencers or thought leaders they follow
     * EXACTLY 3-5 trusted media sources they regularly consume (only using frequency values: "daily", "weekly", or "monthly")
     * 0-2 industry conferences they attend

3. Write a paragraph describing their professional personality traits and working style

4. Estimate their age range and average age based on career progression and experience level

Be creative but realistic - create a persona that feels like a real person in this professional role.

Return ONLY a valid JSON object that matches this exact structure:
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
}`;

    console.log(`[AGENT] Elaborating ${basicPersona.title}...`);
    const { text: responseText } = await generateText({
        model,
        prompt
    });

    // Declare jsonMatch outside try block to make it accessible in catch block
    let jsonMatch: RegExpMatchArray | null = null;

    try {
        // Extract JSON from the response
        jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("Could not extract JSON from LLM response");
        }

        // Parse and validate the response
        const parsedResponse = JSON.parse(jsonMatch[0]);
        const result = await FullPersonaClusterSchema.parseAsync(parsedResponse);

        // Save the elaborated persona
        const outputDir = path.join(
            process.cwd(),
            "data",
            "personas",
            "elaborated",
        );
        fs.mkdirSync(outputDir, { recursive: true });
        const safeFileName = result.personaName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_");
        const outputPath = path.join(outputDir, `${safeFileName}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

        console.log(`[AGENT] Successfully elaborated ${result.personaName}`);
        console.log(`[AGENT] Saved to ${outputPath}`);

        return result;
    } catch (error) {
        console.error(
            `[AGENT] Error elaborating persona ${basicPersona.title}:`,
            error,
        );
        // Save the raw response for debugging
        const debugDir = path.join(process.cwd(), "logs");
        fs.mkdirSync(debugDir, { recursive: true });
        const debugPath = path.join(
            debugDir,
            `elaboration_error_${new Date().toISOString().replace(/:/g, "-")}.txt`,
        );
        if (jsonMatch) fs.writeFileSync(debugPath, jsonMatch[0]);
        else fs.writeFileSync(debugPath, responseText);
        console.error(`[AGENT] Raw response saved to ${debugPath}`);
        throw error;
    }
}

/**
 * Step 4: Create an executive summary for a persona
 */
async function createExecutiveSummary(
    persona: FullPersonaCluster,
    model: AIModel
): Promise<string> {
    console.log(`[AGENT] Creating executive summary for ${persona.personaName}`);

    // Define the prompt for executive summary
    const prompt = `You are a professional marketer working for a marketing agency. You create clear, engaging persona documents.
Format this persona data into a concise, visually appealing ONE-PAGE executive summary in markdown format.

Use this persona data:
${JSON.stringify(persona, null, 2)}

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

Return ONLY the markdown content with no additional text or explanations.`;

    const { text: responseText } = await generateText({
        model,
        prompt
    });

    // Save the executive summary
    const outputDir = path.join(
        process.cwd(),
        "data",
        "personas",
        "executive-summary",
    );
    fs.mkdirSync(outputDir, { recursive: true });
    const safeFileName = persona.personaName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_");
    const outputPath = path.join(outputDir, `${safeFileName}.md`);
    fs.writeFileSync(outputPath, responseText);

    console.log(
        `[AGENT] Executive summary for ${persona.personaName} saved to ${outputPath}`,
    );

    return responseText;
}

/**
 * Step 5: Create a full profile for a persona
 */
async function createFullProfile(
    persona: FullPersonaCluster,
    model: AIModel
): Promise<string> {
    console.log(`[AGENT] Creating full profile for ${persona.personaName}`);

    // Define the prompt for full profile
    const prompt = `You are a professional marketer working for a marketing agency. You create comprehensive, engaging persona documents.
Format this persona data into a detailed, well-structured 2-4 PAGE markdown document.

Use this persona data:
${JSON.stringify(persona, null, 2)}

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

Return ONLY the markdown content with no additional text or explanations.`;

    const { text: responseText } = await generateText({
        model,
        prompt
    });

    // Save the full profile
    const outputDir = path.join(
        process.cwd(),
        "data",
        "personas",
        "full-profile",
    );
    fs.mkdirSync(outputDir, { recursive: true });
    const safeFileName = persona.personaName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_");
    const outputPath = path.join(outputDir, `${safeFileName}.md`);
    fs.writeFileSync(outputPath, responseText);

    console.log(
        `[AGENT] Full profile for ${persona.personaName} saved to ${outputPath}`,
    );

    return responseText;
}

/**
 * Step 6: Create a summary report of all personas
 */
async function createSummaryReport(
    personas: FullPersonaCluster[],
    model: AIModel
): Promise<string> {
    console.log(
        `[AGENT] Creating summary report for ${personas.length} personas`,
    );

    // Define the prompt for summary report
    const prompt = `You are a professional market researcher who specializes in audience segmentation and persona creation.

I'll provide you with a set of detailed personas we've created. Please analyze them and create a comprehensive summary report.

Personas:
${JSON.stringify(personas, null, 2)}

In your report, please include:

1. Executive Summary: A brief overview of the personas and key insights
2. Methodology: A short description of how these personas were created
3. Persona Overview: A brief description of each persona and what makes them unique
4. Key Patterns & Insights: What patterns emerge across these personas? What are the common themes, differences, etc.?
5. Recommendations: How can these personas be used effectively?

Format the report as a professional markdown document with clear sections, bullet points where appropriate, and a professional tone.

Return ONLY the markdown content with no additional text or explanations.`;

    const { text: responseText } = await generateText({
        model,
        prompt
    });

    // Save the summary report
    const outputDir = path.join(process.cwd(), "data", "personas");
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, "summary_report.md");
    fs.writeFileSync(outputPath, responseText);

    console.log(`[AGENT] Summary report saved to ${outputPath}`);

    return responseText;
}

/**
 * Create index files for the personas
 */
function createIndexFiles(personas: FullPersonaCluster[]) {
    console.log("[AGENT] Creating index files");

    // Create base output directory
    const baseOutputDir = path.join(process.cwd(), "data", "personas");

    // Create main index
    const mainIndexPath = path.join(baseOutputDir, "README.md");
    const mainIndexContent = `# Persona Profiles
Generated on ${new Date().toISOString().split("T")[0]}

This directory contains detailed personas generated through an agent-based approach:

- [Executive Summaries](./executive-summary/): Concise one-page overviews of each persona
- [Full Profiles](./full-profile/): Comprehensive 2-4 page detailed profiles
- [Summary Report](./summary_report.md): Analysis of all personas and key insights

## Personas
${personas
            .map(
                (p) => `- **${p.personaName}** - ${p.title} (${p.percentageOfTotal}% of profiles)
  - [Executive Summary](./executive-summary/${p.personaName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.md)
  - [Full Profile](./full-profile/${p.personaName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.md)`,
            )
            .join("\n")}
`;
    fs.writeFileSync(mainIndexPath, mainIndexContent);
    console.log(`[AGENT] Created main index at ${mainIndexPath}`);

    // Create index for executive summaries
    const summaryOutputDir = path.join(baseOutputDir, "executive-summary");
    const summaryIndexPath = path.join(summaryOutputDir, "README.md");
    const summaryIndexContent = `# Persona Executive Summaries
Generated on ${new Date().toISOString().split("T")[0]}

These one-page executive summaries provide a quick overview of each persona's key characteristics, goals, and challenges.

## Personas
${personas.map((p) => `- [${p.personaName}](${p.personaName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.md) - ${p.title} (${p.percentageOfTotal}% of profiles)`).join("\n")}
`;
    fs.writeFileSync(summaryIndexPath, summaryIndexContent);
    console.log(`[AGENT] Created executive summary index at ${summaryIndexPath}`);

    // Create index for full profiles
    const fullOutputDir = path.join(baseOutputDir, "full-profile");
    const fullIndexPath = path.join(fullOutputDir, "README.md");
    const fullIndexContent = `# Persona Full Profiles
Generated on ${new Date().toISOString().split("T")[0]}

These comprehensive profiles provide detailed information about each persona, including their values, motivations, challenges, emotional profile, and information ecosystem.

## Personas
${personas.map((p) => `- [${p.personaName}](${p.personaName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.md) - ${p.title} (${p.percentageOfTotal}% of profiles)`).join("\n")}
`;
    fs.writeFileSync(fullIndexPath, fullIndexContent);
    console.log(`[AGENT] Created full profile index at ${fullIndexPath}`);
}

/**
 * Main function to run the persona agent
 */
export async function generatePersonas(
    profiles: Record<string, unknown>[],
    model: AIModel
): Promise<FullPersonaCluster[]> {
    try {
        console.log("[AGENT] Starting persona agent process");

        // Step 1: Load normalized profiles
        console.log("[AGENT] Step 1: Loading normalized profiles");
        const profiles = await loadNormalizedProfiles();
        console.log(`[AGENT] Loaded ${profiles.length} normalized profiles`);

        // Step 2: Create basic persona clusters
        console.log("[AGENT] Step 2: Creating basic persona clusters");
        const basicClusters = await createBasicPersonaClusters(profiles, model);
        console.log(
            `[AGENT] Created ${basicClusters.clusters.length} basic persona clusters`,
        );

        // Step 3: Elaborate each basic persona
        console.log("[AGENT] Step 3: Elaborating personas");
        const elaboratedPersonas = await Promise.all(
            basicClusters.clusters.map((cluster) => elaboratePersona(cluster, model)),
        );

        console.log(
            `[AGENT] Successfully elaborated ${elaboratedPersonas.length} personas`,
        );

        // Save all elaborated personas together
        const outputDir = path.join(process.cwd(), "data", "personas");
        fs.mkdirSync(outputDir, { recursive: true });
        const outputPath = path.join(
            outputDir,
            `elaborated_personas_${new Date().toISOString().split("T")[0]}.json`,
        );
        fs.writeFileSync(
            outputPath,
            JSON.stringify(
                {
                    personas: elaboratedPersonas,
                    analysis: basicClusters.analysis,
                    totalProfiles: basicClusters.totalProfiles,
                    date: new Date().toISOString().split("T")[0],
                },
                null,
                2,
            ),
        );

        // Step 4: Create executive summaries
        console.log("[AGENT] Step 4: Creating executive summaries");
        for (const persona of elaboratedPersonas) {
            await createExecutiveSummary(persona, model);
        }

        // Step 5: Create full profiles
        console.log("[AGENT] Step 5: Creating full profiles");
        for (const persona of elaboratedPersonas) {
            await createFullProfile(persona, model);
        }

        // Step 6: Create summary report
        console.log("[AGENT] Step 6: Creating summary report");
        await createSummaryReport(elaboratedPersonas, model);

        // Create index files
        createIndexFiles(elaboratedPersonas);

        console.log("\n[AGENT] Persona agent process completed successfully!");
        console.log(`[AGENT] Created ${elaboratedPersonas.length} personas`);
        console.log(
            `[AGENT] Location: ${path.join(process.cwd(), "data", "personas")}`,
        );

        return elaboratedPersonas;
    } catch (error) {
        console.error("[AGENT] Error in persona agent process:", error);
        process.exit(1);
    }
}