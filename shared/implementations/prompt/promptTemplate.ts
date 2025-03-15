import type {
    IPromptTemplateService,
    PromptTemplate,
    PromptVariables,
    SubpromptTemplate
} from "../../interfaces/prompt.js"

export class PromptTemplateService implements IPromptTemplateService {
    private templates: Map<string, PromptTemplate>

    constructor() {
        this.templates = new Map()
        this.registerDefaultTemplates()
    }

    public getTemplate(name: string): PromptTemplate {
        const template = this.templates.get(name)
        if (!template) {
            throw new Error(`Template not found: ${name}`)
        }
        return template
    }

    public buildPrompt(templateName: string, variables: PromptVariables): string {
        const template = this.getTemplate(templateName)

        // Sort subprompts by order
        const sortedSubprompts = [...template.subprompts].sort((a, b) =>
            (a.order ?? 0) - (b.order ?? 0)
        )

        // Build each subprompt
        const builtSubprompts = sortedSubprompts.map(subprompt => {
            try {
                return this.buildSubprompt(subprompt, variables)
            } catch (error) {
                if (subprompt.required) {
                    throw error
                }
                return "" // Skip optional subprompts that fail
            }
        })

        // Combine subprompts
        return builtSubprompts.filter(Boolean).join("\n\n")
    }

    public registerTemplate(template: PromptTemplate): void {
        this.templates.set(template.name, template)
    }

    private buildSubprompt(subprompt: SubpromptTemplate, variables: PromptVariables): string {
        let result = subprompt.template

        // Replace variables in the format {{variableName}}
        const matches = result.match(/\{\{([^}]+)\}\}/g)
        if (!matches) return result

        for (const match of matches) {
            const variableName = match.slice(2, -2).trim()
            const value = this.getVariableValue(variables, variableName)
            if (value === undefined && subprompt.required) {
                throw new Error(`Required variable not provided: ${variableName}`)
            }
            result = result.replace(match, String(value ?? ""))
        }

        return result
    }

    private getVariableValue(variables: PromptVariables, path: string): unknown {
        return path.split(".").reduce<unknown>((obj: unknown, key: string) => {
            if (obj && typeof obj === "object") {
                return (obj as Record<string, unknown>)[key]
            }
            return undefined
        }, variables)
    }

    private registerDefaultTemplates(): void {
        // Personality template
        this.registerTemplate({
            name: "personality",
            description: "Template for generating personality descriptions",
            subprompts: [
                {
                    name: "context",
                    template: "You are creating a personality profile for {{name}}.",
                    required: true,
                    order: 1
                },
                {
                    name: "traits",
                    template: "Key personality traits:\n{{traits}}",
                    required: true,
                    order: 2
                },
                {
                    name: "background",
                    template: "Background information:\n{{background}}",
                    order: 3
                },
                {
                    name: "goals",
                    template: "Goals and aspirations:\n{{goals}}",
                    order: 4
                }
            ],
            systemPrompt: "You are an expert psychologist specializing in personality analysis.",
            temperature: 0.7
        })

        // Clustering template
        this.registerTemplate({
            name: "clustering",
            description: "Template for clustering analysis",
            subprompts: [
                {
                    name: "data",
                    template: "Given the following normalized profiles, create meaningful clusters:\n{{profiles}}",
                    required: true,
                    order: 1
                },
                {
                    name: "instructions",
                    template: "Please analyze these profiles and group them into clusters based on common characteristics, behaviors, and patterns.\nReturn the results as a JSON object with the following structure:\n{\n    \"clusters\": [\n        {\n            \"title\": \"Cluster title\",\n            \"description\": \"Brief description of the cluster\",\n            \"profiles\": [\"profile1\", \"profile2\"],\n            \"characteristics\": [\"trait1\", \"trait2\"]\n        }\n    ],\n    \"analysis\": \"Brief analysis of the clustering results\"\n}",
                    required: true,
                    order: 2
                }
            ],
            systemPrompt: "You are an expert data analyst specializing in user behavior clustering and pattern recognition.",
            temperature: 0.3
        })
    }
} 