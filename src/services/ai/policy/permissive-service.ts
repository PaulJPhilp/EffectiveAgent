/**
 * @file Implements a permissive policy service implementation.
 */

import { Effect } from "effect";
import { PolicyServiceApi } from "./api.js";
import { 
  PolicyCheckContext, 
  PolicyCheckResult, 
  PolicyRecordContext 
} from "./types.js";
import { PolicyError } from "./errors.js";

/**
 * A simple permissive implementation of PolicyService that always
 * allows requests and performs minimal recording.
 * 
 * This implementation is meant to be used in development or testing
 * environments where policy enforcement is not required.
 */
export class PermissivePolicyService implements PolicyServiceApi {
  /**
   * Create a new instance of PermissivePolicyService
   */
  static make = (): Effect.Effect<PermissivePolicyService> => {
    return Effect.succeed(new PermissivePolicyService());
  };

  /**
   * Always allows the request and returns the requested model.
   * 
   * @param context The context containing details about the requested operation
   * @returns Effect with PolicyCheckResult always allowing the operation
   */
  checkPolicy(context: PolicyCheckContext): Effect.Effect<PolicyCheckResult, PolicyError> {
    return Effect.succeed({
      allowed: true,
      effectiveModel: context.requestedModel
    });
  }

  /**
   * No-op implementation that just logs the outcome.
   * 
   * @param outcome The context containing details about the operation outcome
   * @returns Effect with void
   */
  recordOutcome(outcome: PolicyRecordContext): Effect.Effect<void, PolicyError> {
    return Effect.sync(() => {
      // Just log outcome in development
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[PolicyService] Recorded outcome: ${outcome.status} for ${outcome.operationType} using ${outcome.modelUsed}`);
      }
    });
  }
}

/**
 * Default export for the PermissivePolicyService.
 */
export default PermissivePolicyService;
