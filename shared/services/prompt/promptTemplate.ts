import fs from 'fs';
import path from 'path';
import type {
    IPromptTemplateService,
    PromptDefinition,
    PromptVariables,
    TemplateIdentifier
} from './types.js';
import { PromptError } from './types.js';
import { PromptDefinitionSchema, type SubpromptDefinition } from './schemas/promptConfig.js';
import { Liquid } from 'liquidjs';

interface PromptTemplateServiceOptions {
    readonly promptPath?: string;
}
/**
 * Service for managing prompt templates and generating prompts
 */
export class PromptTemplateService implements IPromptTemplateService {
    readonly debug: boolean = false;
    private readonly templates: Map<string, PromptDefinition>;

    constructor(options?: PromptTemplateServiceOptions) {
        if (this.debug) {
            console.log(`[PromptTemplateService] Initializing with config path: ${options?.promptPath}`);
        }
        this.templates = new Map();
        this.templates = new Map();
        if (options?.promptPath) {
            this.loadTemplates(path.join(options.promptPath, 'prompts'));
        } else {
            this.loadTemplates(path.join(__dirname, 'prompts'));
        }
        if (this.debug) console.log(`[PromptTemplateService] Loaded ${this.templates.size} templates`);
    }

    private loadTemplates(templateDirPath: string): PromptDefinition[] {
        const templateNames = fs.readdirSync(templateDirPath, 'utf-8').filter(name => name.endsWith('.json')).map(name => name.replace('.json', ''));
        const templates = templateNames.map(templateName => {
            const template = this.loadTemplate(templateDirPath, templateName);
            this.registerTemplate(template);
            return template;
        });
        return templates;
    }

    private loadTemplate(templateDirPath: string, templateName: string): PromptDefinition {
        if (this.debug) {
            console.log(`[PromptTemplateService] Loading template: ${templateName}`);
        }
        const templatePath = path.join(templateDirPath, `${templateName}.json`);
        if (!fs.existsSync(templatePath)) {
            throw new PromptError(
                'Template not found',
                { templateName }
            );
        }
        const templateDef = fs.readFileSync(templatePath, 'utf-8')
        const template = PromptDefinitionSchema.parse(JSON.parse(templateDef));
        const promptPath = path.join(templateDirPath, `${templateName}.prompt`);
        if (fs.existsSync(promptPath)) {
            template.systemPrompt.promptTemplate = fs.readFileSync(promptPath, 'utf-8');
            template.systemPrompt.promptFileName = `${templateName}.prompt`;
        }
        this.registerTemplate(template);
        return template;
    }

    public getTemplate(identifier: TemplateIdentifier): PromptDefinition {
        if (this.debug) {
            console.log(`[PromptTemplateService] Getting template: ${identifier.templateName}`);
            console.log(`[PromptTemplateService] Available templates: ${Array.from(this.templates.keys())}`);
        }
        const template = this.templates.get(identifier.templateName);
        if (!template) {
            throw new PromptError(
                'Template not found',
                { templateName: identifier.templateName }
            );
        }
        if (this.debug) {
            console.log(`[PromptTemplateService] Returning template: ${identifier.templateName}`);
        }
        return template;
    }

    public async buildPrompt(
        identifier: TemplateIdentifier,
        variables: PromptVariables
       ): Promise<string> {
        if (this.debug) {
            console.log(`[PromptTemplateService] Building prompt for template: ${identifier.templateName}`);
            console.log(`[PromptTemplateService] Available variables: ${JSON.stringify(variables, null, 2)}`);
        }
        const template = this.getTemplate(identifier);
        if (template) {
            if (this.debug) {
                console.log(`[PromptTemplateService] Using template: ${JSON.stringify(variables, null, 2)}`);
            }
            const liquid = new Liquid();
            const parsedTemplate = await liquid.parseAndRender(template.systemPrompt?.promptTemplate ?? '', variables);
            if (this.debug) {
                console.log(`[PromptTemplateService] Built prompt: ${parsedTemplate}`);
            }
            return parsedTemplate;
        }
        const sortedSubprompts = this.getSortedSubprompts(template);
        const builtSubprompts = this.buildSubprompts(
            sortedSubprompts,
            variables,
            identifier.templateName
        );
        return this.combineSubprompts(builtSubprompts);
    }

    public registerTemplate(template: PromptDefinition): void {
        this.templates.set(template.name, template);
    }

    private getSortedSubprompts(
        template: PromptDefinition
    ): readonly SubpromptDefinition[] {

        if (!template.subprompts) {
            return [];
        }

        return template.subprompts.sort(
            (a: { order: number; }, b: { order: number; }) => (a.order ?? 0) - (b.order ?? 0)
        );
    }

    private buildSubprompts(
        subprompts: readonly SubpromptDefinition[],
        variables: PromptVariables,
        templateName: string
    ): string[] {
        return subprompts.map(subprompt => {
            try {
                return this.buildSubprompt(subprompt, variables);
            } catch (error) {
                if (subprompt.required) {
                    throw new PromptError(
                        'Failed to build required subprompt',
                        { templateName }
                    );
                }
                return ''; // Skip optional subprompts that fail
            }
        });
    }

    private buildSubprompt(
        subprompt: SubpromptDefinition,
        variables: PromptVariables
    ): string {
        let result = subprompt.promptTemplate;
        if (!result) {
            return '';
        }
        const matches = result.match(/\{\{([^}]+)\}\}/g);
        if (!matches) { return result; }
        return this.replaceVariables(result, matches, variables, subprompt);
    }

    private replaceVariables(
        template: string,
        matches: RegExpMatchArray,
        variables: PromptVariables,
        subprompt: SubpromptDefinition
    ): string {
        let result = template;
        for (const match of matches) {
            const variableName = match.slice(2, -2).trim();
            const value = this.getVariableValue(variables, variableName);
            if (value === undefined && subprompt.required) {
                throw new PromptError(
                    'Required variable not provided',
                    { variableName }
                );
            }
            result = result.replace(match, String(value ?? ''));
        }
        return result;
    }

    private getVariableValue(
        variables: PromptVariables,
        path: string
    ): unknown {
        return path.split('.').reduce<unknown>(
            (obj: unknown, key: string) => {
                if (!obj || typeof obj !== 'object') { return undefined; }
                return (obj as Record<string, unknown>)[key];
            },
            variables
        );
    }

    private combineSubprompts(subprompts: readonly string[]): string {
        return subprompts.filter(Boolean).join('\n\n');
    }
}