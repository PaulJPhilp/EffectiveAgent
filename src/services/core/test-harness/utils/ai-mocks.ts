import { EffectiveResponse } from "@/types.js"

/**
 * Creates a mock EffectiveResponse object.
 * 
 * @param text The text content
 * @param tokenCount The number of tokens used
 * @returns A mock EffectiveResponse object
 */
export const createMockEffectiveResponse = (text: string, tokenCount: number): EffectiveResponse<string> => {
  return {
    data: text,
    metadata: {},
    usage: {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0
    },
    finishReason: "stop"
  };
};
