/**
 * @file Implements the Auth Service.
 * @module services/core/auth/service
 */

import { Effect, pipe, Ref } from "effect";
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
            pipe(
                Ref.get(contextRef),
                Effect.tap(() => Effect.logDebug("Getting current auth context")),
                Effect.flatMap(context => {
                    if (!context.isAuthenticated) {
                        return Effect.fail(new AuthenticationError({
                            message: "No authenticated user context found"
                        }));
                    }
                    return Effect.succeed(context);
                }),
                Effect.tap(context => Effect.logDebug("Retrieved auth context", { isAuthenticated: context.isAuthenticated }))
            );

        // Helper to check authentication
        const isAuthenticated = (): Effect.Effect<boolean, never> =>
            pipe(
                Ref.get(contextRef),
                Effect.tap(() => Effect.logDebug("Checking authentication status")),
                Effect.map(context => context.isAuthenticated),
                Effect.tap(isAuth => Effect.logDebug("Authentication status checked", { isAuthenticated: isAuth }))
            );

        // Helper to validate roles
        const validateRoles = (requiredRoles: readonly string[]): Effect.Effect<void, AuthorizationError> =>
            pipe(
                getCurrentContext(),
                Effect.tap(() => Effect.logDebug("Validating roles", { requiredRoles })),
                Effect.flatMap(context => {
                    const userRoles = context.record?.roles ?? [];
                    const hasAllRoles = requiredRoles.every(role => userRoles.includes(role));

                    if (!hasAllRoles) {
                        return Effect.fail(new AuthorizationError({
                            message: "User does not have required roles",
                            requiredRoles
                        }));
                    }

                    return Effect.succeed(void 0);
                }),
                Effect.tap(() => Effect.logDebug("Roles validated successfully", { requiredRoles })),
                Effect.mapError(error =>
                    error instanceof AuthenticationError
                        ? new AuthorizationError({
                            message: "Authentication required",
                            cause: error
                        })
                        : error
                )
            );

        // Helper to validate tenant access
        const validateTenantAccess = (tenantId: string): Effect.Effect<void, AuthorizationError> =>
            pipe(
                getCurrentContext(),
                Effect.tap(() => Effect.logDebug("Validating tenant access", { tenantId })),
                Effect.flatMap(context => {
                    if (context.record?.tenantId !== tenantId) {
                        return Effect.fail(new AuthorizationError({
                            message: "User does not have access to this tenant",
                            tenantId
                        }));
                    }

                    return Effect.succeed(void 0);
                }),
                Effect.tap(() => Effect.logDebug("Tenant access validated successfully", { tenantId })),
                Effect.mapError(error =>
                    error instanceof AuthenticationError
                        ? new AuthorizationError({
                            message: "Authentication required",
                            cause: error
                        })
                        : error
                )
            );

        // Helper to update context
        const updateContext = (context: AuthContext): Effect.Effect<void, InvalidAuthContextError> =>
            pipe(
                Effect.succeed(context),
                Effect.tap(() => Effect.logDebug("Updating auth context")),
                Effect.flatMap(ctx => {
                    if (!ctx.timestamp) {
                        return Effect.fail(new InvalidAuthContextError({
                            message: "Auth context must have a timestamp"
                        }));
                    }
                    return Ref.set(contextRef, ctx);
                }),
                Effect.tap(() => Effect.logDebug("Auth context updated successfully"))
            );

        // Return service implementation
        return {
            getCurrentContext,
            isAuthenticated,
            validateRoles,
            validateTenantAccess,
            updateContext
        };
    })
}) { }

export default AuthService; 