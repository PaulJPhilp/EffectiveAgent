import type { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import type { LanguageModelV1 } from "ai";
import type { Document } from "langchain/document";
import { z } from "zod";

// biome-ignore lint/suspicious/noExplicitAny: Catching all errors
export type AnyRecord = Record<string, any>;

export type FileType = "pdf" | "text";
export interface FileGroup {
    pdf: Document[];
    txt: Document[];
}

export interface PdfFileInfo {
    PDFFormatVersion: string;
    IsAcroFormPresent: boolean;
    IsXFAPresent: boolean;
    Title: string;
    Author: string;
    Subject: string;
    Producer: string;
    CreationDate: string;
}

export interface PdfFileMetadata {
    source: string;
    pdf: {
        version: string;
        totalPages: number;
        info: PdfFileInfo;
        metadata: Record<string, string>;
    };
}

export interface PdfFile {
    metadata?: {
        source?: string;
    };
    pageContent?: string;
}

export type MessageType = "user" | "system" | "tool" | "assistent";
export type ShouldContinue = { continue: boolean; reason?: string };

export interface MyState {
    user_id: string;
    message: string;
    email: string;
    data: FileGroup;
    completed: boolean;
    loopStep: number;
    extractionSchema: ExtractionSchema;
    messages: BaseMessage;
    shouldContinue: ShouldContinue;
    pdfCount: number;
    txtCouint: number;
    currentFile: PdfFile;
    activeTasks: number;
    personaClusters: ClusteringResult;
}

export interface DualProfiles {
    pdf?: Record<string, unknown>;
    txt?: Record<string, unknown>;
}

export interface ExtractionSchema
    extends z.ZodObject<Record<string, z.ZodType>> { }

export const MyStateAnnotation = Annotation.Root({
    user_id: Annotation<string>(),
    message: Annotation<string>(),
    email: Annotation<string>(),
    data: Annotation<FileGroup>(),
    completed: Annotation<boolean>(),
    loopStep: Annotation<number>(),
    extractionSchema: Annotation<ExtractionSchema>(),
    messages: Annotation<BaseMessage[]>({
        reducer: messagesStateReducer,
        default: () => [],
    }),
    shouldContinue: Annotation<ShouldContinue>(),
    pdfCount: Annotation<number>(),
    txtCount: Annotation<number>(),
    currentPdfFile: Annotation<PdfFile>(),
    currentTxtFile: Annotation<PdfFile>(),
    profiles: Annotation<Map<string, DualProfiles>>(),
    personaClusters: Annotation<ClusteringResult>(),
});

export interface Duration {
    start_date: string;
    end_date: string | null;
    date_range: string;
}

export interface ContactInformation {
    email: string | null;
    linkedin: string | null;
    company_website: string | null;
}

export interface Certificate {
    status: "Active" | "Expired" | "In Progress";
    name: string;
    issuing_organization: string;
    issue_date: string | null;
    expiration_date: string | null;
    credential_id: string | null;
}

export interface Experience {
    company: string;
    title: string;
    duration: string;
    description: string[];
}

export interface ProfileData extends Record<string, unknown> {
    name: string;
    title: string;
    location: string | null;
    key_skills: string[];
    contact: ContactInformation;
    certificates: Certificate[];
    experience: Experience[];
    sourceFile?: string;
}

// Schema for a single persona cluster
export interface PersonaCluster {
    name: string;
    description: string;
    commonCharacteristics: string[];
    skills: string[];
    typicalBackground: string;
    percentageOfTotal: number;
    representativeProfiles: string[];
}

// Schema for the complete clustering result
export interface ClusteringResult {
    clusters: PersonaCluster[];
    analysis: string;
    totalProfiles: number;
    date: string;
}

/**
 * Basic persona cluster schema
 */
export interface BasicPersona {
    title: string
    description: {
        summary: string
        commonCharacteristics: string[]
        skills: string[]
        typicalBackground: string
    }
    representativeProfiles: Array<{
        id: string
        relevanceScore: number
        matchReasons: string[]
    }>
}

/**
 * Basic clustering result schema
 */
export interface BasicClusteringResult {
    clusters: FullPersona[]
    analysisDate: string
}

/**
 * Full persona schema
 */
export interface ElaboratedPersona {
    personaName: string
    title: string
    demographics: {
        age: string
        gender: string
        education: string
        location: string
        income: string
    }
    description: {
        role: string
        impact: string
        workStyle: string
    }
    values: Array<{
        name: string
        description: string
    }>
    motivations: Array<{
        name: string
        description: string
    }>
    goals: Array<{
        name: string
        description: string
        timeline: 'Short' | 'Medium' | 'Long' | string
        obstacles: string[]
    }>
    challenges: Array<{
        name: string
        description: string
        impact: string
        currentSolutions: string[]
    }>
    emotionalProfile: {
        primaryEmotions: string[]
        stressors: string[]
        reliefs: string[]
        communicationStyle: string
    }
    successMetrics: Array<{
        name: string
        description: string
        importance: 'High' | 'Medium' | 'Low' | string
    }>
    informationEcosystem: {
        preferredResources: string[]
        influencers: string[]
        organizations: string[]
        publications: string[]
        communities: string[]
    }
    skills: string[]
    background: string
}

/**
 * Elaborated personas result schema
 */
export interface ElaboratedPersonasResult {
    personas: ElaboratedPersona[]
    analysisDate: string
}

/**
 * Options for persona generation
 */
export interface PersonaGenerationOptions {
    model: string
    outputDir?: string
    description?: string
}

/**
 * Result of persona generation
 */
export interface PersonaGenerationResult {
    runId: string
    outputDir: string
    personaCount: number
    personas: Array<{
        name: string
        title: string
    }>
}


// Run configuration to track run-specific information
export interface RunConfig {
    runId: string;
    startTime: Date;
    model: LanguageModelV1;
    description?: string;
    outputDir: string;
}

// Types for our different persona stages

// Step 1: Basic Persona Cluster Schema (just for clustering)
const BasicPersonaSchema = z.object({
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
const FullPersonaSchema = z.object({
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
    clusters: z.array(BasicPersonaSchema),
    analysis: z.string().describe("Overall analysis of the clustering results"),
    totalProfiles: z.number().describe("Total number of profiles analyzed"),
    date: z.string().describe("Date when clustering was performed"),
});

const ElaboratedPersonasSchema = z.object({
    personas: z.array(FullPersonaSchema),
    analysis: z.string().describe("Overall analysis of the personas"),
    totalProfiles: z.number().describe("Total number of profiles analyzed"),
    date: z.string().describe("Date when personas were created"),
});


export type FullPersona = z.infer<typeof FullPersonaSchema>;
type ElaboratedPersonas = z.infer<typeof ElaboratedPersonasSchema>;
export type NormalizedProfile = Record<string, unknown>;

export interface Evaluation {
    answer: "yes" | "no",
    recommendation: string
}

/**
 * Define the state for our persona agent graph
 */
export interface ClusteringState {
    runInfo: RunConfig;
    normalizedProfiles: NormalizedProfile[];
    basicClusters: BasicClusteringResult;
    currentClusterIndex: number,
    currentPersona: Partial<FullPersona>,
    elaboratedPersonas?: Partial<ElaboratedPersona>[],
    error: string;
    status: string;
    completedSteps: string[];
    logs: string[];
    recommendations: string[];
    errorCount: number;
}

export interface EvaluationState {
    runInfo: RunConfig;
    currentPersona: Partial<FullPersona>;
    elaboratedPersona: Partial<ElaboratedPersona>,
    evaluation: Partial<Evaluation>,
    executiveSummary: string;
    fullProfile: string;
    summaryReport: string;
    error: string;
    status: string;
    completedSteps: string[];
    logs: string[];
    recommendations: string[];
    errorCount: number;
    elaborationCount?: number;
}