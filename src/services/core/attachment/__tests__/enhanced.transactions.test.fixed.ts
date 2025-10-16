/**
 * @file Enhanced tests for transaction support in the AttachmentService.
 */

import crypto from 'node:crypto';
import { Effect, Layer, Option } from "effect";
import { describe, expect, it } from "vitest";

import { EntityNotFoundError as RepoEntityNotFoundError, RepositoryError } from "../../repository/errors.js";
import { RepositoryService } from "../../repository/service.js";
import { AttachmentTransactionError, AttachmentValidationError } from "../errors.js";
import type { AttachmentLinkEntity } from "../schema.js";
import { AttachmentService } from "../service.js";
import type { CreateAttachmentLinkInput } from "../types.js";

describe("Enhanced AttachmentService Transaction Support", () => {
    /**
     * Create a repository that will fail under specific test conditions.
     * This allows us to test various scenarios of transaction failures.
     */
    const makeAdvancedTestRepo = (config: {
        failOnCreate?: string[];
        failOnDelete?: string[];
        requestsBeforeFailure?: number; // Will fail after this many requests
        simulateNetworkIssue?: boolean;
    } = {}) => {
        // Track entities to simulate a database
        const entities: Record<string, AttachmentLinkEntity> = {};
        let requestCount = 0;

        return {
            create: (data: AttachmentLinkEntity["data"]) => {
                // Count requests to simulate failure after N requests
                requestCount++;

                // Simulate network issue
                if (config.simulateNetworkIssue && Math.random() < 0.2) {
                    return Effect.fail(new RepositoryError({
                        message: "Simulated network connectivity issue",
                        entityType: "AttachmentLink"
                    }));
                }

                // Fail after N requests if configured
                if (config.requestsBeforeFailure && requestCount >= config.requestsBeforeFailure) {
                    return Effect.fail(new RepositoryError({
                        message: "Simulated failure after too many requests",
                        entityType: "AttachmentLink"
                    }));
                }

                // Fail on specific entity IDs
                if (config.failOnCreate &&
                    (config.failOnCreate.includes(data.entityA_id) ||
                        config.failOnCreate.includes(data.entityB_id))) {
                    return Effect.fail(new RepositoryError({
                        message: "Simulated create failure for specific entity",
                        entityType: "AttachmentLink"
                    }));
                }

                const id = `entity-${crypto.randomUUID()}`;
                const newEntity: AttachmentLinkEntity = {
                    id,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    data
                };

                entities[id] = newEntity;
                return Effect.succeed(newEntity);
            },

            findById: (id: string) => {
                const entity = entities[id];
                if (!entity) {
                    return Effect.succeed(Option.none<AttachmentLinkEntity>());
                }
                return Effect.succeed(Option.some(entity));
            },

            delete: (id: string) => {
                // Fail on specific entity IDs
                if (config.failOnDelete?.includes(id)) {
                    return Effect.fail(new RepositoryError({
                        message: "Simulated delete failure for specific entity",
                        entityType: "AttachmentLink"
                    }));
                }

                // Simulate network issue
                if (config.simulateNetworkIssue && Math.random() < 0.2) {
                    return Effect.fail(new RepositoryError({
                        message: "Simulated network connectivity issue during delete",
                        entityType: "AttachmentLink"
                    }));
                }

                if (!entities[id]) {
                    return Effect.fail(new RepoEntityNotFoundError({
                        entityId: id,
                        entityType: "AttachmentLink"
                    }) as unknown as RepositoryError);
                }

                delete entities[id];
                return Effect.succeed(undefined);
            },

            findOne: () => Effect.succeed(Option.none()),

            findMany: (options?: any) => {
                const filter = options?.filter || {};
                const results: AttachmentLinkEntity[] = [];

                // Filter entities based on criteria
                Object.values(entities).forEach(entity => {
                    let match = true;

                    if (filter.entityA_id && entity.data.entityA_id !== filter.entityA_id) {
                        match = false;
                    }

                    if (filter.entityA_type && entity.data.entityA_type !== filter.entityA_type) {
                        match = false;
                    }

                    if (filter.entityB_id && entity.data.entityB_id !== filter.entityB_id) {
                        match = false;
                    }

                    if (filter.entityB_type && entity.data.entityB_type !== filter.entityB_type) {
                        match = false;
                    }

                    if (match) {
                        results.push(entity);
                    }
                });

                return Effect.succeed(results);
            },

            update: () => Effect.succeed({
                id: "test-id",
                createdAt: new Date(),
                updatedAt: new Date(),
                data: {
                    entityA_id: "source-id",
                    entityA_type: "SourceType",
                    entityB_id: "target-id",
                    entityB_type: "TargetType"
                }
            } as AttachmentLinkEntity),

            count: () => Effect.succeed(Object.keys(entities).length),

            // For testing purposes - allow us to see what's in the repo
            getAll: () => Object.values(entities)
        };
    };

    // Test input validation
    describe("Input validation", () => {
        it("should reject invalid inputs in createLinks", () =>
            Effect.gen(function* () {
                // Create a layer with standard repo
                const repoLayer = Layer.succeed(
                    RepositoryService<AttachmentLinkEntity>().Tag,
                    makeAdvancedTestRepo()
                );

                // Combine with attachment service layer
                const testLayer = Layer.provide(
                    AttachmentService.Default,
                    repoLayer
                );

                // Run test with the layer
                const test = Effect.gen(function* () {
                    const service = yield* AttachmentService;

                    // Try to create links with invalid inputs
                    const invalidInputs = [
                        {
                            // Missing entityA_id
                            entityA_type: "Source",
                            entityB_id: "target-1",
                            entityB_type: "Target"
                        },
                        {
                            entityA_id: "source-1",
                            // Missing entityA_type
                            entityB_id: "target-2",
                            entityB_type: "Target"
                        }
                    ] as any[];

                    // Attempt to create the links with validation
                    const result = yield* Effect.either(service.createLinks(invalidInputs));

                    // Should fail with validation error
                    expect(result._tag).toBe("Left");
                    if (result._tag === "Left") {
                        expect(result.left).toBeInstanceOf(AttachmentValidationError);
                        const error = result.left as AttachmentValidationError;
                        expect(error.validationIssues.length).toBe(2);
                    }
                });

                yield* test.pipe(Effect.provide(testLayer));
            })
        );
    });

    // Test createLinks transaction support
    describe("createLinks transaction", () => {
        it("should handle partial failures and roll back successfully", () =>
            Effect.gen(function* () {
                // Create a failing repo that fails when creating a link with specific entityB_id
                const failingRepoImpl = makeAdvancedTestRepo({
                    failOnCreate: ["will-fail"]
                });

                const repoLayer = Layer.succeed(
                    RepositoryService<AttachmentLinkEntity>().Tag,
                    failingRepoImpl
                );

                // Combine with attachment service layer
                const testLayer = Layer.provide(
                    AttachmentService.Default,
                    repoLayer
                );

                // Run test with the layer
                const test = Effect.gen(function* () {
                    const service = yield* AttachmentService;
                    const repo = yield* RepositoryService<AttachmentLinkEntity>().Tag;

                    // Create inputs where one will fail
                    const inputs = [
                        {
                            entityA_id: "source-1",
                            entityA_type: "Source",
                            entityB_id: "target-1",
                            entityB_type: "Target"
                        },
                        {
                            entityA_id: "source-2",
                            entityA_type: "Source",
                            entityB_id: "will-fail", // This will trigger a failure
                            entityB_type: "Target"
                        },
                        {
                            entityA_id: "source-3",
                            entityA_type: "Source",
                            entityB_id: "target-3",
                            entityB_type: "Target"
                        }
                    ];

                    // Attempt to create the links with transaction support
                    const result = yield* Effect.either(service.createLinks(inputs));

                    // The operation should fail
                    expect(result._tag).toBe("Left");
                    if (result._tag === "Left") {
                        expect(result.left).toBeInstanceOf(AttachmentTransactionError);
                        const error = result.left as AttachmentTransactionError;
                        expect(error.operation).toBe("createLinks");
                        expect(error.completedCount).toBe(1); // First one succeeded before failure
                        expect(error.totalCount).toBe(3);
                    }

                    // Verify no links remain after rollback
                    const allLinks = (repo as any).getAll();
                    expect(allLinks.length).toBe(0);
                });

                yield* test.pipe(Effect.provide(testLayer));
            })
        );

        it("should handle rollback failures and report critical errors", () =>
            Effect.gen(function* () {
                // Create a mock repository factory with custom rollback failure behavior
                const makeCustomFailingRepo = () => {
                    // Track entities and delete calls
                    const entities: Record<string, AttachmentLinkEntity> = {};
                    let deleteCount = 0;

                    return {
                        create: (data: AttachmentLinkEntity["data"]) => {
                            // Fail on specific entity ID to simulate partial failure
                            if (data.entityB_id === 'will-fail') {
                                return Effect.fail(new RepositoryError({
                                    message: "Simulated transaction failure",
                                    entityType: "AttachmentLink"
                                }));
                            }

                            const newEntity: AttachmentLinkEntity = {
                                id: `entity-${crypto.randomUUID()}`,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                data
                            };

                            entities[newEntity.id] = newEntity;
                            return Effect.succeed(newEntity);
                        },

                        // Custom delete implementation that fails on first call
                        delete: (id: string) => {
                            deleteCount++;
                            // Fail on the first delete to simulate rollback failure
                            if (deleteCount === 1) {
                                return Effect.fail(new RepositoryError({
                                    message: "Simulated rollback failure",
                                    entityType: "AttachmentLink"
                                }));
                            }

                            if (!entities[id]) {
                                return Effect.fail(new RepoEntityNotFoundError({
                                    entityId: id,
                                    entityType: "AttachmentLink"
                                }) as unknown as RepositoryError);
                            }

                            delete entities[id];
                            return Effect.succeed(undefined);
                        },

                        // Implement other required repository methods
                        findById: (id: string) => {
                            const entity = entities[id];
                            if (!entity) {
                                return Effect.succeed(Option.none<AttachmentLinkEntity>());
                            }
                            return Effect.succeed(Option.some(entity));
                        },

                        findOne: () => Effect.succeed(Option.none()),

                        findMany: (options?: any) => {
                            const filter = options?.filter || {};
                            const results: AttachmentLinkEntity[] = [];

                            Object.values(entities).forEach(entity => {
                                let match = true;

                                if (filter.entityA_id && entity.data.entityA_id !== filter.entityA_id) {
                                    match = false;
                                }

                                if (filter.entityA_type && entity.data.entityA_type !== filter.entityA_type) {
                                    match = false;
                                }

                                if (filter.entityB_id && entity.data.entityB_id !== filter.entityB_id) {
                                    match = false;
                                }

                                if (filter.entityB_type && entity.data.entityB_type !== filter.entityB_type) {
                                    match = false;
                                }

                                if (match) {
                                    results.push(entity);
                                }
                            });

                            return Effect.succeed(results);
                        },

                        update: () => Effect.succeed({
                            id: "test-id",
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            data: {
                                entityA_id: "source-id",
                                entityA_type: "SourceType",
                                entityB_id: "target-id",
                                entityB_type: "TargetType"
                            }
                        } as AttachmentLinkEntity),

                        count: () => Effect.succeed(Object.keys(entities).length),

                        // For testing purposes
                        getAll: () => Object.values(entities)
                    };
                };

                // Create our custom repo with the factory function
                const failingRepo = makeCustomFailingRepo();

                // Create repository layer
                const repoLayer = Layer.succeed(
                    RepositoryService<AttachmentLinkEntity>().Tag,
                    failingRepo
                );

                // Combine with attachment service layer
                const testLayer = Layer.provide(
                    AttachmentService.Default,
                    repoLayer
                );

                // Run test with the layer
                const test = Effect.gen(function* () {
                    const service = yield* AttachmentService;

                    // Create multiple links where one will fail, but rollback will also partially fail
                    const inputs: CreateAttachmentLinkInput[] = [
                        {
                            entityA_id: "source-1",
                            entityA_type: "Source",
                            entityB_id: "target-1",
                            entityB_type: "Target"
                        },
                        {
                            entityA_id: "source-2",
                            entityA_type: "Source",
                            entityB_id: "will-fail", // This will trigger a failure
                            entityB_type: "Target"
                        },
                        {
                            entityA_id: "source-3",
                            entityA_type: "Source",
                            entityB_id: "target-3",
                            entityB_type: "Target"
                        }
                    ];

                    // Attempt to create the links with transaction support
                    const result = yield* Effect.either(service.createLinks(inputs));

                    // Should fail with transaction error
                    expect(result._tag).toBe("Left");
                    if (result._tag === "Left") {
                        expect(result.left).toBeInstanceOf(AttachmentTransactionError);
                        const error = result.left as AttachmentTransactionError;
                        expect(error.operation).toBe("createLinks");
                        expect(error.cause).toBeDefined(); // Should contain inner error about rollback
                    }

                    // Check for remaining links (rollback was only partial due to failures)
                    const remainingLinks = (failingRepo as any).getAll();
                    expect(remainingLinks).toBeDefined();
                    expect(remainingLinks.length).toBeGreaterThan(0); // Some links should remain due to failed rollback
                });

                yield* test.pipe(Effect.provide(testLayer));
            })
        );

        // Add more tests for createLinks transaction support here
    });

    // Test deleteLinksFrom transaction support
    describe("deleteLinksFrom transaction", () => {
        it("should delete all links from a source entity in one transaction", () =>
            Effect.gen(function* () {
                // Create a standard repository
                const repo = makeAdvancedTestRepo();

                const repoLayer = Layer.succeed(
                    RepositoryService<AttachmentLinkEntity>().Tag,
                    repo
                );

                const testLayer = Layer.provide(
                    AttachmentService.Default,
                    repoLayer
                );

                // Run test with the layer
                const test = Effect.gen(function* () {
                    const service = yield* AttachmentService;

                    // First, create multiple links
                    const links = [
                        {
                            entityA_id: "source-1",
                            entityA_type: "Source",
                            entityB_id: "target-1",
                            entityB_type: "Target"
                        },
                        {
                            entityA_id: "source-1", // Same source
                            entityA_type: "Source",
                            entityB_id: "target-2",
                            entityB_type: "Target"
                        },
                        {
                            entityA_id: "source-1", // Same source
                            entityA_type: "Source",
                            entityB_id: "target-3",
                            entityB_type: "Target"
                        }
                    ];

                    // Create the links
                    yield* service.createLinks(links);

                    // Verify links were created
                    const initialLinks = (repo as any).getAll();
                    expect(initialLinks.length).toBe(3);

                    // Delete all links from the source
                    yield* service.deleteLinksFrom("source-1", "Source");

                    // Verify all links are gone
                    const remainingLinks = (repo as any).getAll();
                    expect(remainingLinks.length).toBe(0);
                });

                yield* test.pipe(Effect.provide(testLayer));
            })
        );

        it("should handle errors during bulk delete and rollback successfully", () =>
            Effect.gen(function* () {
                // Create repository with delete failure for specific ID
                // We'll set this up after we create some links
                const entityIdsToFail: string[] = [];

                const repoWithFailingDelete = makeAdvancedTestRepo();

                // Create a custom implementation of delete that will fail for specific IDs
                const originalDelete = repoWithFailingDelete.delete;
                const customDelete = (id: string) => {
                    if (entityIdsToFail.includes(id)) {
                        return Effect.fail(new RepositoryError({
                            message: "Simulated delete failure for entity",
                            entityType: "AttachmentLink"
                        }));
                    }
                    return originalDelete(id);
                };

                // Apply the custom delete implementation
                const repoWithCustomDelete = {
                    ...repoWithFailingDelete,
                    delete: customDelete
                };

                const repoLayer = Layer.succeed(
                    RepositoryService<AttachmentLinkEntity>().Tag,
                    repoWithCustomDelete
                );

                const testLayer = Layer.provide(
                    AttachmentService.Default,
                    repoLayer
                );

                // Run test with the layer
                const test = Effect.gen(function* () {
                    const service = yield* AttachmentService;

                    // First, create multiple links
                    const links = [
                        {
                            entityA_id: "batch-source",
                            entityA_type: "Source",
                            entityB_id: "target-1",
                            entityB_type: "Target",
                            metadata: { key: "batch-info", value: { index: 1, batchTest: true } }
                        },
                        {
                            entityA_id: "batch-source",
                            entityA_type: "Source",
                            entityB_id: "target-2",
                            entityB_type: "Target",
                            metadata: { key: "batch-info", value: { index: 2, batchTest: true } }
                        },
                        {
                            entityA_id: "batch-source",
                            entityA_type: "Source",
                            entityB_id: "target-3",
                            entityB_type: "Target",
                            metadata: { key: "batch-info", value: { index: 3, batchTest: true } }
                        }
                    ];

                    // Create the links
                    yield* service.createLinks(links);

                    // Get all links and mark one to fail during deletion
                    const allLinks = (repoWithCustomDelete as any).getAll();
                    expect(allLinks.length).toBe(3);

                    // Mark the second link to fail when trying to delete
                    entityIdsToFail.push(allLinks[1].id);

                    // Now try to delete all links from the source - one should fail
                    const result = yield* Effect.either(service.deleteLinksFrom("batch-source", "Source"));

                    // Should fail with transaction error
                    expect(result._tag).toBe("Left");
                    if (result._tag === "Left") {
                        expect(result.left).toBeInstanceOf(AttachmentTransactionError);
                        const error = result.left as AttachmentTransactionError;
                        expect(error.operation).toBe("deleteLinksFrom");
                    }

                    // Verify no links were deleted (rollback successful)
                    const remainingLinks = (repoWithCustomDelete as any).getAll();
                    expect(remainingLinks.length).toBe(3); // All links should be restored
                });

                yield* test.pipe(Effect.provide(testLayer));
            })
        );

        // Add more tests for deleteLinksFrom here
    });

    // Test deleteLinksTo transaction support
    describe("deleteLinksTo transaction", () => {
        it("should delete all links to a target entity in one transaction", () =>
            Effect.gen(function* () {
                // Create a standard repository
                const repo = makeAdvancedTestRepo();

                const repoLayer = Layer.succeed(
                    RepositoryService<AttachmentLinkEntity>().Tag,
                    repo
                );

                const testLayer = Layer.provide(
                    AttachmentService.Default,
                    repoLayer
                );

                // Run test with the layer
                const test = Effect.gen(function* () {
                    const service = yield* AttachmentService;

                    // First, create multiple links to the same target
                    const links = [
                        {
                            entityA_id: "source-1",
                            entityA_type: "Source",
                            entityB_id: "common-target",
                            entityB_type: "Target"
                        },
                        {
                            entityA_id: "source-2",
                            entityA_type: "Source",
                            entityB_id: "common-target", // Same target
                            entityB_type: "Target"
                        },
                        {
                            entityA_id: "source-3",
                            entityA_type: "Source",
                            entityB_id: "common-target", // Same target
                            entityB_type: "Target"
                        }
                    ];

                    // Create the links
                    yield* service.createLinks(links);

                    // Verify links were created
                    const initialLinks = (repo as any).getAll();
                    expect(initialLinks.length).toBe(3);

                    // Delete all links to the target
                    yield* service.deleteLinksTo("common-target", "Target");

                    // Verify all links are gone
                    const remainingLinks = (repo as any).getAll();
                    expect(remainingLinks.length).toBe(0);
                });

                yield* test.pipe(Effect.provide(testLayer));
            })
        );

        // Add more tests for deleteLinksTo here
    });

    // Additional transaction tests
    describe("Advanced transaction scenarios", () => {
        it("should handle network issues gracefully during batch operations", () =>
            Effect.gen(function* () {
                // Create a repo that simulates random network issues
                const repoWithNetworkIssues = makeAdvancedTestRepo({
                    simulateNetworkIssue: true
                });

                const repoLayer = Layer.succeed(
                    RepositoryService<AttachmentLinkEntity>().Tag,
                    repoWithNetworkIssues
                );

                const testLayer = Layer.provide(
                    AttachmentService.Default,
                    repoLayer
                );

                // Run test with the layer
                const test = Effect.gen(function* () {
                    const service = yield* AttachmentService;

                    // Create a large batch of links to increase chance of triggering network issue
                    const links = Array.from({ length: 20 }, (_, i) => ({
                        entityA_id: "network-source",
                        entityA_type: "Source",
                        entityB_id: `network-target-${i}`,
                        entityB_type: "Target",
                        metadata: { key: "index", value: i }
                    }));

                    // Attempt to create links - may succeed or fail due to network issue simulation
                    const result = yield* Effect.either(service.createLinks(links));

                    // Regardless of success or failure, the system should remain consistent
                    if (result._tag === "Left") {
                        // If it failed, check for the right error type
                        expect(result.left).toBeInstanceOf(AttachmentTransactionError);

                        // Verify all links were rolled back
                        const remainingLinks = (repoWithNetworkIssues as any).getAll();
                        expect(remainingLinks.length).toBe(0);
                    } else {
                        // If it succeeded, all links should be created
                        const createdLinks = (repoWithNetworkIssues as any).getAll();
                        expect(createdLinks.length).toBe(links.length);

                        // Clean up 
                        yield* service.deleteLinksFrom("network-source", "Source");

                        // Verify all are gone
                        const remainingLinks = (repoWithNetworkIssues as any).getAll();
                        expect(remainingLinks.length).toBe(0);
                    }
                });

                yield* test.pipe(Effect.provide(testLayer));
            })
        );
    });
});
