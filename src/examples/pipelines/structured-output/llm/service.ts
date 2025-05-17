/**
 * @file Implementation of LLM Service using Vercel AI SDK
 * @module ea/pipelines/structured-output/llm/service
 */

import { Effect } from "effect";

import OpenAI from "openai";
import {
    type LlmConfig,
    type LlmServiceApi,
    LlmCallError,
    LlmResponseParseError,
    LlmService
} from "./contract.js";

const DEFAULT_CONFIG: LlmConfig = {
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 1000
};

/**
 * LLM Service implementation using Vercel AI SDK
 */
export class VercelLlmService extends Effect.Service<LlmServiceApi>()(
    "VercelLlmService",
    {
        effect: Effect.gen(function* () {
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY
            });

            return {
                complete: (
                    prompt: string,
                    config: Partial<LlmConfig> = {}
                ): Effect.Effect<string, LlmCallError> =>
                    Effect.tryPromise({
                        try: async () => {
                            const response = await openai.chat.completions.create({
                                model: config.model ?? DEFAULT_CONFIG.model,
                                temperature: config.temperature ?? DEFAULT_CONFIG.temperature,
                                max_tokens: config.maxTokens ?? DEFAULT_CONFIG.maxTokens,
                                messages: [{ role: "user", content: prompt }]
                            });

                            const content = response.choices[0]?.message?.content;
                            if (!content) {
                                throw new Error("No content in response");
                            }

                            return content;
                        },
                        catch: (error) => new LlmCallError({
                            message: error instanceof Error ? error.message : String(error),
                            cause: error
                        })
                    }),

                completeJson: <T>(
                    prompt: string,
                    config: Partial<LlmConfig> = {}
                ): Effect.Effect<T, LlmCallError | LlmResponseParseError> =>
                    Effect.gen(function* () {
                        const response = yield* Effect.tryPromise({
                            try: async () => {
                                const completion = await openai.chat.completions.create({
                                    model: config.model ?? DEFAULT_CONFIG.model,
                                    temperature: config.temperature ?? DEFAULT_CONFIG.temperature,
                                    max_tokens: config.maxTokens ?? DEFAULT_CONFIG.maxTokens,
                                    response_format: { type: "json_object" },
                                    messages: [{ role: "user", content: prompt }]
                                });

                                const content = completion.choices[0]?.message?.content;
                                if (!content) {
                                    throw new Error("No content in response");
                                }

                                return content;
                            },
                            catch: (error) => new LlmCallError({
                                message: error instanceof Error ? error.message : String(error),
                                cause: error
                            })
                        });

                        return yield* Effect.try({
                            try: () => JSON.parse(response) as T,
                            catch: (error) => new LlmResponseParseError({
                                message: error instanceof Error ? error.message : String(error),
                                cause: error
                            })
                        });
                    })
            };
        }),
        dependencies: []
    }
) { }

export default VercelLlmService;
