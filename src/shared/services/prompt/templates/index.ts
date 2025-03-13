export interface PromptTemplate {
    name: string
    content: string
    variables: string[]
}

export const templates: Record<string, PromptTemplate> = {} 