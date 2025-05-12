/**
 * @file Service implementation for the ReActPipeline
 * @module ea/pipelines/react/service
 */

import { Effect } from "effect";
import {
    ReActPipeline,
    type ReActPipelineApi,
    ReActPipelineError,
    type ReActPipelineInput,
    type ReActPipelineOutput,
    type ReActStep,
    type ReActTool
} from "./contract.js";
import { type Tool } from "./types.js";

/**
 * Service for managing tools
 */
export interface ToolRegistryApi {
    readonly _tag: "ToolRegistry"
    readonly registerTool: (tool: Tool) => Effect.Effect<void, never>
    readonly getTool: (name: string) => Effect.Effect<Tool | undefined, never>
    readonly getAllTools: () => Effect.Effect<Tool[], never>
}

/**
 * Implementation of the ToolRegistry service using Effect.Service pattern
 */
export class ToolRegistry extends Effect.Service<ToolRegistryApi>()("ToolRegistry", {
    effect: Effect.gen(function* () {
        const tools = new Map<string, Tool>();

        return {
            _tag: "ToolRegistry" as const,
            registerTool: (tool: Tool): Effect.Effect<void, never> => {
                return Effect.sync(() => {
                    tools.set(tool.name, tool);
                });
            },
            getTool: (name: string): Effect.Effect<Tool | undefined, never> => {
                return Effect.sync(() => tools.get(name));
            },
            getAllTools: (): Effect.Effect<Tool[], never> => {
                return Effect.sync(() => Array.from(tools.values()));
            }
        };
    }),
    dependencies: []
}) { }

/**
 * Implementation of the ReActPipeline service
 */
export class ReActPipelineService extends Effect.Service<ReActPipelineApi>()(
    ReActPipeline,
    {
        effect: Effect.gen(function* (_) {
            // Yield dependencies
            const toolRegistry = yield* _(ToolRegistry);

            // Helper to generate unique step IDs
            const generateStepId = (index: number): string => {
                return `step-${index}-${Date.now().toString(36)}`;
            };

            // Helper to parse LLM output into a structured reasoning step
            const parseReasoningStep = (llmOutput: string): Omit<ReActStep, 'id' | 'timestamp' | 'observation'> => {
                const thoughtMatch = llmOutput.match(/Thought:(.*?)(?=Action:|$)/s);
                const actionMatch = llmOutput.match(/Action:(.*?)(?=Action Input:|$)/s);
                const actionInputMatch = llmOutput.match(/Action Input:(.*?)$/s);

                const thought = thoughtMatch ? thoughtMatch[1].trim() : undefined;
                const actionToolName = actionMatch ? actionMatch[1].trim() : undefined;
                const actionInput = actionInputMatch ? actionInputMatch[1].trim() : undefined;

                // If no action is specified, just return the thought
                if (!actionToolName || !actionInput) {
                    return { thought };
                }

                // Parse action input as parameters (simple key-value pairs)
                return Effect.try({
                    try: () => JSON.parse(actionInput),
                    catch: () => {
                        const params: Record<string, unknown> = {};
                        actionInput.split('\n').forEach(line => {
                            const [key, ...valueParts] = line.split(':');
                            if (key && valueParts.length) {
                                params[key.trim()] = valueParts.join(':').trim();
                            }
                        });
                        return params;
                    }
                }).pipe(
                    Effect.map(params => ({
                        thought,
                        action: {
                            toolId: actionToolName,
                            params
                        }
                    }))
                );
            };

            // Helper to format tools for LLM prompt
            const formatToolsForPrompt = (tools: ReActTool[]): string => {
                return tools.map(tool => {
                    return `Tool: ${tool.name}\nDescription: ${tool.description}\nParameters: ${JSON.stringify(tool.parameters, null, 2)}\n`;
                }).join('\n');
            };

            // Helper to format the reasoning chain for LLM context
            const formatReasoningChain = (steps: ReActStep[]): string => {
                return steps.map(step => {
                    let stepStr = '';

                    if (step.thought) {
                        stepStr += `Thought: ${step.thought}\n`;
                    }

                    if (step.action) {
                        stepStr += `Action: ${step.action.toolId}\n`;
                        stepStr += `Action Input: ${JSON.stringify(step.action.params, null, 2)}\n`;
                    }

                    if (step.observation) {
                        stepStr += `Observation: ${step.observation}\n`;
                    }

                    return stepStr;
                }).join('\n');
            };

            // Helper to execute a tool with error handling
            const executeTool = (
                toolId: string,
                params: Record<string, unknown>,
                availableTools: ReActTool[]
            ): Effect.Effect<string, Error> => {
                return Effect.gen(function* (_) {
                    const tool = availableTools.find(t => t.id === toolId || t.name === toolId);

                    if (!tool) {
                        return yield* _(Effect.fail(new Error(`Tool "${toolId}" not found`)));
                    }

                    return yield* _(tool.execute(params).pipe(
                        Effect.map(result => {
                            if (typeof result === 'object') {
                                return JSON.stringify(result, null, 2);
                            }
                            return String(result);
                        }),
                        Effect.catchAll(error => Effect.succeed(
                            `Error executing tool: ${error instanceof Error ? error.message : String(error)}`
                        ))
                    ));
                });
            };

            // Method implementations
            const solveWithReAct = (input: ReActPipelineInput): Effect.Effect<ReActPipelineOutput, ReActPipelineError> =>
                Effect.gen(function* (_) {
                    yield* _(Effect.logInfo(`Starting ReAct reasoning process for query: ${input.query}`));

                    const startTime = Date.now();
                    let thinkingTimeMs = 0;
                    let toolExecutionTimeMs = 0;

                    // Initialize the reasoning steps
                    const steps: ReActStep[] = [];

                    // Set default max steps if not provided
                    const maxSteps = input.maxSteps || 10;

                    // Track used tools
                    const toolsUsed = new Set<string>();

                    // Initialize variables for the loop
                    let currentStep = 0;
                    let finalAnswer: string | null = null;

                    // Format the initial prompt for Phoenix
                    const initialPrompt = `
                        Solve the following query step-by-step using the available tools:
                        
                        Query: ${input.query}
                        ${input.initialContext ? `Context: ${input.initialContext}\n\n` : ''}
                        
                        Available tools:
                        ${formatToolsForPrompt(input.tools)}
                        
                        Use the following format:
                        Thought: Think about the current step
                        Action: Tool name
                        Action Input: Parameters for the tool (JSON format preferred)
                        Observation: Result from tool
                        ... (repeat until you reach an answer)
                        Thought: I now know the answer
                        Answer: Final answer to the query
                        
                        Begin!
                    `;

                    // Main reasoning loop
                    while (currentStep < maxSteps && finalAnswer === null) {
                        const stepStartTime = Date.now();
                        currentStep++;

                        // Format current reasoning chain for context
                        const reasoningChain = formatReasoningChain(steps);

                        // Call Phoenix MCP server for next step
                        const thinkingStartTime = Date.now();

                        // TODO: Replace with actual Phoenix MCP server call
                        // For now, using mock responses
                        let llmOutput: string;

                        if (currentStep === 1) {
                            llmOutput = `Thought: I need to break down this query to understand what's being asked. Let me use a search tool to get some initial information.
Action: search-tool
Action Input: {"query": "${input.query}"}`;
                        } else if (currentStep === 2) {
                            llmOutput = `Thought: Now that I have some basic information, I need to analyze it further. Let me use an analysis tool.
Action: analyze-tool
Action Input: {"text": "Results from previous search", "focus": "key details"}`;
                        } else if (currentStep === maxSteps - 1) {
                            llmOutput = `Thought: I've almost reached the maximum number of steps. Let me try to formulate an answer with what I know so far.
Action: summarize-tool
Action Input: {"content": "All observations so far"}`;
                        } else if (currentStep === maxSteps) {
                            llmOutput = `Thought: I now know the answer based on all the information gathered.
Answer: This is the final answer to the query based on the tools I've used and the information I've gathered.`;
                            finalAnswer = "This is the final answer to the query based on the tools I've used and the information I've gathered.";
                        } else {
                            llmOutput = `Thought: I need to continue my investigation. Let me use another tool.
Action: calculator-tool
Action Input: {"expression": "10 * ${currentStep}"}`;
                        }

                        const thinkingEndTime = Date.now();
                        thinkingTimeMs += (thinkingEndTime - thinkingStartTime);

                        // Check if this is a final answer
                        if (llmOutput.includes("Answer:")) {
                            const answerMatch = llmOutput.match(/Answer:(.*?)$/s);
                            if (answerMatch) {
                                finalAnswer = answerMatch[1].trim();
                            }

                            // Create the final step
                            const step: ReActStep = {
                                id: generateStepId(currentStep),
                                thought: llmOutput.split("Answer:")[0].replace("Thought:", "").trim(),
                                timestamp: new Date().toISOString()
                            };

                            steps.push(step);
                            break;
                        }

                        // Parse the LLM output into a reasoning step
                        const parsedStep = yield* _(Effect.tryPromise({
                            try: () => parseReasoningStep(llmOutput),
                            catch: (error) => new ReActPipelineError({
                                message: `Failed to parse LLM output: ${error instanceof Error ? error.message : String(error)}`,
                                cause: error
                            })
                        }));

                        // Create a step with the parsed data
                        const step: ReActStep = {
                            id: generateStepId(currentStep),
                            thought: parsedStep.thought,
                            action: parsedStep.action,
                            timestamp: new Date().toISOString()
                        };

                        // Execute the tool if an action is specified
                        if (step.action) {
                            toolsUsed.add(step.action.toolId);

                            const toolStartTime = Date.now();

                            // Execute the actual tool
                            const toolResult = yield* _(executeTool(
                                step.action.toolId,
                                step.action.params,
                                input.tools
                            ));

                            const toolEndTime = Date.now();
                            toolExecutionTimeMs += (toolEndTime - toolStartTime);

                            step.observation = toolResult;
                        }

                        // Add the step to the steps array
                        steps.push(step);

                        const stepEndTime = Date.now();
                        yield* _(Effect.logDebug(`Completed step ${currentStep} in ${stepEndTime - stepStartTime}ms`));
                    }

                    const endTime = Date.now();

                    // Create the output
                    return {
                        answer: finalAnswer || "Could not determine an answer within the maximum number of steps",
                        reasoning: input.includeReasoning ? steps : undefined,
                        toolsUsed: Array.from(toolsUsed),
                        stepCount: currentStep,
                        reachedStepLimit: currentStep >= maxSteps && finalAnswer === null,
                        metrics: {
                            totalTimeMs: endTime - startTime,
                            thinkingTimeMs,
                            toolExecutionTimeMs
                        }
                    };
                }).pipe(
                    Effect.catchAll((error) => Effect.fail(new ReActPipelineError({
                        message: `ReAct reasoning process failed: ${error instanceof Error ? error.message : String(error)}`,
                        cause: error
                    })))
                );

            const continueReActProcess = (
                previousOutput: ReActPipelineOutput,
                additionalSteps: number
            ): Effect.Effect<ReActPipelineOutput, ReActPipelineError> =>
                Effect.gen(function* (_) {
                    yield* _(Effect.logInfo(`Continuing ReAct process for additional ${additionalSteps} steps`));

                    const startTime = Date.now();
                    let thinkingTimeMs = previousOutput.metrics?.thinkingTimeMs || 0;
                    let toolExecutionTimeMs = previousOutput.metrics?.toolExecutionTimeMs || 0;

                    // Extract previous reasoning
                    const steps = previousOutput.reasoning || [];

                    // Track used tools (initialize with previously used tools)
                    const toolsUsed = new Set<string>(previousOutput.toolsUsed);

                    // Initialize variables for the loop
                    let currentStep = previousOutput.stepCount;
                    let finalAnswer = previousOutput.answer;

                    // Mock tools for now - in real implementation, these would be retrieved from context
                    const mockTools: ReActTool[] = [
                        {
                            id: "search-tool",
                            name: "search-tool",
                            description: "Search for information",
                            parameters: { query: "string" },
                            execute: () => Effect.succeed("Mock search result")
                        },
                        {
                            id: "calculator-tool",
                            name: "calculator-tool",
                            description: "Perform mathematical calculations",
                            parameters: { expression: "string" },
                            execute: () => Effect.succeed("Mock calculation result")
                        }
                    ];

                    // If we already have a final answer, we don't need to continue
                    if (!previousOutput.reachedStepLimit && finalAnswer.indexOf("Could not determine") === -1) {
                        return {
                            ...previousOutput,
                            reasoning: steps
                        };
                    }

                    // Continue reasoning for additional steps
                    const maxAdditionalSteps = additionalSteps || 5;
                    let additionalStepsTaken = 0;

                    while (additionalStepsTaken < maxAdditionalSteps) {
                        const stepStartTime = Date.now();
                        currentStep++;
                        additionalStepsTaken++;

                        // Format current reasoning chain for context
                        const reasoningChain = formatReasoningChain(steps);

                        // TODO: Replace with actual Phoenix MCP server call
                        // For now, using mock responses
                        const thinkingStartTime = Date.now();

                        let llmOutput: string;

                        if (additionalStepsTaken === maxAdditionalSteps) {
                            llmOutput = `Thought: After these additional steps, I now have a clearer understanding and can provide an answer.
Answer: This is the refined answer after additional reasoning steps.`;
                            finalAnswer = "This is the refined answer after additional reasoning steps.";
                        } else {
                            llmOutput = `Thought: I need to continue my investigation with additional steps. Let me use another tool.
Action: calculator-tool
Action Input: {"expression": "10 * ${currentStep}"}`;
                        }

                        const thinkingEndTime = Date.now();
                        thinkingTimeMs += (thinkingEndTime - thinkingStartTime);

                        // Check if this is a final answer
                        if (llmOutput.includes("Answer:")) {
                            const answerMatch = llmOutput.match(/Answer:(.*?)$/s);
                            if (answerMatch) {
                                finalAnswer = answerMatch[1].trim();
                            }

                            // Create the final step
                            const step: ReActStep = {
                                id: generateStepId(currentStep),
                                thought: llmOutput.split("Answer:")[0].replace("Thought:", "").trim(),
                                timestamp: new Date().toISOString()
                            };

                            steps.push(step);
                            break;
                        }

                        // Parse the LLM output into a reasoning step
                        const parsedStep = yield* _(Effect.tryPromise({
                            try: () => parseReasoningStep(llmOutput),
                            catch: (error) => new ReActPipelineError({
                                message: `Failed to parse LLM output: ${error instanceof Error ? error.message : String(error)}`,
                                cause: error
                            })
                        }));

                        // Create a step with the parsed data
                        const step: ReActStep = {
                            id: generateStepId(currentStep),
                            thought: parsedStep.thought,
                            action: parsedStep.action,
                            timestamp: new Date().toISOString()
                        };

                        // Execute the tool if an action is specified
                        if (step.action) {
                            toolsUsed.add(step.action.toolId);

                            const toolStartTime = Date.now();

                            // Execute the actual tool
                            const toolResult = yield* _(executeTool(
                                step.action.toolId,
                                step.action.params,
                                mockTools
                            ));

                            const toolEndTime = Date.now();
                            toolExecutionTimeMs += (toolEndTime - toolStartTime);

                            step.observation = toolResult;
                        }

                        // Add the step to the steps array
                        steps.push(step);

                        const stepEndTime = Date.now();
                        yield* _(Effect.logDebug(`Completed additional step ${additionalStepsTaken} in ${stepEndTime - stepStartTime}ms`));
                    }

                    const endTime = Date.now();
                    const totalTimeMs = (previousOutput.metrics?.totalTimeMs || 0) + (endTime - startTime);

                    // Create the updated output
                    return {
                        answer: finalAnswer,
                        reasoning: steps,
                        toolsUsed: Array.from(toolsUsed),
                        stepCount: currentStep,
                        reachedStepLimit: false, // We've continued beyond the previous limit
                        metrics: {
                            totalTimeMs,
                            thinkingTimeMs,
                            toolExecutionTimeMs
                        }
                    };
                }).pipe(
                    Effect.catchAll((error) => Effect.fail(new ReActPipelineError({
                        message: `Failed to continue ReAct process: ${error instanceof Error ? error.message : String(error)}`,
                        cause: error
                    })))
                );

            // Return implementation of the API
            return {
                solveWithReAct,
                continueReActProcess
            };
        }),

        // List dependencies required by the 'effect' factory
        dependencies: [ToolRegistry]
    }
) { }

/**
 * Layer for the ReActPipeline service
 */
export const ReActPipelineLayer = ReActPipelineService; 