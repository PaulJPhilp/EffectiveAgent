import { Liquid } from 'liquidjs'
import {
    PromptNotFoundError,
    PromptRenderingError,
    PromptServiceError,
    PromptVariableMissingError
} from './errors.js'
import { PromptConfigurationService } from './promptConfigurationService.js'
import type {
    IPromptService,
    PromptOptions,
    PromptServiceConfig,
    PromptTemplate,
    PromptVariables,
    TemplateIdentifier
} from './types.js'

/**
 * Service for managing and generating prompts
 * 
 * The PromptService is responsible for:
 * - Loading prompt templates from configuration
 * - Rendering templates with variables
 * - Validating variable presence
 * - Generating complete prompts with optional system prompts
 */
export class PromptService implements IPromptService {
    private readonly debug: boolean
    private readonly configService: PromptConfigurationService
    private readonly liquid: Liquid

    /**
     * Creates a new PromptService instance
     * 
     * @param config - Configuration parameters for the PromptService
     * @throws PromptServiceError if initialization fails
     */
    constructor(config: PromptServiceConfig) {
        this.debug = config.debug ?? false

        try {
            // Initialize configuration service
            this.configService = new PromptConfigurationService({
                configPath: config.configPath,
                environment: config.environment ?? 'development',
                basePath: config.basePath ?? process.cwd()
            })

            // Load the configuration file
            const loadedConfig = this.configService.loadConfig(config.configPath)

            // Initialize template engine
            this.liquid = new Liquid()

            if (this.debug) {
                console.log('[PromptService] Initialized with config path:', config.configPath)
                console.log(`[PromptService] Loaded ${loadedConfig.prompts.length} prompt templates`)
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error(`[PromptService] Initialization failed: ${errorMessage}`)
            throw new PromptServiceError(errorMessage, error instanceof Error ? error : undefined)
        }
    }

    /**
     * Retrieves a prompt template by its identifier
     * 
     * @param identifier - The template identifier containing template name
     * @returns The prompt template
     * @throws PromptNotFoundError if the template doesn't exist
     */
    getTemplate(identifier: TemplateIdentifier): PromptTemplate {
        const { templateName } = identifier
        try {
            return this.configService.getPrompt(templateName)
        } catch (error) {
            throw new PromptNotFoundError(templateName)
        }
    }

    /**
     * Gets all available template identifiers
     * 
     * @returns Array of template IDs
     */
    getTemplateIds(): string[] {
        return this.configService.getPromptIds()
    }

    /**
     * Validates if all required variables are present in the provided variables object
     * 
     * @param template - The prompt template to validate against
     * @param variables - The variables to validate
     * @returns true if all required variables are present, false otherwise
     */
    validateVariables(
        template: PromptTemplate,
        variables: PromptVariables
    ): boolean {
        if (!template.variables || template.variables.length === 0) {
            return true
        }

        return template.variables.every(variable =>
            Object.prototype.hasOwnProperty.call(variables, variable)
        )
    }

    /**
     * Gets missing variables from a template
     * 
     * @param template - The prompt template to check
     * @param variables - The provided variables
     * @returns Array of missing variable names
     */
    private getMissingVariables(
        template: PromptTemplate,
        variables: PromptVariables
    ): string[] {
        if (!template.variables || template.variables.length === 0) {
            return []
        }

        return template.variables.filter(
            variable => !Object.prototype.hasOwnProperty.call(variables, variable)
        )
    }

    /**
     * Generates a complete prompt by rendering the template with variables
     * 
     * @param identifier - The template identifier
     * @param variables - Variables to render into the template
     * @param options - Optional configuration for prompt generation
     * @returns A promise resolving to the generated prompt string
     * @throws PromptNotFoundError if the template doesn't exist
     * @throws PromptVariableMissingError if required variables are missing
     * @throws PromptRenderingError if rendering fails
     */
    async generatePrompt(
        identifier: TemplateIdentifier,
        variables: PromptVariables,
        options?: PromptOptions
    ): Promise<string> {
        if (this.debug) {
            console.log(`[PromptService] Generating prompt for template: ${identifier.templateName}`)
        }

        const template = this.getTemplate(identifier)

        if (!this.validateVariables(template, variables)) {
            const missingVariables = this.getMissingVariables(template, variables)
            throw new PromptVariableMissingError(identifier.templateName, missingVariables)
        }

        try {
            const renderedPrompt = await this.liquid.parseAndRender(template.content, variables)

            // If template has a system prompt, render it too
            if (template.systemPrompt?.promptTemplate && options?.systemPrompt !== undefined) {
                const systemPrompt = await this.liquid.parseAndRender(
                    template.systemPrompt.promptTemplate,
                    variables
                )
                return `${systemPrompt}\n\n${renderedPrompt}`
            }

            return renderedPrompt
        } catch (error) {
            throw new PromptRenderingError(
                identifier.templateName,
                error instanceof Error ? error : new Error(String(error))
            )
        }
    }
} 