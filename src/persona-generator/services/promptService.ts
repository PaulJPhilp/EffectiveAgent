import { getPrompt, PromptTemplates } from "../prompts";
import type { BasicPersona, ElaboratedPersona, NormalizedProfile } from '../types';
import type { ModelCompletionOptions } from "./modelProvider";
import { ModelService } from "./modelService";

/**
 * Service for combining prompt templates with model service
 */
export class PromptService {
    private static instance: PromptService;
    private modelService: ModelService;

    private constructor(modelService: ModelService) {
        this.modelService = modelService;
    }

    /**
     * Get singleton instance of PromptService
     */
    public static async getInstance(): Promise<PromptService> {
        if (!PromptService.instance) {
            const modelService = await ModelService.getInstance();
            PromptService.instance = new PromptService(modelService);
        }
        return PromptService.instance;
    }

    /**
     * Complete a task using the appropriate prompt template and model
     *
     * @param taskName The name of the task (clustering, elaboration, evaluation, summarization)
     * @param templateValues Values to fill in the prompt template
     * @param options Additional model completion options
     */
    public async completeTask(
        taskName: string,
        templateValues: Record<string, string | number | boolean | object> = {},
        options: Partial<ModelCompletionOptions> = {},
    ): Promise<string> {
        // Get the prompt template for this task
        const prompt = getPrompt(taskName, templateValues);

        // Merge options with the prompt
        const completionOptions: ModelCompletionOptions = {
            prompt,
            ...options,
        };

        // Use the model service to complete the task
        const response = await this.modelService.completeWithTaskModel(
            taskName,
            completionOptions,
        );

        return response.text;
    }

    /**
     * Complete clustering task
     */
    public async completeClustering(
        normalizedProfiles: NormalizedProfile[],
        options: Partial<ModelCompletionOptions> = {},
    ): Promise<string> {
        return this.completeTask(
            PromptTemplates.CLUSTERING,
            {
                normalizedProfilesCount: normalizedProfiles.length,
                normalizedProfilesData: JSON.stringify(normalizedProfiles, null, 2),
            },
            {
                systemPrompt:
                    "You are a helpful assistant that clusters personas into groups based on similarities.",
                ...options,
            },
        );
    }

    /**
     * Complete elaboration task
     */
    public async completeElaboration(
        basicPersonaData: BasicPersona,
        options: Partial<ModelCompletionOptions> = {},
    ): Promise<string> {
        return this.completeTask(
            PromptTemplates.ELABORATION,
            {
                basicPersonaData: JSON.stringify(basicPersonaData, null, 2),
            },
            {
                systemPrompt:
                    "You are a helpful assistant that elaborates basic personas into detailed personas.",
                ...options,
            },
        );
    }

    /**
     * Complete evaluation task
     */
    public async completeEvaluation(
        personaData: Partial<ElaboratedPersona>,
        options: Partial<ModelCompletionOptions> = {},
    ): Promise<string> {
        return this.completeTask(
            PromptTemplates.EVALUATION,
            {
                personaData: JSON.stringify(personaData, null, 2),
            },
            {
                systemPrompt:
                    "You are a helpful assistant that evaluates the quality and usefulness of personas.",
                ...options,
            },
        );
    }

    /**
     * Complete summarization task
     */
    public async completeSummarization(
        personaData: ElaboratedPersona,
        personaName: string,
        personaTitle: string,
        options: Partial<ModelCompletionOptions> = {},
    ): Promise<string> {
        return this.completeTask(
            PromptTemplates.SUMMARIZATION,
            {
                personaData: JSON.stringify(personaData, null, 2),
                personaName,
                personaTitle,
            },
            {
                systemPrompt:
                    "You are a helpful assistant that creates executive summaries and full profiles for personas.",
                ...options,
            },
        );
    }
}
