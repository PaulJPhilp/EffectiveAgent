/**
 * @file Type definitions for the Auth Service.
 * @module services/core/auth/types
 */

/**
 * Represents an authenticated user's record.
 */
export interface AuthRecord {
    readonly userId: string;
    readonly tenantId?: string;
    readonly roles?: readonly string[];
    readonly [key: string]: unknown;
}

/**
 * Represents the current authentication context.
 */
export interface AuthContext {
    readonly isAuthenticated: boolean;
    readonly record?: AuthRecord;
    readonly timestamp: number;
} 