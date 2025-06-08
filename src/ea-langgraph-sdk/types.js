import { Annotation } from "@langchain/langgraph";
/**
 * Base annotation for LangGraph agents integrated with Effective Agent.
 * Use this as a foundation to build agent-specific state annotations.
 *
 * @example
 * ```typescript
 * const MyAgentStateAnnotation = Annotation.Root({
 *   ...LangGraphAgentBaseAnnotation.spec,
 *   messages: Annotation<Array<{ role: string; content: string }>>({
 *     default: () => [],
 *     reducer: (existing, update) => existing.concat(update)
 *   }),
 *   currentTask: Annotation<string>()
 * })
 * ```
 */
export const LangGraphAgentBaseAnnotation = Annotation.Root({
    /**
     * An instance of the Effective Agent AgentRuntimeService.
     * This provides access to EA services and the run method for executing Effects.
     */
    agentRuntime: Annotation(),
    /**
     * Agent-specific context and state properties.
     * Contains typed context data specific to the agent implementation.
     */
    context: Annotation({
        reducer: (existing, update) => update ?? existing,
        default: () => ({})
    })
});
//# sourceMappingURL=types.js.map