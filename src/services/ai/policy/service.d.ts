/**
 * @file Implements the PolicyService for managing and enforcing AI operation policies.
 * @module services/ai/policy/service
 *
 * @description
 * The PolicyService manages and enforces policies for AI operations, including:
 * - Policy rule management (CRUD operations)
 * - Rate limiting for operations
 * - Policy outcome recording for auditing
 * - Real-time policy checking and enforcement
 *
 * @example
 * ```typescript
 * const service = yield* PolicyService;
 * const result = yield* service.checkPolicy({
 *   auth: { userId: "user1" },
 *   requestedModel: "gpt-4",
 *   operationType: "text:generate"
 * });
 * ```
 */
import { Effect, Option } from "effect";
import type { PolicyServiceApi } from "./api.js";
import { PolicyError } from "./errors.js";
import { PolicyRuleEntity } from "./schema.js";
import type { PolicyCheckContext, PolicyCheckResult } from "./types.js";
declare const PolicyService_base: Effect.Service.Class<PolicyServiceApi, "PolicyService", {
    readonly effect: Effect.Effect<{
        checkPolicy: (context: PolicyCheckContext) => Effect.Effect<PolicyCheckResult, PolicyError, never>;
        createRule: (rule: Omit<import("./schema.js").PolicyRuleData, "id">) => Effect.Effect<PolicyRuleEntity, PolicyError, never>;
        getRule: (ruleId: string) => Effect.Effect<Option.Option<PolicyRuleEntity>, PolicyError, never>;
        updateRule: (ruleId: string, updates: Partial<Omit<import("./schema.js").PolicyRuleData, "id">>) => Effect.Effect<never, PolicyError, never>;
        deleteRule: (ruleId: string) => Effect.Effect<Option.Option<PolicyRuleEntity>, PolicyError, never>;
        recordOutcome: () => Effect.Effect<never, PolicyError, never>;
        resetAll: () => Effect.Effect<undefined, never, never>;
        healthCheck: () => Effect.Effect<undefined, never, never>;
        shutdown: () => Effect.Effect<undefined, never, never>;
    }, import("@/services/core/configuration/errors.js").ConfigReadError | import("@/services/core/configuration/errors.js").ConfigParseError | import("@/services/core/configuration/errors.js").ConfigValidationError, import("@/services/core/configuration/api.js").ConfigurationServiceApi>;
}>;
/**
 * PolicyService provides policy rule management, rate limiting, and policy outcome
 * recording for AI operations using the Effect.Service pattern.
 *
 * @class
 * @extends {Effect.Service<PolicyServiceApi>}
 *
 * @description
 * The PolicyService is responsible for:
 * - Managing policy rules (create, read, update, delete)
 * - Enforcing rate limits on operations
 * - Recording policy outcomes for auditing
 * - Real-time policy checking during operations
 *
 * @remarks
 * - Uses Effect-TS for functional error handling and dependency injection
 * - Loads initial configuration from policy.json via ConfigurationService
 * - Maintains state in-memory using Effect Refs for:
 *   - Policy rules
 *   - Usage records
 *   - Rate limit windows
 * - All operations are type-safe and return properly typed Effects
 *
 * @example
 * ```typescript
 * // Create a new policy rule
 * const rule = yield* service.createRule({
 *   name: "Rate limit rule",
 *   type: "allow",
 *   resource: "text:generate",
 *   priority: 1,
 *   enabled: true,
 *   rateLimit: {
 *     requestsPerMinute: 10,
 *     scope: "user"
 *   }
 * });
 * ```
 */
export declare class PolicyService extends PolicyService_base {
}
export {};
//# sourceMappingURL=service.d.ts.map