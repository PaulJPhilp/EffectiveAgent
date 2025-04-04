/**
 * Input for the persona evaluator agent
 */
export interface EvaluatorInput {
    readonly inputDir: string
    readonly outputDir: string
}

/**
 * Output from the persona evaluator agent
 */
export interface EvaluatorOutput {
    readonly evaluation: Evaluation
    readonly executiveSummary: string
    readonly fullProfile: string
    readonly summaryReport: string
    readonly summary: EvaluationSummary
}

/**
 * Domain state for the persona evaluator agent
 */
export interface EvaluatorDomainState {
    readonly inputPersona: Partial<FullPersona>
    readonly elaboratedPersona: Partial<ElaboratedPersona>
    readonly evaluation: Partial<Evaluation>
    readonly executiveSummary: string
    readonly fullProfile: string
    readonly summaryReport: string
    readonly elaborationCount: number
}

/**
 * Summary of the evaluation process
 */
export interface EvaluationSummary {
    readonly totalElaborations: number
    readonly finalEvaluation: string
    readonly completedAt: string
}

/**
 * Evaluation result
 */
export interface Evaluation {
    readonly answer: 'yes' | 'no'
    readonly recommendation: string
}

/**
 * Basic persona cluster schema
 */
export interface BasicPersona {
    readonly title: string
    readonly description: {
        readonly summary: string
        readonly commonCharacteristics: string[]
        readonly skills: string[]
        readonly typicalBackground: string
    }
    readonly representativeProfiles: Array<{
        readonly id: string
        readonly relevanceScore: number
        readonly matchReasons: string[]
    }>
}

/**
 * Full persona schema
 */
export interface FullPersona {
    readonly personaName: string
    readonly title: string
    readonly description: {
        readonly role: string
        readonly values: string[]
        readonly motivations: string[]
        readonly impact: string
        readonly goals: Array<{
            readonly timeframe: string
            readonly goal: string
            readonly type: 'career_advancement' | 'certification' | 'skill_development' | 'business_impact' | 'leadership'
        }>
        readonly challenges: Array<{
            readonly challenge: string
            readonly impact: string
            readonly type: 'resource_management' | 'technical' | 'organizational' | 'market_related' | 'skill_related' | 'measurement'
        }>
        readonly problems: Array<{
            readonly problem: string
            readonly frequency: 'daily' | 'weekly' | 'monthly'
            readonly severity: 'low' | 'medium' | 'high'
        }>
        readonly emotions: {
            readonly dominant: string[]
            readonly triggers: string[]
            readonly fears: string[]
        }
        readonly successMetrics: Array<{
            readonly metric: string
            readonly importance: 'critical' | 'high' | 'medium'
            readonly measurement: string
        }>
        readonly informationEcosystem: {
            readonly influencers: Array<{
                readonly name: string
                readonly platform: string
                readonly reason: string
            }>
            readonly mediaSources: Array<{
                readonly source: string
                readonly type: 'industry_publication' | 'podcast' | 'newsletter' | 'blog' | 'social_media' | 'research_report'
                readonly frequency: 'daily' | 'weekly' | 'monthly'
            }>
            readonly conferences: Array<{
                readonly name: string
                readonly focus: string
                readonly attendance: 'regular' | 'occasional' | 'aspiring'
            }>
        }>
    }
    readonly personalityProfile: string
    readonly commonCharacteristics: string[]
    readonly skills: string[]
    readonly typicalBackground: string
    readonly percentageOfTotal: number
    readonly representativeProfiles: string[]
    readonly estimatedAge: {
        readonly range: string
        readonly average: number
        readonly explanation: string
}
}

/**
 * Elaborated persona schema
 */
export interface ElaboratedPersona {
    readonly personaName: string
    readonly title: string
    readonly demographics: {
        readonly age: string
        readonly gender: string
        readonly education: string
        readonly location: string
        readonly income: string
    }
    readonly description: {
        readonly role: string
        readonly impact: string
        readonly workStyle: string
    }
    readonly values: Array<{
        readonly name: string
        readonly description: string
    }>
    readonly motivations: Array<{
        readonly name: string
        readonly description: string
    }>
    readonly goals: Array<{
        readonly name: string
        readonly description: string
        readonly timeline: 'Short' | 'Medium' | 'Long' | string
        readonly obstacles: string[]
    }>
    readonly challenges: Array<{
        readonly name: string
        readonly description: string
        readonly impact: string
        readonly currentSolutions: string[]
    }>
    readonly emotionalProfile: {
        readonly primaryEmotions: string[]
        readonly stressors: string[]
        readonly reliefs: string[]
        readonly communicationStyle: string
    }
    readonly successMetrics: Array<{
        readonly name: string
        readonly description: string
        readonly importance: 'High' | 'Medium' | 'Low' | string
    }>
    readonly informationEcosystem: {
        readonly preferredResources: string[]
        readonly influencers: string[]
        readonly organizations: string[]
        readonly publications: string[]
        readonly communities: string[]
    }
    readonly skills: string[]
    readonly background: string
} 