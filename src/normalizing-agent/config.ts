import type { RunnableConfig } from "@langchain/core/runnables";
import { Annotation } from "@langchain/langgraph";
import { MAIN_PROMPT } from "./prompts";

/**
 * The complete configuration for the agent.
 */
export const ConfigurationAnnotation = Annotation.Root({
    model: Annotation<string>,
    prompt: Annotation<string>,
    maxSearchResults: Annotation<number>,
    maxInfoToolCalls: Annotation<number>,
    maxLoops: Annotation<number>,
    fileFolder: Annotation<string>,
    recursionLimit: Annotation<number>,
    numSteps: Annotation<number>,
    maxTasks: Annotation<number>
});

/**
 * Create a typeof ConfigurationAnnotation.State instance from a RunnableConfig object.
 *
 * @param config - The configuration object to use.
 * @returns An instance of typeof ConfigurationAnnotation.State with the specified configuration.
 */
export function ensureConfiguration(
    config?: RunnableConfig,
): typeof ConfigurationAnnotation.State {
    const configurable = (config?.configurable ?? {}) as Partial<
        typeof ConfigurationAnnotation.State
    >;

    return {
        model: configurable.model ?? "anthropic/claude-3-5-sonnet-20240620",
        prompt: configurable.prompt ?? MAIN_PROMPT,
        maxSearchResults: configurable.maxSearchResults ?? 5,
        maxInfoToolCalls: configurable.maxInfoToolCalls ?? 3,
        maxLoops: configurable.maxLoops ?? 6,
        fileFolder: configurable.fileFolder ?? "./data/PersonaDocuments",
        recursionLimit: configurable.recursionLimit ?? 100,
        numSteps: configurable.numSteps ?? 100,
        maxTasks: configurable.maxTasks ?? 2
    };
}