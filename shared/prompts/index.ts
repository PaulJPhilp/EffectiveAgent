/**
 * Shared prompt template management system
 */
import fs from 'node:fs'
import path from 'node:path'

// Template placeholder regex pattern
const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

// Cache for loaded templates to avoid repeated file reads
const templateCache: Record<string, string> = {}

/**
 * Gets the path to a prompt template file
 */
function getTemplatePath(templateId: string, templateDir?: string): string {
    const baseDir = templateDir || path.join(process.cwd(), 'src', 'shared', 'prompts', 'templates')
    return path.join(baseDir, `${templateId}.txt`)
}

/**
 * Loads a prompt template from file
 */
function loadTemplate(templateId: string, templateDir?: string): string {
    const cacheKey = templateDir ? `${templateDir}:${templateId}` : templateId

    // Return from cache if available
    if (templateCache[cacheKey]) {
        return templateCache[cacheKey]
    }

    const templatePath = getTemplatePath(templateId, templateDir)

    try {
        const template = fs.readFileSync(templatePath, 'utf8')
        templateCache[cacheKey] = template
        return template
    } catch (error) {
        throw new Error(`Failed to load template '${templateId}': ${error}`)
    }
}

/**
 * Fill a template with values
 */
function fillTemplate(template: string, values: Record<string, string | number | boolean | object>): string {
    return template.replace(PLACEHOLDER_PATTERN, (match, key) => {
        if (key in values) {
            return String(values[key])
        }
        return match // Keep placeholder if value not provided
    })
}

/**
 * Get a filled prompt template
 */
export function getPrompt(
    templateId: string,
    values: Record<string, string | number | boolean | object> = {},
    templateDir?: string
): string {
    const template = loadTemplate(templateId, templateDir)
    return fillTemplate(template, values)
}

/**
 * Common task names for use across agents
 */
export const TaskNames = {
    CLUSTERING: 'clustering',
    ELABORATION: 'elaboration',
    EVALUATION: 'evaluation',
    SUMMARIZATION: 'summarization',
    NORMALIZATION: 'normalization',
    EXTRACTION: 'extraction',
    ANALYSIS: 'analysis'
} as const

/**
 * Initialize prompt templates with default content if files don't exist
 */
export function initializePromptTemplates(templateDir?: string): void {
    const templatesDir = templateDir || path.join(process.cwd(), 'src', 'shared', 'prompts', 'templates')

    // Create templates directory if it doesn't exist
    if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true })
    }

    // Default template content for shared tasks
    const templates: Record<string, string> = {
        // Common templates that can be used across agents
        [TaskNames.CLUSTERING]: `# Clustering Prompt
You are a data clustering specialist. Your task is to analyze a set of items and create meaningful clusters.

## Data
{{dataCount}} items to analyze:

{{data}}

## Task
Analyze these items and create distinct clusters. Each cluster should represent a meaningful segment.

For each cluster:
1. Identify common patterns
2. Create a descriptive title
3. Write a brief description
4. List key characteristics

## Output Format
Provide your clusters as a valid JSON object with this structure:
{
  "clusters": [
    {
      "title": "Descriptive Cluster Title",
      "description": "Brief description of this cluster",
      "characteristics": [
        "Key characteristic 1",
        "Key characteristic 2",
        "Key characteristic 3"
      ],
      "itemIds": [1, 5, 8]
    }
  ],
  "analysis": "Brief analysis of the clustering results"
}

Ensure each cluster is distinct and represents a meaningful segment.`,

        [TaskNames.EXTRACTION]: `# Extraction Prompt
You are a data extraction specialist. Your task is to extract structured information from unstructured content.

## Content
{{content}}

## Task
Extract the following information from the content:
{{extractionFields}}

## Output Format
Provide the extracted information as a valid JSON object with this structure:
{
  "extracted": {
    "field1": "value1",
    "field2": "value2",
    ...
  },
  "confidence": 0.95,
  "missingFields": ["field3"]
}

For any fields you cannot extract with confidence, include them in the missingFields array.`,

        [TaskNames.ANALYSIS]: `# Analysis Prompt
You are a data analysis specialist. Your task is to analyze the provided data and extract insights.

## Data
{{data}}

## Task
Analyze this data and provide insights on:
{{analysisRequirements}}

## Output Format
Provide your analysis as a valid JSON object with this structure:
{
  "insights": [
    {
      "title": "Key Insight Title",
      "description": "Detailed description of the insight",
      "evidence": "Data points supporting this insight",
      "confidence": 0.9
    }
  ],
  "summary": "Brief summary of overall analysis",
  "recommendations": [
    "Recommendation 1",
    "Recommendation 2"
  ]
}

Focus on providing actionable insights backed by the data.`
    }

    // Write default templates to files if they don't exist
    for (const [id, content] of Object.entries(templates)) {
        const templatePath = getTemplatePath(id, templatesDir)
        if (!fs.existsSync(templatePath)) {
            fs.writeFileSync(templatePath, content, 'utf8')
            console.log(`Created shared template: ${id}`)
        }
    }
}

// Initialize templates when this module is imported
try {
    initializePromptTemplates()
} catch (error) {
    console.error('Failed to initialize shared prompt templates:', error)
} 