// File: src/shared/services-effect/agent/schema.ts

import { z } from "zod";
import { TagsSchema } from '../configuration/schema.js';

// --- Normalization Configuration ---
export const NormalizationConfigSchema = z.object({
  schema: z.instanceof(z.ZodType),
  overrides: z.object({
    maxBatchSize: z.number().int().positive().optional(),
    timeoutMs: z.number().int().positive().optional()
  }).optional()
}).strict();

export const NormalizationResultSchema = z.object({
  normalized: z.boolean(),
  data: z.record(z.unknown()),
  validationErrors: z.array(z.string()),
  processingTimeMs: z.number().int().positive().optional()
}).strict();

// --- Node Configuration ---
export const LangGraphConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin']),
  value: z.unknown()
}).strict();

export const LangGraphEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  conditions: z.array(LangGraphConditionSchema).optional()
}).strict();

export const LangGraphNodeConfigSchema = z.object({
  id: z.string(),
  type: z.string(),
  next: z.array(z.string()),
  data: z.record(z.unknown()).optional(),
  conditions: z.object({
    field: z.string(),
    routes: z.record(z.array(z.string()))
  }).optional()
}).strict();

export const LangGraphConfigSchema = z.object({
  nodes: z.array(LangGraphNodeConfigSchema),
  edges: z.array(LangGraphEdgeSchema),
  start_node_id: z.string(),
  metadata: z.object({
    description: z.string().optional(),
    version: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional()
  }).optional()
}).strict();

// --- Agent Configuration ---
export const AgentConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  version: z.string(),
  tags: TagsSchema,
  graph: LangGraphConfigSchema,
  settings: z.record(z.unknown()).optional()
}).strict();

export const NormalizingAgentConfigSchema = AgentConfigSchema.extend({
  normalization: NormalizationConfigSchema
}).strict();

export const AgentRunSchema = z.object({
  id: z.string().uuid(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  status: z.enum(['running', 'completed', 'error']),
  error: z.string().optional()
}).strict();

// --- Inferred Types ---
export type LangGraphCondition = z.infer<typeof LangGraphConditionSchema>;
export type LangGraphEdge = z.infer<typeof LangGraphEdgeSchema>;
export type LangGraphNodeConfig = z.infer<typeof LangGraphNodeConfigSchema>;
export type LangGraphConfig = z.infer<typeof LangGraphConfigSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type NormalizingAgentConfig = z.infer<typeof NormalizingAgentConfigSchema>;
export type AgentRun = z.infer<typeof AgentRunSchema>;
export type NormalizationConfig = z.infer<typeof NormalizationConfigSchema>;
export type NormalizationResult = z.infer<typeof NormalizationResultSchema>;
