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
export class PermissivePolicyService extends Effect.Service<PolicyServiceApi>()(
  "PermissivePolicyService",
  {
    effect: Effect.gen(function* () {
      return {
        checkPolicy: (context: PolicyCheckContext): Effect.Effect<PolicyCheckResult, PolicyError> => 
          Effect.succeed({
            allowed: true,
            effectiveModel: context.requestedModel
          }),

        recordOutcome: (outcome: PolicyRecordContext): Effect.Effect<void, PolicyError> =>
          Effect.sync(() => {
            // Just log outcome in development
            if (process.env.NODE_ENV !== 'production') {
              console.log(`[PolicyService] Recorded outcome: ${outcome.status} for ${outcome.operationType} using ${outcome.modelUsed}`);
            }
          }),

        createRule: () => Effect.succeed(undefined),
        getRule: () => Effect.succeed(undefined),
        updateRule: () => Effect.succeed(undefined),
        deleteRule: () => Effect.succeed(undefined)
      };
    })
  }
) {}

/**
 * Default export for the PermissivePolicyService.
 */
export default PermissivePolicyService;
