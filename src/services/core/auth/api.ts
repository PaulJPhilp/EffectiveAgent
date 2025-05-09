/**
 * @file Defines the Auth Service API interface.
 * @module services/core/auth/api
 */

import { Effect } from "effect";
import type { AuthError, AuthenticationError, AuthorizationError } from "./errors.js";
import { AuthContext } from "./types.js";

/**
 * API interface for the Auth Service.
 * Provides functionality for authentication and authorization.
 */
export interface AuthServiceApi {
    /**
     * Gets the current authenticated user's context.
     * @returns Effect yielding the current AuthContext
     */
    readonly getCurrentContext: () => Effect.Effect<AuthContext, AuthenticationError>;

    /**
     * Checks if the current context is authenticated.
     * @returns Effect yielding a boolean indicating authentication status
     */
    readonly isAuthenticated: () => Effect.Effect<boolean, never>;

    /**
     * Validates if the current context has the required roles.
     * @param requiredRoles Array of role names to check
     * @returns Effect yielding void if authorized, fails with AuthorizationError if not
     */
    readonly validateRoles: (requiredRoles: readonly string[]) => Effect.Effect<void, AuthorizationError>;

    /**
     * Validates if the current context has access to the specified tenant.
     * @param tenantId ID of the tenant to validate access for
     * @returns Effect yielding void if authorized, fails with AuthorizationError if not
     */
    readonly validateTenantAccess: (tenantId: string) => Effect.Effect<void, AuthorizationError>;

    /**
     * Updates the current auth context.
     * @param context New auth context to set
     * @returns Effect yielding void
     */
    readonly updateContext: (context: AuthContext) => Effect.Effect<void, AuthError>;
} 