import { Context, Effect, Layer } from "effect";

/**
 * Simple auth context interface for testing
 */
export interface AuthContextApi {
  readonly _tag: "AuthContext";
  readonly userId: string;
  readonly roles: string[];
}

export const AuthContext = Context.Tag<AuthContextApi>("AuthContext");

export const AuthContextLive = Layer.succeed(
  "AuthContext",
  {
    effect: Effect.succeed({
      userId: "test-user",
      roles: ["user"],
      permissions: ["read", "write"],
    }),
    dependencies: [], // No dependencies for this simple test implementation
  },
);
