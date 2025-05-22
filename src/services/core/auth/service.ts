/**
 * @file Implements the Auth Service.
 * @module services/core/auth/service
 */

import { Effect, Ref, pipe } from "effect";
import { LoggingService } from "../logging/service.js";
import type { AuthServiceApi } from "./api.js";
import { AuthenticationError, AuthorizationError, InvalidAuthContextError } from "./errors.js";
import type { AuthContext } from "./types.js";

/**
 * Implementation of the Auth Service using Effect.Service pattern.
 */
export class AuthService extends Effect.Service<AuthServiceApi>()("AuthService", {
    effect: Effect.gen(function* () {
        // Get dependencies
        const logger = (yield* LoggingService).withContext({ service: "AuthService" });

        // Create a Ref to store the current auth context
        const contextRef = yield* Ref.make<AuthContext>({
            isAuthenticated: false,
            timestamp: Date.now()
        });

        // Helper to get current context
        const getCurrentContext = (): Effect.Effect<AuthContext, AuthenticationError> =>
            pipe(
                Ref.get(contextRef),
                Effect.tap(() => logger.debug("Getting current auth context")),
                Effect.flatMap(context => {
                    if (!context.isAuthenticated) {
                        return Effect.fail(new AuthenticationError({
                            message: "No authenticated user context found"
                        }));
                    }
                    return Effect.succeed(context);
                }),
                Effect.tap(context => logger.debug("Retrieved auth context", { isAuthenticated: context.isAuthenticated }))
            );

        // Helper to check authentication
        const isAuthenticated = (): Effect.Effect<boolean, never> =>
            pipe(
                Ref.get(contextRef),
                Effect.tap(() => logger.debug("Checking authentication status")),
                Effect.map(context => context.isAuthenticated),
                Effect.tap(isAuth => logger.debug("Authentication status checked", { isAuthenticated: isAuth }))
            );

        // Helper to validate roles
        const validateRoles = (requiredRoles: readonly string[]): Effect.Effect<void, AuthorizationError> =>
            pipe(
                getCurrentContext(),
                Effect.tap(() => logger.debug("Validating roles", { requiredRoles })),
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
                Effect.tap(() => logger.debug("Roles validated successfully", { requiredRoles })),
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
                Effect.tap(() => logger.debug("Validating tenant access", { tenantId })),
                Effect.flatMap(context => {
                    if (context.record?.tenantId !== tenantId) {
                        return Effect.fail(new AuthorizationError({
                            message: "User does not have access to this tenant",
                            tenantId
                        }));
                    }

                    return Effect.succeed(void 0);
                }),
                Effect.tap(() => logger.debug("Tenant access validated successfully", { tenantId })),
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
                Effect.tap(() => logger.debug("Updating auth context")),
                Effect.flatMap(ctx => {
                    if (!ctx.timestamp) {
                        return Effect.fail(new InvalidAuthContextError({
                            message: "Auth context must have a timestamp"
                        }));
                    }
                    return Ref.set(contextRef, ctx);
                }),
                Effect.tap(() => logger.debug("Auth context updated successfully"))
            );

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

export const AuthServiceTag = Effect.GenericTag<AuthServiceApi>("AuthService") 