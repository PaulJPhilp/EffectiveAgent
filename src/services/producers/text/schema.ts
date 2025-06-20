/**
 * @file Defines input/output schemas for the TextService producer.
 * @module services/pipeline/producers/text/schema
 */

import { Schema as S } from "effect";



// Input types for text completion
export class TextCompletionInput extends S.Class<TextCompletionInput>("TextCompletionInput")({
  prompt: S.String,
  maxTokens: S.optional(S.Number),
  temperature: S.optional(S.Number),
  modelId: S.optional(S.String),
  historyId: S.optional(S.String),
  userId: S.optional(S.String),
  tenantId: S.optional(S.String),
  systemPrompt: S.optional(S.String),
  maxRetries: S.optional(S.Number),
  topP: S.optional(S.Number),
  topK: S.optional(S.Number),
  presencePenalty: S.optional(S.Number),
  frequencyPenalty: S.optional(S.Number),
  seed: S.optional(S.Number),
  stop: S.optional(S.Array(S.String))
}) { }

// Output types for text completion
export class TextCompletionOutput extends S.Class<TextCompletionOutput>("TextCompletionOutput")({
  text: S.String,
  usage: S.optional(S.Struct({
    promptTokens: S.Number,
    completionTokens: S.Number,
    totalTokens: S.Number
  }))
}) { }
