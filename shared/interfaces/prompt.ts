/**
 * Template variables for prompt construction
 */
export interface PromptVariables {
    [key: string]: unknown
}

/**
 * Subprompt template definition
 */
export interface SubpromptTemplate {
    name: string
    template: string
    required?: boolean
    order?: number
}

/**
 * Full prompt template combining multiple subprompts
 */
export interface PromptTemplate {
    name: string
    description: string
    subprompts: SubpromptTemplate[]
    systemPrompt?: string
    temperature?: number
}

/**
 * Interface for prompt template service
 */
export interface IPromptTemplateService {
    getTemplate(name: string): PromptTemplate
    buildPrompt(templateName: string, variables: PromptVariables): string
    registerTemplate(template: PromptTemplate): void
} 