Skill Service - Product Requirements Document (PRD)
Version: 1.0 Date: 2024-07-27 Author: Paul & T3 Chat

1. Introduction

The Skill Service (SkillApi) defines the primary abstraction layer for AI developers and engineers interacting with AI capabilities within the EffectiveAgent framework. Moving beyond low-level model and provider configurations, Skills represent named, pre-configured, and potentially complex AI capabilities designed to perform specific tasks with a particular style, persona, or set of constraints (e.g., "Strunk & White Copy Editor," "Bauhaus Graphic Designer," "Concise Meeting Summarizer").

This service allows developers to think declaratively about the capabilities their agents need, abstracting away the underlying implementation details of model selection, prompt engineering, parameter tuning, and potentially even tool usage. The goal is to provide a highly reusable, composable, and intuitive primitive for building sophisticated agent behaviors.

2. Goals

Declarative AI Invocation: Provide a simple API (SkillApi) where developers invoke AI capabilities by name (e.g., invokeSkill("copyEditor", ...)), specifying only the necessary input.
Abstraction of Complexity: Hide the underlying details of which specific LLM (modelId), system prompt, temperature, token limits, or even required tools are used to fulfill the Skill's purpose.
Encapsulation of Best Practices: Allow expert prompt engineering, parameter tuning, and persona definition to be encapsulated within a Skill's configuration, ensuring high-quality, consistent output for specific tasks.
Reusability & Composability: Enable Skills to be defined once and reused across different agents or parts of an agent's logic.
Configuration Driven: Define Skills declaratively through configuration files (e.g., skills.json) loaded via a dedicated SkillConfiguration service.
Extensibility: Allow developers to easily define and add new custom Skills tailored to their specific needs.
(Future) Shareability: Lay the groundwork for potential sharing or marketplaces of pre-defined, high-quality Skills.
3. Non-Goals

Direct LLM Interaction: Does not expose the raw API for interacting with LLM providers (this is handled by the underlying AI service, e.g., @effect/ai's Completions or a custom ProviderApi).
Agent Orchestration: Does not define the flow or logic for how multiple skills or tools are chained together to achieve a larger goal (handled by execution/thread, capabilities/mcp, LangGraph, etc.).
Tool Implementation: Does not implement the logic of individual tools (handled by capabilities/tool). It may specify that a Skill requires certain tools.
Output Storage: Does not store the results (artifacts) generated by invoking a skill (handled by memory/artifact or the calling service).
Runtime Configuration Loading: Relies on core/configuration/ConfigLoader via its own SkillConfiguration service to load skill definitions.
4. Key Concepts

Skill: A named, configured AI capability designed for a specific purpose and potentially embodying a specific persona or style. It acts as the primary primitive for developers invoking AI functionality.
Skill Configuration: A data structure (likely loaded from JSON/YAML) that defines a specific Skill. Key attributes include:
name: Unique identifier (e.g., "strunkAndWhiteCopyEditor").
description: User-facing description of the skill's purpose.
modelId: The underlying AI model identifier (e.g., "openai/gpt-4o") to be used.
systemPrompt / promptTemplate: The base instructions or template defining the skill's behavior, persona, and task.
defaultParams: Default execution parameters (e.g., { temperature: 0.2, maxTokens: 500 }).
(Optional) requiredTools: List of tool names needed by the skill's prompt or expected workflow.
(Optional) inputSchema: Zod schema for validating the input data passed to the skill.
(Optional) outputSchema: Zod schema for validating the output generated by the skill/LLM.
Skill Invocation: The act of calling SkillApi.invokeSkill with a skillName and input data.
5. Functional Requirements (Developer Perspective)

FR-SKILL-01 (Configuration Loading): Provide a SkillConfiguration service (using ConfigLoader) responsible for loading, validating (against a SkillDefinitionSchema), and providing access to the defined Skill configurations.
Must support retrieving a specific Skill's configuration by name.
FR-SKILL-02 (Skill API): Provide a SkillApi service with a primary method:
invokeSkill(params: { skillName: string, input: JsonObject, overrideParams?: Partial<SkillExecutionParams> }) => Effect<SkillOutput, SkillError, ...>
skillName: The name of the configured Skill to invoke.
input: The data needed by the Skill's prompt/template.
overrideParams: Optional parameters to override the Skill's defaults for this specific invocation.
SkillOutput: The processed result from the Skill (e.g., string, structured JSON).
SkillError: Specific errors related to skill invocation.
R: Requirements include SkillConfiguration, the underlying AI service (Completions or ProviderApi), potentially PromptApi, and potentially ToolApi.
FR-SKILL-03 (Invocation Logic): The invokeSkill implementation must perform the following steps:
Retrieve the configuration for the specified skillName using SkillConfiguration. Fail with SkillNotFoundError if not found.
(Optional) Validate the provided input against the Skill's inputSchema. Fail with SkillInputValidationError.
Prepare the final prompt/messages by rendering the Skill's template (systemPrompt/promptTemplate) with the provided input (potentially using PromptApi).
Merge the Skill's defaultParams with any overrideParams.
Prepare the request for the underlying AI service (Completions or ProviderApi), including the messages, final parameters, modelId, and any requiredTools specified in the Skill config.
Invoke the underlying AI service (e.g., yield* completions.completions(...) or yield* providerApi.generateChatCompletion(...)).
Process the response from the AI service.
(Optional) Validate the response content against the Skill's outputSchema. Fail with SkillOutputValidationError.
Map errors from dependencies (AI service, config service, validation) into SkillExecutionError or other relevant SkillError types.
Return the final processed SkillOutput.
FR-SKILL-04 (Error Handling): Define specific SkillError types (SkillNotFoundError, SkillExecutionError, SkillInputValidationError, SkillOutputValidationError) extending AppError.
6. Use Cases (Developer Perspective)

Use Case 1: Agent Needs Summarization:
Developer Action: Defines a conciseSummarizer skill in skills.json specifying modelId: "anthropic/claude-3-haiku", a system prompt like "Summarize the following text concisely in bullet points", and temperature: 0.1.
Agent Code: const summary = yield* SkillApi.pipe(Effect.flatMap(api => api.invokeSkill({ skillName: "conciseSummarizer", input: { textToSummarize: meetingTranscript } })))
Framework Handles: Loading config, preparing prompt, calling Claude Haiku via AI service, returning the summary string.
Use Case 2: Agent Needs Specific Tone:
Developer Action: Defines a formalEmailDrafter skill in skills.json specifying modelId: "openai/gpt-4o", a detailed system prompt defining a formal, polite persona, and temperature: 0.3.
Agent Code: const emailDraft = yield* SkillApi.pipe(Effect.flatMap(api => api.invokeSkill({ skillName: "formalEmailDrafter", input: { recipient: "...", subject: "...", points: [...] } })))
Framework Handles: Loading config, rendering prompt with input points, calling GPT-4o via AI service, returning the draft.
Use Case 3: Agent Needs Structured Output:
Developer Action: Defines a jsonExtractor skill specifying a model good at function calling, a prompt asking for specific fields to be extracted, an outputSchema (Zod) defining the expected JSON structure, and potentially requiredTools if function calling is used explicitly.
Agent Code: const extractedData = yield* SkillApi.pipe(Effect.flatMap(api => api.invokeSkill({ skillName: "jsonExtractor", input: { sourceText: "..." } })))
Framework Handles: Loading config, calling AI service (potentially with tool definitions), receiving structured output (or text to be parsed), validating against outputSchema, returning the validated JSON object or failing with SkillOutputValidationError.


Standard Skill Library: To accelerate development and provide immediate value, the EffectiveAgent framework should ship with a standard library of pre-defined, commonly useful Skills. These could include capabilities like text summarization (with various styles like concise, detailed, bullet points), sentiment analysis, basic text classification, language translation, common data extraction formats (e.g., extracting JSON from text), and potentially simple persona-driven responses (e.g., "politeRefusal," "enthusiasticGreeting"). This library serves both as a practical toolkit for developers and as concrete examples of how to define and configure effective Skills.