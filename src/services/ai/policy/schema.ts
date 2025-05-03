import { BaseEntitySchema } from "@/schema.js";
/**
 * @file Defines the schema for Policy entities.
 */
import { Schema as S } from "effect";

/**
 * Schema for a policy rule
 */
export const PolicyRuleDataSchema = S.Struct({
  /**
   * Unique identifier for the rule
   */
  id: S.String,

  /**
   * The name of the rule
   */
  name: S.String,

  /**
   * The type of policy rule (allow, deny, etc.)
   */
  type: S.Literal("allow", "deny"),

  /**
   * The resource or operation this policy applies to
   */
  resource: S.String,

  /**
   * Optional conditions for rule application (serialized as JSON)
   */
  conditions: S.optional(S.String),

  /**
   * Priority of the rule (lower numbers have higher priority)
   */
  priority: S.Number,

  /**
   * Whether the rule is enabled
   */
  enabled: S.Boolean,

  /**
   * Optional explanation for this policy rule
   */
  description: S.optional(S.String),

  /**
   * Rate limit configuration
   */
  rateLimit: S.optional(S.Struct({
    /**
     * Maximum number of requests allowed
     */
    maxRequests: S.Number,

    /**
     * Time window in seconds
     */
    windowSeconds: S.Number,

    /**
     * Optional scope for rate limiting (user, global, etc.)
     */
    scope: S.Literal("user", "global")
  }))
});

/**
 * Schema for policy usage records
 */
export const PolicyUsageDataSchema = S.Struct({
  /**
   * User or entity the usage is attributed to
   */
  userId: S.String,

  /**
   * The model used for the operation
   */
  modelUsed: S.String,

  /**
   * Type of operation performed
   */
  operationType: S.String,

  /**
   * Outcome status
   */
  status: S.Literal("success", "error", "blocked"),

  /**
   * Timestamp when the operation occurred
   */
  timestamp: S.Number,

  /**
   * Optional latency in milliseconds
   */
  latencyMs: S.optional(S.Number),

  /**
   * Optional tokens consumed (if applicable)
   */
  tokensConsumed: S.optional(S.Number)
});

/**
 * Schema for the policy rule entity
 */
export class PolicyRuleEntity extends BaseEntitySchema.extend<PolicyRuleEntity>("PolicyRuleEntity")({  
  data: PolicyRuleDataSchema
}) {}

/**
 * Schema for the policy usage entity
 */
export class PolicyUsageEntity extends BaseEntitySchema.extend<PolicyUsageEntity>("PolicyUsageEntity")({  
  data: PolicyUsageDataSchema
}) {}

/**
 * PolicyRuleData type
 */
export type PolicyRuleData = S.Schema.Type<typeof PolicyRuleDataSchema>;

/**
 * PolicyUsageData type
 */
export type PolicyUsageData = S.Schema.Type<typeof PolicyUsageDataSchema>;


