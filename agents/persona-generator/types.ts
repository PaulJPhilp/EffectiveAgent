import { z } from "zod";
import type { BaseConfig } from '../../shared/services/configuration/types/configTypes.js';
import type { EmbeddingModelConfig, TextModelConfig } from '../../shared/services/configuration/types/modelConfig.js';
import type { PromptConfig } from '../../shared/services/configuration/types/promptConfig.js';
import type { ProviderConfig } from '../../shared/services/configuration/types/providerConfig.js';
import type { TaskDefinition } from '../../shared/services/configuration/types/taskConfig.js';

/**
 * Represents the status of a persona generation run
 */
export const PersonaGenerationStatusSchema = z.enum([
    'initializing',
    'loading',
    'loading_profiles',
    'clustering',
    'elaborating',
    'evaluating',
    'saving',
    'completed',
    'error',
]);

export type PersonaGenerationStatus = z.infer<typeof PersonaGenerationStatusSchema>;

export type AnyRecord = Record<string, any>;

/**
 * File type enum
 */
export const FileTypeSchema = z.enum(['pdf', 'text']);
export type FileType = z.infer<typeof FileTypeSchema>;

/**
 * Group of files by type
 */
export const FileGroupSchema = z.object({
    pdf: z.array(z.any()), // TODO: Create proper type for Document
    txt: z.array(z.any()),
});
export type FileGroup = z.infer<typeof FileGroupSchema>;

/**
 * PDF file information
 */
export const PdfFileInfoSchema = z.object({
    PDFFormatVersion: z.string(),
    IsAcroFormPresent: z.boolean(),
    IsXFAPresent: z.boolean(),
    Title: z.string(),
    Author: z.string(),
    Subject: z.string(),
    Producer: z.string(),
    CreationDate: z.string(),
});
export type PdfFileInfo = z.infer<typeof PdfFileInfoSchema>;

/**
 * PDF file metadata
 */
export const PdfFileMetadataSchema = z.object({
    source: z.string(),
    pdf: z.object({
        version: z.string(),
        totalPages: z.number(),
        info: PdfFileInfoSchema,
        metadata: z.record(z.string()),
    }),
});
export type PdfFileMetadata = z.infer<typeof PdfFileMetadataSchema>;

/**
 * PDF file
 */
export const PdfFileSchema = z.object({
    metadata: z.object({
        source: z.string().optional(),
    }).optional(),
    pageContent: z.string().optional(),
});
export type PdfFile = z.infer<typeof PdfFileSchema>;



/**
 * Duration schema for experience dates
 */
export const DurationSchema = z.object({
    start_date: z.string(),
    end_date: z.string().nullable(),
    date_range: z.string(),
});
export type Duration = z.infer<typeof DurationSchema>;

/**
 * Contact information schema
 */
export const ContactInformationSchema = z.object({
    email: z.string().nullable(),
    linkedin: z.string().nullable(),
    company_website: z.string().nullable(),
});
export type ContactInformation = z.infer<typeof ContactInformationSchema>;

/**
 * Certificate schema
 */
export const CertificateSchema = z.object({
    status: z.enum(['Active', 'Expired', 'In Progress']),
    name: z.string(),
    issuing_organization: z.string(),
    issue_date: z.string().nullable(),
    expiration_date: z.string().nullable(),
    credential_id: z.string().nullable(),
});
export type Certificate = z.infer<typeof CertificateSchema>;

/**
 * Experience schema
 */
export const ExperienceSchema = z.object({
    company: z.string(),
    title: z.string(),
    duration: z.string(),
    description: z.array(z.string()),
});
export type Experience = z.infer<typeof ExperienceSchema>;

/**
 * Profile data schema
 */
export const ProfileDataSchema = z.object({
    name: z.string(),
    title: z.string(),
    location: z.string().nullable(),
    key_skills: z.array(z.string()),
    contact: ContactInformationSchema,
    certificates: z.array(CertificateSchema),
    experience: z.array(ExperienceSchema),
    sourceFile: z.string().optional(),
}).and(z.record(z.unknown())); // Allow additional unknown properties

export type ProfileData = z.infer<typeof ProfileDataSchema>;

/**
 * Schema for a single persona cluster
 */
export const PersonaClusterSchema = z.object({
    name: z.string(),
    description: z.string(),
    commonCharacteristics: z.array(z.string()),
    skills: z.array(z.string()),
    typicalBackground: z.string(),
    percentageOfTotal: z.number(),
    representativeProfiles: z.array(z.string()),
});
export type PersonaCluster = z.infer<typeof PersonaClusterSchema>;

/**
 * Schema for the complete clustering result
 */
export const ClusteringResultSchema = z.object({
    clusters: z.array(PersonaClusterSchema),
    analysis: z.string(),
    totalProfiles: z.number(),
    date: z.string(),
});
export type ClusteringResult = z.infer<typeof ClusteringResultSchema>;



/**
 * Full persona schema
 */
export const ElaboratedPersonaSchema = z.object({
    personaName: z.string(),
    title: z.string(),
    demographics: z.object({
        age: z.string(),
        gender: z.string(),
        education: z.string(),
        location: z.string(),
        income: z.string(),
    }),
    description: z.object({
        role: z.string(),
        impact: z.string(),
        workStyle: z.string(),
    }),
    values: z.array(
        z.object({
            name: z.string(),
            description: z.string(),
        })
    ),
    motivations: z.array(
        z.object({
            name: z.string(),
            description: z.string(),
        })
    ),
    goals: z.array(
        z.object({
            name: z.string(),
            description: z.string(),
            timeline: z.enum(['Short', 'Medium', 'Long']).or(z.string()),
            obstacles: z.array(z.string()),
        })
    ),
    challenges: z.array(
        z.object({
            name: z.string(),
            description: z.string(),
            impact: z.string(),
            currentSolutions: z.array(z.string()),
        })
    ),
    emotionalProfile: z.object({
        primaryEmotions: z.array(z.string()),
        stressors: z.array(z.string()),
        reliefs: z.array(z.string()),
        communicationStyle: z.string(),
    }),
    successMetrics: z.array(
        z.object({
            name: z.string(),
            description: z.string(),
            importance: z.enum(['High', 'Medium', 'Low']).or(z.string()),
        })
    ),
    informationEcosystem: z.object({
        preferredResources: z.array(z.string()),
        influencers: z.array(z.string()),
        organizations: z.array(z.string()),
        publications: z.array(z.string()),
        communities: z.array(z.string()),
    }),
    skills: z.array(z.string()),
    background: z.string(),
});
export type ElaboratedPersona = z.infer<typeof ElaboratedPersonaSchema>;

/**
 * Elaborated personas result schema
 */
export const ElaboratedPersonasResultSchema = z.object({
    personas: z.array(ElaboratedPersonaSchema),
    analysisDate: z.string(),
});
export type ElaboratedPersonasResult = z.infer<typeof ElaboratedPersonasResultSchema>;

/**
 * Options for persona generation
 */
export const PersonaGenerationOptionsSchema = z.object({
    model: z.string(),
    outputDir: z.string().optional(),
    description: z.string().optional(),
});
export type PersonaGenerationOptions = z.infer<typeof PersonaGenerationOptionsSchema>;

/**
 * Result of persona generation
 */
export const PersonaGenerationResultSchema = z.object({
    runId: z.string(),
    outputDir: z.string(),
    personaCount: z.number(),
    personas: z.array(
        z.object({
            name: z.string(),
            title: z.string(),
        })
    ),
});
export type PersonaGenerationResult = z.infer<typeof PersonaGenerationResultSchema>;




// Types for our different persona stages

// Step 1: Basic Persona Cluster Schema (just for clustering)
export const BasicPersonaSchema = z.object({
    title: z.string().describe('A descriptive title for this persona cluster'),
    description: z.string().describe('A concise description of this persona type'),
    commonCharacteristics: z.array(z.string()).describe('Key characteristics shared by profiles in this cluster'),
    skills: z.array(z.string()).describe('Common skills found in this cluster'),
    typicalBackground: z.string().describe('Typical educational and professional background'),
    percentageOfTotal: z.number().describe('Approximate percentage of total profiles in this cluster'),
    representativeProfiles: z.array(z.string()).describe('Names of representative profiles in this cluster')
});
export type BasicPersona = z.infer<typeof BasicPersonaSchema>;

// Step 2: Full Persona Schema (for elaboration)
export const FullPersonaSchema = z.object({
    personaName: z.string().describe('Name of the persona'),
    title: z.string().describe('Professional title'),
    description: z.object({
        role: z.string().describe('Professional role'),
        impact: z.string().describe('Impact in organization'),
        workStyle: z.string().describe('Work style and preferences')
    }).describe('Core description'),
    values: z.array(
        z.object({
            name: z.string(),
            description: z.string()
        })
    ).describe('Professional values'),
    motivations: z.array(
        z.object({
            name: z.string(),
            description: z.string()
        })
    ).describe('Career motivations'),
    goals: z.array(
        z.object({
            name: z.string(),
            description: z.string(),
            timeline: z.string(),
            obstacles: z.array(z.string())
        })
    ).describe('Professional goals'),
    skills: z.array(z.string()).describe('Key skills'),
    toolsUsed: z.array(
        z.object({
            name: z.string(),
            proficiency: z.enum(['basic', 'intermediate', 'advanced', 'expert']),
            frequency: z.enum(['daily', 'weekly', 'monthly', 'rarely'])
        })
    ).describe('Tools and technologies'),
    challenges: z.array(
        z.object({
            name: z.string(),
            description: z.string(),
            impact: z.string(),
            currentSolutions: z.array(z.string())
        })
    ).describe('Professional challenges'),
    learningStyle: z.object({
        preferredMethods: z.array(z.string()),
        resources: z.array(z.string()),
        paceOfLearning: z.string()
    }).describe('Learning preferences'),
    background: z.string().describe('Professional background'),
    informationEcosystem: z.object({
        influencers: z.array(
            z.object({
                name: z.string().describe('Name of the influencer or thought leader'),
                platform: z.string().describe(
                    'Platform where they follow this influencer (e.g., LinkedIn, Twitter, industry events)'
                ),
                reason: z.string().describe(
                    'Why this persona follows or values this influencer'
                )
            })
        ).min(3).max(5)
            .describe('3-5 professional influencers or thought leaders this persona follows'),
        mediaSources: z.array(
            z.object({
                source: z.string().describe('Name of the media source or publication'),
                type: z.enum([
                    'industry_publication',
                    'podcast',
                    'newsletter',
                    'blog',
                    'social_media',
                    'research_report'
                ]).describe('Type of media source'),
                frequency: z.enum(['daily', 'weekly', 'monthly'])
                    .describe('How often this persona consumes this media')
            })
        ).min(3).max(5).describe('3-5 trusted media sources this persona regularly consumes'),
        conferences: z.array(
            z.object({
                name: z.string().describe('Name of the conference or industry event'),
                focus: z.string().describe('Main focus or theme of the conference'),
                attendance: z.enum(['regular', 'occasional', 'aspiring'])
                    .describe('How often they attend this conference')
            })
        ).min(0).max(2).describe('0-2 industry conferences or events this persona attends or follows')
    }).describe('Professional information sources and knowledge network'),
    personalityProfile: z.string().describe(
        'A description of the persona\'s professional personality traits and working style'
    ),
    commonCharacteristics: z.array(z.string())
        .describe('Key characteristics shared by profiles in this cluster'),
    typicalBackground: z.string()
        .describe('Typical educational and professional background'),
    percentageOfTotal: z.number()
        .describe('Approximate percentage of total profiles in this cluster'),
    representativeProfiles: z.array(z.string())
        .describe('Names of representative profiles in this cluster'),
    estimatedAge: z.object({
        range: z.string().describe('Age range for this persona (e.g., "25-35")'),
        average: z.number().describe('Estimated average age'),
        explanation: z.string().describe('Brief explanation for the age estimation')
    }).describe('Age estimation for this persona')
});

// Schema for the clustering results and elaborated personas
export const BasicClusteringResultSchema = z.object({
    clusters: z.array(BasicPersonaSchema),
    analysis: z.string().describe('Overall analysis of the clustering results'),
    totalProfiles: z.number().describe('Total number of profiles analyzed'),
    date: z.string().describe('Date when clustering was performed'),
});
export type BasicClusteringResult = z.infer<typeof BasicClusteringResultSchema>;

export const ElaboratedPersonasSchema = z.object({
    personas: z.array(FullPersonaSchema),
    analysis: z.string().describe('Overall analysis of the personas'),
    totalProfiles: z.number().describe('Total number of profiles analyzed'),
    date: z.string().describe('Date when personas were created'),
});


export type FullPersona = z.infer<typeof FullPersonaSchema>;
export type ElaboratedPersonas = z.infer<typeof ElaboratedPersonasSchema>;
export type NormalizedProfile = Record<string, unknown>;

export const EvaluationSchema = z.object({
    answer: z.enum(['yes', 'no']),
    recommendation: z.string()
});
export type Evaluation = z.infer<typeof EvaluationSchema>;

export interface EvaluationState {
    runInfo: RunConfig;
    inputPersona: Partial<FullPersona>;
    elaboratedPersona: Partial<ElaboratedPersona>,
    evaluation: Partial<Evaluation>,
    executiveSummary: string;
    fullProfile: string;
    summaryReport: string;
    error: string;
    status: Array<string>;
    completedSteps: string[];
    logs: string[];
    recommendations: string[];
    errorCount: number;
    elaborationCount?: number;
}

export interface AgentConfig extends BaseConfig {
    readonly description: string;
    readonly rootPath: string;
    readonly agentPath: string;
    readonly inputPath: string;
    readonly outputPath: string;
    readonly logPath: string;
    readonly maxConcurrency: number;
    readonly maxRetries: number;
    readonly retryDelay: number;
    readonly models: {
        readonly text: Record<string, TextModelConfig>;
        readonly embedding: Record<string, EmbeddingModelConfig>;
    };
    readonly configFiles: {
        readonly providers: {
            readonly schema: Record<string, ProviderConfig>;
            readonly path: string;
        };
        readonly models: {
            readonly schema: {
                readonly text: Record<string, TextModelConfig>;
                readonly embedding: Record<string, EmbeddingModelConfig>;
            };
            readonly path: string;
        };
        readonly tasks: {
            readonly schema: TaskDefinition;
            readonly path: string;
        };
        readonly prompts: {
            readonly schema: PromptConfig;
            readonly path: string;
        };
    };
}

export interface ChannelReducer<T> {
    reducer: (a: T, b: T) => T;
}

export const RunConfigSchema = z.object({
    runId: z.string().uuid(),
    startTime: z.string().datetime(),
    outputDir: z.string(),
    inputDir: z.string(),
    description: z.string().optional()
});

export type RunConfig = z.infer<typeof RunConfigSchema>;