/**
 * @file Defines input/output schemas for the TextService producer.
 * @module services/pipeline/producers/text/schema
 */


// Input types for text completion
export class TextCompletionInput extends Schema.Class<TextCompletionInput>("TextCompletionInput")({
  prompt: Schema.String,
  maxTokens: Schema.optional(Schema.Number),
  temperature: Schema.optional(Schema.Number),
  modelId: Schema.optional(Schema.String),
  historyId: Schema.optional(Schema.String),
  userId: Schema.optional(Schema.String),
  tenantId: Schema.optional(Schema.String),
  systemPrompt: Schema.optional(Schema.String),
  maxRetries: Schema.optional(Schema.Number),
  topP: Schema.optional(Schema.Number),
  topK: Schema.optional(Schema.Number),
  presencePenalty: Schema.optional(Schema.Number),
  frequencyPenalty: Schema.optional(Schema.Number),
  seed: Schema.optional(Schema.Number),
  stop: Schema.optional(Schema.Array(Schema.String)),
}) { }

// Output types for text completion
export class TextCompletionOutput extends Schema.Class<TextCompletionOutput>("TextCompletionOutput")({
  text: Schema.String,
  usage: Schema.Struct({
    promptTokens: Schema.Number,
    completionTokens: Schema.Number,
    totalTokens: Schema.Number,
  }),
}) { }
