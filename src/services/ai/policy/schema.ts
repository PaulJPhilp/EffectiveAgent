/**
 * @file Defines the schema for Policy entities.
 */
import { Schema as S } from "effect";
import { BaseEntitySchema, Description, Name, RateLimit } from "@/schema.js";
import { BaseConfigSchema } from "@/services/core/configuration/schema.js";

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
  rateLimit: S.optional(RateLimit)
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
export class PolicyRuleEntity extends S.Class<PolicyRuleEntity>("PolicyRuleEntity")({
  ...BaseEntitySchema.fields,
  data: PolicyRuleData
}) { }

/**
 * Schema for the policy usage entity
 */
export class PolicyUsageEntity extends S.Class<PolicyUsageEntity>("PolicyUsageEntity")({
  ...BaseEntitySchema.fields,
  data: PolicyUsageData
}) { }

/**
 * Schema for the policy configuration file
 */
export class PolicyConfigFile extends S.Class<PolicyConfigFile>("PolicyConfigFile")({
  ...BaseConfigSchema.fields,
  description: Description.pipe(S.optional),
  name: Name,
  policies: S.Array(PolicyRuleData).pipe(S.minItems(1))
}) { }



