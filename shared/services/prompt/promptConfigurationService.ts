import fs from 'node:fs';
import path from 'node:path';
import { Liquid } from 'liquidjs';
import { ConfigLoader } from '../configuration/configLoader';
import type { Prompt, Prompts } from '../configuration/schemas/promptSchemas';
import type { PromptConfig, SubpromptDefinition } from '../configuration/types/promptConfig';

/**
 * Error thrown by prompt-related operations
 */
export class PromptError extends Error {
    readonly code: string;
    readonly templateName?: string;
    readonly taskName?: string;

    constructor(message: string, details: {
        readonly templateName?: string;
        readonly taskName?: string;
    }) {
        super(message);
        this.name = 'PromptError';
        this.code = 'PROMPT_ERROR';
        this.templateName = details.templateName;
        this.taskName = details.taskName;
    }
}

/**
 * Service for loading and managing prompt configurations
 */
export class PromptConfigurationService {
    readonly debug: boolean = false;
    private readonly configLoader: ConfigLoader;
    private prompts?: Prompts;

    /**
     * Create a new PromptConfigurationService
     * @param configPath Path to the configuration directory
     */
    constructor(configPath: string) {
        if (this.debug) {
            console.log(`[PromptConfigurationService] Initializing with path: ${configPath}`);
        }
        this.configLoader = new ConfigLoader({ basePath: configPath });
    }

    /**
     * Load prompt configurations
     * @param filename Optional filename (default: 'prompts.json')
     */
    async loadPromptConfigurations(filename = 'prompts.json'): Promise<Prompts> {
        if (this.debug) {
            console.log(`[PromptConfigurationService] Loading prompt configurations from: ${filename}`);
        }
        try {
            this.prompts = await this.configLoader.loadPromptsConfig(filename);
            return this.prompts;
        } catch (error) {
            throw new PromptError(
                `Failed to load prompt configurations: ${error.message}`,
                {}
            );
        }
    }

    /**
     * Get a prompt template by name
     * @param templateName The name of the template
     * @returns The prompt template
     */
    getPromptTemplate(templateName: string): PromptConfig {
        if (!this.prompts) {
            throw new PromptError(
                'Prompt configurations not loaded',
                { templateName }
            );
        }

        const template = this.prompts[templateName];
        if (!template) {
            throw new PromptError(
                `Prompt template not found: ${templateName}`,
                { templateName }
            );
        }

        return template;
    }

    /**
     * Get all available prompt templates
     * @returns Array of prompt templates
     */
    getAllPromptTemplates(): PromptConfig[] {
        if (!this.prompts) {
            throw new PromptError(
                'Prompt configurations not loaded',
                {}
            );
        }

        return Object.values(this.prompts);
    }

    /**
     * Build a prompt from a template with variables
     * @param templateName The name of the template to use
     * @param variables Variables to use in template rendering
     * @returns The rendered prompt
     */
    async buildPrompt(templateName: string, variables: Record<string, unknown> = {}): Promise<string> {
        if (this.debug) {
            console.log(`[PromptConfigurationService] Building prompt for template: ${templateName}`);
            console.log(`[PromptConfigurationService] Variables: ${JSON.stringify(variables)}`);
        }

        const template = this.getPromptTemplate(templateName);
        if (!template.systemPrompt.promptTemplate) {
            throw new PromptError(
                'Template has no prompt content',
                { templateName }
            );
        }

        const liquid = new Liquid();
        const mainPrompt = await liquid.parseAndRender(template.systemPrompt.promptTemplate, variables);

        if (!template.subprompts?.length) {
            return mainPrompt;
        }

        // Process subprompts if they exist
        const sortedSubprompts = this.getSortedSubprompts(template);
        const renderedSubprompts = await this.renderSubprompts(sortedSubprompts, variables);

        // Return the rendered prompt with subprompts
        return this.combinePromptWithSubprompts(mainPrompt, renderedSubprompts);
    }

    /**
     * Clear the configuration cache
     */
    clearCache(): void {
        this.prompts = undefined;
    }

    /**
     * Get subprompts sorted by their order
     */
    private getSortedSubprompts(template: PromptConfig): SubpromptDefinition[] {
        if (!template.subprompts) {
            return [];
        }

        return [...template.subprompts].sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    /**
     * Render all subprompts with variables
     */
    private async renderSubprompts(
        subprompts: SubpromptDefinition[], 
        variables: Record<string, unknown>
    ): Promise<string[]> {
        const liquid = new Liquid();
        const results: string[] = [];

        for (const subprompt of subprompts) {
            if (!subprompt.promptTemplate) {
                if (subprompt.required) {
                    throw new PromptError(
                        'Required subprompt has no content',
                        {}
                    );
                }
                // Skip optional subprompts with no content
                continue;
            }

            try {
                const rendered = await liquid.parseAndRender(subprompt.promptTemplate, variables);
                results.push(rendered);
            } catch (error) {
                if (subprompt.required) {
                    throw new PromptError(
                        `Failed to render required subprompt: ${error.message}`,
                        {}
                    );
                }
                // Skip optional subprompts that fail to render
            }
        }

        return results;
    }

    /**
     * Combine the main prompt with rendered subprompts
     */
    private combinePromptWithSubprompts(mainPrompt: string, subprompts: string[]): string {
        if (!subprompts.length) {
            return mainPrompt;
        }

        // Replace {{index}} placeholders or append subprompts
        let result = mainPrompt;
        const placeholderRegex = /\{\{(\d+)\}\}/g;
        const hasPlaceholders = placeholderRegex.test(mainPrompt);

        if (hasPlaceholders) {
            // Reset regex internal state
            placeholderRegex.lastIndex = 0;
            result = mainPrompt.replace(placeholderRegex, (_, index) => {
                const idx =Number. parseInt(index, 10);
                return idx < subprompts.length ? subprompts[idx] : '';
            });
        } else {
            // If no placeholders, just append subprompts
            result = [mainPrompt, ...subprompts].join('\n\n');
        }

        return result;
    }
}
