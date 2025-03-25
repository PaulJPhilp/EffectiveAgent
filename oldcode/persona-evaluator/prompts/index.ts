/**
 * Prompt template management for persona generation
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
function getTemplatePath(templateId: string): string {
  return path.join(__dirname, 'templates', `${templateId}.txt`)
}

/**
 * Loads a prompt template from file
 */
function loadTemplate(templateId: string): string {
  // Return from cache if available
  if (templateCache[templateId]) {
    return templateCache[templateId]
  }

  const templatePath = getTemplatePath(templateId)

  try {
    const template = fs.readFileSync(templatePath, 'utf8')
    templateCache[templateId] = template
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
export function getPrompt(templateId: string, values: Record<string, string | number | boolean | object> = {}): string {
  const template = loadTemplate(templateId)
  return fillTemplate(template, values)
}

/**
 * Available prompt templates - aligned with task names in model registry
 */
export const PromptTemplates = {
  // Task-aligned templates
  CLUSTERING: 'clustering',
  ELABORATION: 'elaboration',
  EVALUATION: 'evaluation',
  SUMMARIZATION: 'summarization',

  // Legacy template names (for backward compatibility)
  BASIC_CLUSTERING: 'basic-clustering',
  PERSONA_ELABORATION: 'persona-elaboration',
  EXECUTIVE_SUMMARY: 'executive-summary',
  FULL_PROFILE: 'full-profile',
  SUMMARY_REPORT: 'summary-report',
  EVALUATING_PERSONA: 'eval-persona'
} as const

// Type for template IDs
export type PromptTemplateId = typeof PromptTemplates[keyof typeof PromptTemplates]

/**
 * Initialize prompt templates with default content if files don't exist
 */
export function initializePromptTemplates(): void {
  const templatesDir = path.join(__dirname, 'templates')

  // Create templates directory if it doesn't exist
  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true })
  }

  // Default template content
  const templates: Record<string, string> = {
    // Task-aligned templates
    [PromptTemplates.CLUSTERING]: `# Clustering Prompt
You are a marketing persona specialist. Your task is to analyze a set of normalized profiles and create basic persona clusters.

## Normalized Profiles
There are {{normalizedProfilesCount}} normalized profiles to analyze:

{{normalizedProfilesData}}

## Task
Analyze these profiles and create 3-7 distinct persona clusters. Each cluster should represent a meaningful segment of the audience.

For each cluster:
1. Identify common patterns in demographics, behaviors, and attitudes
2. Create a descriptive title that captures the essence of the cluster
3. Write a brief description of the cluster
4. List key characteristics that define this cluster
5. Include representative quotes that illustrate the cluster's perspective

## Output Format
Provide your clusters as a valid JSON object with this structure:
{
  "clusters": [
    {
      "title": "Descriptive Cluster Title",
      "description": "Brief description of this persona cluster",
      "characteristics": [
        "Key characteristic 1",
        "Key characteristic 2",
        "Key characteristic 3"
      ],
      "representativeQuotes": [
        "Quote that illustrates this persona's perspective",
        "Another representative quote"
      ],
      "profileIds": [1, 5, 8]
    }
  ],
  "analysis": "Brief analysis of the clustering results"
}

Ensure each cluster is distinct and represents a meaningful segment of the audience.`,

    [PromptTemplates.ELABORATION]: `# Elaboration Prompt
You are a marketing persona specialist. Your task is to expand a basic persona cluster into a detailed individual persona.

## Basic Persona Data
{{basicPersonaData}}

## Task
Transform this cluster into a single, detailed fictional persona that represents this segment. Give the persona:
1. A memorable alliterative name (like "Marketing Mary" or "Technical Tom")
2. Detailed professional and personal attributes
3. Clear goals and challenges
4. A realistic emotional profile

## Output Format
Provide your elaborated persona as a valid JSON object with this structure:
{
  "personaName": "Alliterative Name",
  "title": "Professional Title",
  "demographics": {
    "age": "Age range",
    "gender": "Gender",
    "education": "Highest level of education",
    "location": "Geographic location",
    "income": "Income range"
  },
  "description": {
    "role": "Detailed description of professional role and responsibilities",
    "impact": "How their work impacts their organization",
    "workStyle": "Description of how they approach their work"
  },
  "values": [
    {
      "name": "Value Name",
      "description": "Detailed description of why this value matters to them"
    }
  ],
  "motivations": [
    {
      "name": "Motivation Name",
      "description": "Detailed description of this motivation"
    }
  ],
  "goals": [
    {
      "name": "Goal Name",
      "description": "Detailed description of this goal",
      "timeline": "Short/Medium/Long term",
      "obstacles": ["Obstacle 1", "Obstacle 2"]
    }
  ],
  "challenges": [
    {
      "name": "Challenge Name",
      "description": "Detailed description of this challenge",
      "impact": "How this challenge affects them",
      "currentSolutions": ["Current Solution 1", "Current Solution 2"]
    }
  ],
  "emotionalProfile": {
    "primaryEmotions": ["Emotion 1", "Emotion 2"],
    "stressors": ["Stressor 1", "Stressor 2"],
    "reliefs": ["Relief 1", "Relief 2"],
    "communicationStyle": "Description of communication style"
  },
  "successMetrics": [
    {
      "name": "Metric Name",
      "description": "How they measure success",
      "importance": "High/Medium/Low"
    }
  ],
  "informationEcosystem": {
    "preferredResources": ["Resource 1", "Resource 2"],
    "influencers": ["Influencer 1", "Influencer 2"],
    "organizations": ["Organization 1", "Organization 2"],
    "publications": ["Publication 1", "Publication 2"],
    "communities": ["Community 1", "Community 2"]
  },
  "skills": ["Skill 1", "Skill 2", "Skill 3"],
  "background": "Detailed educational and career background"
}`,

    [PromptTemplates.EVALUATION]: `# Evaluation Prompt
You are a marketing persona specialist. Your task is to evaluate the quality and usefulness of a persona.

## Persona Data
{{personaData}}

## Evaluation Criteria
Evaluate this persona on the following criteria:
1. Completeness: Does the persona have all necessary information?
2. Coherence: Are the persona's attributes consistent with each other?
3. Specificity: Is the persona specific enough to be useful?
4. Realism: Does the persona feel like a real person?
5. Actionability: Can marketers use this persona to make decisions?

## Output Format
Provide your evaluation as a valid JSON object with this structure:
{
  "answer": "yes" or "no",
  "score": {
    "completeness": 1-10,
    "coherence": 1-10,
    "specificity": 1-10,
    "realism": 1-10,
    "actionability": 1-10,
    "overall": 1-10
  },
  "strengths": [
    "Strength 1",
    "Strength 2"
  ],
  "weaknesses": [
    "Weakness 1",
    "Weakness 2"
  ],
  "recommendation": "Your recommendation for improving this persona",
  "explanation": "Detailed explanation of your evaluation"
}`,

    [PromptTemplates.SUMMARIZATION]: `# Summarization Prompt
You are a marketing persona specialist. Your task is to create both an executive summary and a full profile for a marketing persona.

## Persona Data
{{personaData}}

## Task
Create two different outputs for this persona:
1. An executive summary that highlights the most important aspects (for busy executives)
2. A comprehensive profile that provides all details (for marketing teams)

## Executive Summary Format
Provide a markdown executive summary that highlights the most important aspects:

# {{personaName}} - Executive Summary

## Basic Information
- **Role**: {{personaTitle}}
- **Demographics**: [Key demographics]

## Top Values
[List 3-5 core values with brief explanations]

## Key Motivations
[List 3-4 primary motivations with brief descriptions]

## Personality Traits
[List 5-6 defining personality traits]

## Goals
[List 3-4 main goals with timelines]

## Challenges
[List 3-4 significant challenges they face]

## Success Metrics
[List how they measure success]

## Full Profile Format
Provide a detailed markdown profile that fully describes this persona:

# {{personaName}} - Full Profile

## Professional Role
[Detailed description of their role, responsibilities, and impact]

## Core Values
[Detailed explanation of 3-5 core values with examples of how they manifest]

## Key Motivations
[Comprehensive analysis of what drives them professionally and personally]

## Personality & Working Style
[In-depth description of personality traits, communication preferences, and work approach]

## Goals
[Detailed description of short, medium, and long-term goals with obstacles]

## Challenges
[Thorough analysis of professional challenges, their impact, and current solutions]

## Emotional Profile
[Analysis of emotional state, stressors, coping mechanisms, and communication style]

## Success Metrics
[Detailed explanation of how they measure success and why these metrics matter]

## Information Ecosystem
[Comprehensive overview of their information sources, influencers, and communities]

## Background & Skills
[Detailed educational and career background with key skills and expertise areas]

The profile should provide deep insights into this persona, written in a narrative style that brings them to life as a three-dimensional individual.`,

    // Legacy templates (for backward compatibility)
    [PromptTemplates.BASIC_CLUSTERING]: `# Basic Clustering Prompt
You are a marketing persona specialist. Your task is to analyze a set of normalized profiles and create basic persona clusters.

## Normalized Profiles
There are {{normalizedProfilesCount}} normalized profiles to analyze:

{{normalizedProfilesData}}

## Task
Analyze these profiles and create 3-7 distinct persona clusters. Each cluster should represent a meaningful segment of the audience.

For each cluster:
1. Identify common patterns in demographics, behaviors, and attitudes
2. Create a descriptive title that captures the essence of the cluster
3. Write a brief description of the cluster
4. List key characteristics that define this cluster
5. Include representative quotes that illustrate the cluster's perspective

## Output Format
Provide your clusters as a valid JSON object with this structure:
{
  "clusters": [
    {
      "title": "Descriptive Cluster Title",
      "description": "Brief description of this persona cluster",
      "characteristics": [
        "Key characteristic 1",
        "Key characteristic 2",
        "Key characteristic 3"
      ],
      "representativeQuotes": [
        "Quote that illustrates this persona's perspective",
        "Another representative quote"
      ],
      "profileIds": [1, 5, 8]
    }
  ],
  "analysis": "Brief analysis of the clustering results"
}

Ensure each cluster is distinct and represents a meaningful segment of the audience.`,

    // ... other legacy templates
  }

  // Write default templates to files if they don't exist
  for (const [id, content] of Object.entries(templates)) {
    const templatePath = getTemplatePath(id)
    if (!fs.existsSync(templatePath)) {
      fs.writeFileSync(templatePath, content, 'utf8')
      console.log(`Created template: ${id}`)
    }
  }
}

// Initialize templates when this module is imported
try {
  initializePromptTemplates()
} catch (error) {
  console.error('Failed to initialize prompt templates:', error)
} 