import type { NormalizedProfile } from '../../../persona-generator/types.js';
import { ModelSelectionService } from '../../implementations/model/modelSelection.js';
import { PromptTemplateService } from '../../implementations/prompt/promptTemplate.js';
import { TaskRegistryService } from '../../implementations/task/taskRegistry.js';
import { TaskService } from '../../implementations/task/taskService.js';
import type { PromptVariables } from '../../interfaces/prompt.js';
import type { ITaskService } from '../../interfaces/task.js';
import { ProviderFactory } from '../provider/providerFactory.js';

/**
 * Options for prompt generation
 */
export interface PromptOptions {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
}

/**
 * Service for managing and generating prompts
 */
export class PromptService {
    private static instance: PromptService;
    private taskService: ITaskService;
    private templateService: PromptTemplateService;

    private constructor(taskService: ITaskService, templateService: PromptTemplateService) {
        this.taskService = taskService;
        this.templateService = templateService;
    }

    /**
     * Get singleton instance of PromptService
     */
    public static async getInstance(): Promise<PromptService> {
        if (!PromptService.instance) {
            const [providerFactory, models] = await Promise.all([
                ProviderFactory.getInstance(),
                Promise.resolve([])
            ]);

            const modelSelection = new ModelSelectionService(models);
            const taskRegistry = new TaskRegistryService();
            await taskRegistry.loadTaskConfigurations();

            const defaultModel = modelSelection.selectModel({ capabilities: ["text-generation"] });
            const defaultProvider = providerFactory.createProviderForModelId(defaultModel.model.id);

            const taskService = new TaskService(taskRegistry, modelSelection, defaultProvider);
            const templateService = new PromptTemplateService();

            PromptService.instance = new PromptService(taskService, templateService);
        }
        return PromptService.instance;
    }

    /**
     * Generate a prompt from a template
     */
    public async generatePrompt(
        templateName: string,
        variables: PromptVariables,
        options: PromptOptions = {}
    ): Promise<string> {
        const template = this.templateService.getTemplate(templateName);
        const prompt = this.templateService.buildPrompt(templateName, variables);

        return this.completePrompt(templateName, prompt, {
            systemPrompt: options.systemPrompt ?? template.systemPrompt,
            temperature: options.temperature ?? template.temperature,
            maxTokens: options.maxTokens
        });
    }

    /**
     * Complete a prompt using the appropriate model
     */
    public async completePrompt(
        taskName: string,
        prompt: string,
        options: PromptOptions = {}
    ): Promise<string> {
        const result = await this.taskService.executeTask(taskName, {
            prompt,
            systemPrompt: options.systemPrompt,
            temperature: options.temperature,
            maxTokens: options.maxTokens
        });

        return result.result;
    }

    /**
     * Complete clustering task for persona generation
     */
    public async completeClustering(
        profiles: NormalizedProfile[],
        options: PromptOptions = {}
    ): Promise<string> {
        return this.generatePrompt('clustering', {
            profiles: JSON.stringify(profiles, null, 2)
        }, {
            ...options,
            systemPrompt: 'You are an expert data analyst specializing in user behavior clustering and pattern recognition.'
        });
    }
} 