/**
 * Mock implementations for AI-related services and types.
 */

import type { AiError } from "@effect/ai/AiError";
import { AiResponse } from "@effect/ai/AiResponse";
import { Model } from "@effect/ai/AiRole";
import { Chunk, Effect, Option } from "effect";

/**
 * Creates a mock AiResponse object.
 * 
 * @param text The text content
 * @param tokenCount The number of tokens used
 * @returns A mock AiResponse object
 */
export const createMockAiResponse = (text: string, tokenCount: number): AiResponse => {
  return AiResponse.fromText({
    role: new Model(),
    content: text
  });
};
