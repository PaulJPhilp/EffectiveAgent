/**
 * @file Implements the Auth Service.
 * @module services/core/auth/service
 */

import { Effect, Ref } from "effect";
import type { AuthServiceApi } from "./api.js";
import { AuthenticationError, AuthorizationError, InvalidAuthContextError } from "./errors.js";
import type { AuthContext } from "./types.js";

/**
 * Implementation of the Auth Service using Effect.Service pattern.
 */
export class AuthService extends Effect.Service<AuthServiceApi>()("AuthService", {
    effect: Effect.gen(function* () {
        // Create a Ref to store the current auth context
        const contextRef = yield* Ref.make<AuthContext>({
            isAuthenticated: false,
            timestamp: Date.now()
        });

        // Helper to get current context
        const getCurrentContext = (): Effect.Effect<AuthContext, AuthenticationError> =>
            Ref.get(contextRef).pipe(
                Effect.flatMap(context => {
                    if (!context.isAuthenticated) {
                        return Effect.fail(new AuthenticationError({
                            message: "No authenticated user context found"
                        }));
                    }
                    return Effect.succeed(context);
                })
            );

        // Helper to check authentication
        const isAuthenticated = (): Effect.Effect<boolean, never> =>
            Ref.get(contextRef).pipe(
                Effect.map(context => context.isAuthenticated)
            );

        // Helper to validate roles
        const validateRoles = (requiredRoles: readonly string[]): Effect.Effect<void, AuthorizationError> =>
            getCurrentContext().pipe(
                Effect.flatMap(context => {
                    const userRoles = context.record?.roles ?? [];
                    const hasAllRoles = requiredRoles.every(role => userRoles.includes(role));

                    if (!hasAllRoles) {
                        return Effect.fail(new AuthorizationError({
                            message: "User does not have required roles",
                            requiredRoles
                        }));
                    }

                    return Effect.unit;
                }),
                Effect.catchTag("AuthenticationError", error =>
                    Effect.fail(new AuthorizationError({
                        message: "Authentication required",
                        cause: error
                    }))
                )
            );

        // Helper to validate tenant access
        const validateTenantAccess = (tenantId: string): Effect.Effect<void, AuthorizationError> =>
            getCurrentContext().pipe(
                Effect.flatMap(context => {
                    if (context.record?.tenantId !== tenantId) {
                        return Effect.fail(new AuthorizationError({
                            message: "User does not have access to this tenant",
                            tenantId
                        }));
                    }

                    return Effect.unit;
                }),
                Effect.catchTag("AuthenticationError", error =>
                    Effect.fail(new AuthorizationError({
                        message: "Authentication required",
                        cause: error
                    }))
                )
            );

        // Helper to update context
        const updateContext = (context: AuthContext): Effect.Effect<void, InvalidAuthContextError> =>
            Effect.gen(function* () {
                if (!context.timestamp) {
                    return yield* Effect.fail(new InvalidAuthContextError({
                        message: "Auth context must have a timestamp"
                    }));
                }

                yield* Ref.set(contextRef, context);
            });

        // Return service implementation
        return {
            getCurrentContext,
            isAuthenticated,
            validateRoles,
            validateTenantAccess,
            updateContext
        };
    }),
    dependencies: []
}) { } 