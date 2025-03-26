import { ConfigurationLoader } from '../configuration/configurationLoader.js'
import { ConfigurationService } from '../configuration/configurationService.js'
import { ConfigurationError, type ConfigLoaderOptions, type ValidationResult } from '../configuration/types.js'
import type {
    PromptConfigFile,
    PromptTemplate
} from './schemas/promptConfig.js'
import { PromptConfigFileSchema } from './schemas/promptConfig.js'

/** Prompt configuration options */
interface PromptConfigurationOptions extends ConfigLoaderOptions {
    readonly configPath: string
    readonly environment?: string
}

/** Prompt configuration service */
export class PromptConfigurationService extends ConfigurationService<PromptConfigFile> {
    private readonly loader: ConfigurationLoader
    private promptsMap: Map<string, PromptTemplate> = new Map()

    constructor(options: PromptConfigurationOptions) {
        super({ validateOnLoad: true })
        this.loader = new ConfigurationLoader({
            basePath: '/',
            environment: options.environment,
            validateSchema: true
        })
    }

    /** Load prompt configurations */
    async loadConfigurations(): Promise<void> {
        try {
            const rawConfig = this.loader.loadConfig(
                'prompts.json',
                {
                    schema: PromptConfigFileSchema,
                    required: true
                }
            )
            const parsedConfig = PromptConfigFileSchema.parse(rawConfig)
            this.config = parsedConfig

            // Build the prompts map for quick lookup
            this.buildPromptsMap()
        } catch (error) {
            throw new ConfigurationError({
                name: 'PromptConfigLoadError',
                message: `Failed to load prompt configurations: ${(error as Error).message}`,
                code: 'PROMPT_CONFIG_LOAD_ERROR'
            })
        }
    }

    /** Load prompt configurations synchronously */
    loadConfig(configPath: string): PromptConfigFile {
        try {
            const rawConfig = this.loader.loadConfig(
                configPath,
                {
                    schema: PromptConfigFileSchema,
                    required: true
                }
            )
            const parsedConfig = PromptConfigFileSchema.parse(rawConfig)
            this.config = parsedConfig

            // Build the prompts map for quick lookup
            this.buildPromptsMap()

            return parsedConfig
        } catch (error) {
            throw new ConfigurationError({
                name: 'PromptConfigLoadError',
                message: `Failed to load prompt configurations: ${(error as Error).message}`,
                code: 'PROMPT_CONFIG_LOAD_ERROR'
            })
        }
    }

    /** Get prompt template by ID */
    getPrompt(promptId: string): PromptTemplate {
        const template = this.promptsMap.get(promptId)
        if (!template) {
            throw new ConfigurationError({
                name: 'PromptNotFoundError',
                message: `Prompt template not found for ID: ${promptId}`,
                code: 'PROMPT_NOT_FOUND_ERROR'
            })
        }
        return template
    }

    /** Get all available prompt IDs */
    getPromptIds(): string[] {
        return Array.from(this.promptsMap.keys())
    }

    /** Get all prompts in a specific category */
    getPromptsByCategory(category: string): PromptTemplate[] {
        return Array.from(this.promptsMap.values())
            .filter(prompt => prompt.category === category)
    }

    /** Validate configuration */
    protected validateConfig(
        config: PromptConfigFile
    ): ValidationResult {
        try {
            PromptConfigFileSchema.parse(config)
            return { isValid: true }
        } catch (error) {
            return {
                isValid: false,
                errors: [error instanceof Error ? error.message : String(error)]
            }
        }
    }

    /** Build prompts map from configuration */
    private buildPromptsMap(): void {
        this.promptsMap.clear()

        if (!this.config?.prompts) {
            return
        }

        for (const prompt of this.config.prompts) {
            this.promptsMap.set(prompt.id, prompt)
        }
    }
}
