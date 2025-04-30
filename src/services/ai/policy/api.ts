import { Effect } from "effect";
import { PolicyCheckContext, PolicyCheckResult, PolicyRecordContext } from "./types.js";
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
   * Records the outcome of an AI operation for policy enforcement.
   * This is typically called asynchronously after the operation completes.
   * 
   * @param outcome The context containing details about the operation outcome
   * @returns Effect with void or PolicyError
   */
  recordOutcome: (
    outcome: PolicyRecordContext
  ) => Effect.Effect<void, PolicyError>;
}
