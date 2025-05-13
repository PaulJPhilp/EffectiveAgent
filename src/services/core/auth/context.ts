import { Effect } from "effect"

/**
 * Auth context interface defining user and tenant information
 */
export interface AuthContext {
    readonly userId: string
    readonly tenantId: string
}

/**
 * Auth service implementation using Effect.Service pattern
 */
export class Auth extends Effect.Service<AuthContext>()("Auth", {
    effect: Effect.succeed({
        userId: "",
        tenantId: ""
    })
}) { }