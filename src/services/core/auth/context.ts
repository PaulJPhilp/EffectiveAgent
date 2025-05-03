import { Effect } from "effect";

/**
 * Simple auth context interface for testing
 */
export interface AuthContextApi {
  readonly _tag: "AuthContext";
  readonly userId: string;
  readonly roles: string[];
}

/**
 * Simple auth context implementation for testing
 */
export class AuthContext extends Effect.Service<AuthContextApi>()(
  "AuthContext",
  {
    effect: Effect.gen(function* () {
      return {
        _tag: "AuthContext" as const,
        userId: "test-user",
        roles: ["user"],
      };
    }),
    dependencies: [], // No dependencies for this simple test implementation
  },
) {}
