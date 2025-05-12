import { createServiceTestHarness } from "@/services/core/test-harness/utils/service-test.js"
import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { AuthenticationError, AuthorizationError, InvalidAuthContextError } from "../errors.js"
import { AuthService } from "../service.js"
import type { AuthContext } from "../types.js"

describe("AuthService", () => {
    const serviceHarness = createServiceTestHarness(
        AuthService,
        () => Effect.gen(function* () {
            // Create test implementation
            const service = yield* AuthService
            return service
        })
    )

    describe("Authentication", () => {
        it("should handle concurrent authentication requests", () =>
            Effect.gen(function* () {
                const service = yield* AuthService
                const updates = Array.from({ length: 10 }, (_, i) => ({
                    isAuthenticated: true,
                    timestamp: Date.now(),
                    record: { userId: `user-${i}` }
                }))

                yield* Effect.all(
                    updates.map(ctx => service.updateContext(ctx)),
                    { concurrency: 5 }
                )

                const isAuth = yield* service.isAuthenticated()
                expect(isAuth).toBe(true)
            }).pipe(Effect.provide(serviceHarness.TestLayer)))

        it("should fail when getting context without authentication", () =>
            Effect.gen(function* () {
                const service = yield* AuthService
                const result = yield* Effect.either(service.getCurrentContext())

                expect(result._tag).toBe("Left")
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(AuthenticationError)
                }
            }).pipe(Effect.provide(serviceHarness.TestLayer)))
    })

    describe("Authorization", () => {
        it("should validate multiple roles correctly", () =>
            Effect.gen(function* () {
                const service = yield* AuthService
                yield* service.updateContext({
                    isAuthenticated: true,
                    timestamp: Date.now(),
                    record: {
                        userId: "test",
                        roles: ["admin", "user"]
                    }
                })

                yield* service.validateRoles(["admin", "user"])
            }).pipe(Effect.provide(serviceHarness.TestLayer)))

        it("should fail when missing required roles", () =>
            Effect.gen(function* () {
                const service = yield* AuthService
                yield* service.updateContext({
                    isAuthenticated: true,
                    timestamp: Date.now(),
                    record: {
                        userId: "test",
                        roles: ["user"]
                    }
                })

                const result = yield* Effect.either(service.validateRoles(["admin"]))
                expect(result._tag).toBe("Left")
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(AuthorizationError)
                }
            }).pipe(Effect.provide(serviceHarness.TestLayer)))
    })

    describe("Tenant Access", () => {
        it("should validate tenant access correctly", () =>
            Effect.gen(function* () {
                const service = yield* AuthService
                yield* service.updateContext({
                    isAuthenticated: true,
                    timestamp: Date.now(),
                    record: {
                        userId: "test",
                        tenantId: "tenant-1"
                    }
                })

                yield* service.validateTenantAccess("tenant-1")
            }).pipe(Effect.provide(serviceHarness.TestLayer)))

        it("should fail when accessing wrong tenant", () =>
            Effect.gen(function* () {
                const service = yield* AuthService
                yield* service.updateContext({
                    isAuthenticated: true,
                    timestamp: Date.now(),
                    record: {
                        userId: "test",
                        tenantId: "tenant-1"
                    }
                })

                const result = yield* Effect.either(service.validateTenantAccess("tenant-2"))
                expect(result._tag).toBe("Left")
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(AuthorizationError)
                }
            }).pipe(Effect.provide(serviceHarness.TestLayer)))
    })

    describe("Context Updates", () => {
        it("should handle invalid context updates", () =>
            Effect.gen(function* () {
                const service = yield* AuthService
                const result = yield* Effect.either(
                    service.updateContext({
                        isAuthenticated: true,
                        // Missing timestamp
                    } as any)
                )

                expect(result._tag).toBe("Left")
                if (result._tag === "Left") {
                    expect(result.left).toBeInstanceOf(InvalidAuthContextError)
                }
            }).pipe(Effect.provide(serviceHarness.TestLayer)))

        it("should update context successfully", () =>
            Effect.gen(function* () {
                const service = yield* AuthService
                const context: AuthContext = {
                    isAuthenticated: true,
                    timestamp: Date.now(),
                    record: {
                        userId: "test",
                        roles: ["user"],
                        tenantId: "tenant-1"
                    }
                }

                yield* service.updateContext(context)
                const currentContext = yield* service.getCurrentContext()
                expect(currentContext).toEqual(context)
            }).pipe(Effect.provide(serviceHarness.TestLayer)))
    })
}) 