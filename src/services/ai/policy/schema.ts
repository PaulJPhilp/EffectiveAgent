import { BaseEntitySchema, RateLimit } from "@/schema.js";
/**
 * @file Defines the schema for Policy entities.
 */
import { Schema as S } from "effect";

/**
 * PolicyRuleData schema and type
 */
export class PolicyRuleData extends S.Class<PolicyRuleData>("PolicyRuleData")({
  id: S.String,
  name: S.String,
  type: S.Literal("allow", "deny"),
  resource: S.String,
  conditions: S.optional(S.String),
  priority: S.Number,
  enabled: S.Boolean,
  description: S.optional(S.String),
  rateLimit: S.optional(S.Class<RateLimit>("RateLimit")({
    maxRequests: S.Number,
    windowSeconds: S.Number,
    scope: S.Literal("user", "global")
  }))
}) { }

/**
 * PolicyUsageData schema and type
 */
export class PolicyUsageData extends S.Class<PolicyUsageData>("PolicyUsageData")({
  userId: S.String,
  modelUsed: S.String,
  operationType: S.String,
  status: S.Literal("success", "error", "blocked"),
  timestamp: S.Number,
  latencyMs: S.optional(S.Number),
  tokensConsumed: S.optional(S.Number)
}) { }

/**
 * Schema for the policy rule entity
 */
export class PolicyRuleEntity extends BaseEntitySchema.extend<PolicyRuleEntity>("PolicyRuleEntity")({
  data: PolicyRuleData
}) { }

/**
 * Schema for the policy usage entity
 */
export class PolicyUsageEntity extends BaseEntitySchema.extend<PolicyUsageEntity>("PolicyUsageEntity")({
  data: PolicyUsageData
}) { }


