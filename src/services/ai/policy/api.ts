import { Effect, Option } from "effect";
import { PolicyCheckContext, PolicyCheckResult, PolicyRecordContext } from "./types.js";
import { PolicyRuleData, PolicyRuleEntity } from "./schema.js";
import { PolicyError } from "./errors.js";

/**
 * PolicyService API interface
 * 
 * This service is responsible for enforcing policy rules on AI operations.
 * It acts as the Policy Decision Point (PDP) in the system.
 */
export interface PolicyServiceApi {
  /**
   * Checks if an AI operation is allowed based on policy rules.
   * 
   * @param context The context containing details about the requested operation
   * @returns Effect with PolicyCheckResult or PolicyError
   */
  checkPolicy: (
    context: PolicyCheckContext
  ) => Effect.Effect<PolicyCheckResult, PolicyError>;

  /**
   * Records the outcome of a policy check and operation.
   * 
   * @param outcome The outcome details to record
   * @returns Effect with void or PolicyError
   */
  recordOutcome: (
    outcome: PolicyRecordContext
  ) => Effect.Effect<void, PolicyError>;

  /**
   * Creates a new policy rule.
   * 
   * @param rule The rule data to create
   * @returns Effect with created PolicyRuleEntity or PolicyError
   */
  createRule: (
    rule: Omit<PolicyRuleData, "id">
  ) => Effect.Effect<PolicyRuleEntity, PolicyError>;

  /**
   * Gets a policy rule by ID.
   * 
   * @param ruleId The ID of the rule to get
   * @returns Effect with Option of PolicyRuleEntity or PolicyError
   */
  getRule: (
    ruleId: string
  ) => Effect.Effect<Option.Option<PolicyRuleEntity>, PolicyError>;

  /**
   * Updates a policy rule.
   * 
   * @param ruleId The ID of the rule to update
   * @param updates The updates to apply
   * @returns Effect with updated PolicyRuleEntity or PolicyError
   */
  updateRule: (
    ruleId: string,
    updates: Partial<Omit<PolicyRuleData, "id">>
  ) => Effect.Effect<PolicyRuleEntity, PolicyError>;

  /**
   * Deletes a policy rule.
   * 
   * @param ruleId The ID of the rule to delete
   * @returns Effect with void or PolicyError
   */
  deleteRule: (
    ruleId: string
  ) => Effect.Effect<void, PolicyError>;
}
