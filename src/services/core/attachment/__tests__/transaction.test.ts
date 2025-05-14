/**
 * @file Tests specifically for transaction support in the AttachmentService.
 */

import { Effect, Layer, Option } from "effect";
import { describe, expect, it } from "vitest";

import type { RepositoryServiceApi } from "../../repository/api.js";
import { EntityNotFoundError as RepoEntityNotFoundError, RepositoryError } from "../../repository/errors.js";
import { RepositoryService } from "../../repository/service.js";
import type { AttachmentLinkEntity } from "../schema.js";
import { AttachmentService, AttachmentServiceLive } from "../service.js";

describe("AttachmentService Transaction Support", () => {
    // Create a repository that will fail on specific conditions to test transactions
    const makeFailingAttachmentRepo = (): RepositoryServiceApi<AttachmentLinkEntity> => {
        // Track created entities to verify rollbacks work correctly
        const entities: Record<string, AttachmentLinkEntity> = {};

        return {
            create: (data: AttachmentLinkEntity["data"]) => {
                // Fail on specific entity to simulate partial failure
                if (data.entityB_id === 'will-fail') {
                    return Effect.fail(new RepositoryError({
                        message: "Simulated transaction failure",
                        entityType: "AttachmentLink"
                    }));
                }

                const newEntity = {
                    id: `entity-${crypto.randomUUID()}`,
                    createdAt: new Date(Date.now()).toISOString(),
                    updatedAt: new Date(Date.now()).toISOString(),
                    data
                } as AttachmentLinkEntity;

                // Record the entity 
                entities[newEntity.id] = newEntity;
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
                if (id === "fail-on-delete") {
                    return Effect.fail(new RepositoryError({
                        message: "Simulated delete failure",
                        entityType: "AttachmentLink"
                    }));
                }

                const existed = !!entities[id];
                delete entities[id];

                if (!existed) {
                    return Effect.fail(new RepoEntityNotFoundError({
                        entityId: id,
                        entityType: "AttachmentLink"
                    }) as unknown as RepositoryError);
                }

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
                createdAt: new Date(Date.now()).toISOString(),
                updatedAt: new Date(Date.now()).toISOString(),
                data: {
                    entityA_id: "source-id",
                    entityA_type: "SourceType",
                    entityB_id: "target-id",
                    entityB_type: "TargetType"
                }
            } as AttachmentLinkEntity),

            count: () => Effect.succeed(Object.keys(entities).length)
        };
    };

    // Create test data
    const createTestInputs = () => [
        {
            entityA_id: "source-1",
            entityA_type: "Source",
            entityB_id: "target-1",
            entityB_type: "Target"
        },
        {
            entityA_id: "source-2",
            entityA_type: "Source",
            entityB_id: "will-fail", // This one will trigger the failure
            entityB_type: "Target"
        },
        {
            entityA_id: "source-3",
            entityA_type: "Source",
            entityB_id: "target-3",
            entityB_type: "Target"
        }
    ];

    it("should ensure atomicity in createLinks (all succeed or none)", () =>
        Effect.gen(function* () {
            // Create a layer with our failing repo
            const FailingRepoLayer = Layer.succeed(
                RepositoryService<AttachmentLinkEntity>().Tag,
                makeFailingAttachmentRepo()
            );

            // Combine with attachment service layer
            const FailingTestLayer = Layer.provide(
                FailingRepoLayer,
                AttachmentServiceLive
            );

            // Run test with the failing layer
            const test = Effect.gen(function* () {
                // Get service from the context
                const service = yield* AttachmentService;

                // Create inputs where one will fail
                const inputs = createTestInputs();

                // Attempt to create the links with transaction support
                const result = yield* Effect.either(service.createLinks(inputs));

                // The operation should fail
                expect(result._tag).toBe("Left");

                // Now verify no links were created (rollback worked)
                const firstLinkQuery = yield* service.findLinksFrom("source-1", "Source");

                // There should be no links since the transaction rolled back
                expect(firstLinkQuery.length).toBe(0);
            });

            yield* test.pipe(Effect.provide(FailingTestLayer));
        })
    );

    it("should ensure atomicity in deleteLinksFrom (all succeed or none)", () =>
        Effect.gen(function* () {
            // Create a repo with special behavior for this test
            const specialRepo = makeFailingAttachmentRepo();

            // Create test links first, then fail on a specific delete
            const repoLayer = Layer.succeed(
                RepositoryService<AttachmentLinkEntity>().Tag,
                {
                    ...specialRepo,
                    create: (data) => Effect.succeed({
                        id: data.entityA_id === "source-2" ? "fail-on-delete" : `entity-${crypto.randomUUID()}`,
                        createdAt: new Date(Date.now()).toISOString(),
                        updatedAt: new Date(Date.now()).toISOString(),
                        data
                    } as AttachmentLinkEntity),
                }
            );

            // Combine with attachment service layer
            const testLayer = Layer.provide(
                repoLayer,
                AttachmentServiceLive
            );

            // Run test with the special layer
            const test = Effect.gen(function* () {
                const service = yield* AttachmentService;

                // First create several links for the same source entity
                const inputs = [
                    {
                        entityA_id: "source-1",
                        entityA_type: "SourceToDelete",
                        entityB_id: "target-1",
                        entityB_type: "Target"
                    },
                    {
                        entityA_id: "source-1",
                        entityA_type: "SourceToDelete",
                        entityB_id: "target-2",
                        entityB_type: "Target"
                    },
                    {
                        entityA_id: "source-2", // This will get ID 'fail-on-delete'
                        entityA_type: "SourceToDelete",
                        entityB_id: "target-3",
                        entityB_type: "Target"
                    }
                ];

                // Create the links first
                yield* service.createLinks(inputs);

                // Try to bulk delete the links, which should fail due to one link failing
                const result = yield* Effect.either(service.deleteLinksFrom("source-1", "SourceToDelete"));

                // Operation should fail
                expect(result._tag).toBe("Left");

                // Verify links are still there (deletion was rolled back)
                const remainingLinks = yield* service.findLinksFrom("source-1", "SourceToDelete");

                // Links should still be there due to transaction rollback
                expect(remainingLinks.length).toBe(2);
            });

            yield* test.pipe(Effect.provide(testLayer));
        })
    );

    it("should ensure atomicity in deleteLinksTo (all succeed or none)", () =>
        Effect.gen(function* () {
            // Create a repo with special behavior for this test
            const specialRepo = makeFailingAttachmentRepo();

            // Create test links first, then fail on a specific delete
            const repoLayer = Layer.succeed(
                RepositoryService<AttachmentLinkEntity>().Tag,
                {
                    ...specialRepo,
                    create: (data: AttachmentLinkEntity["data"]): Effect.Effect<never, RepositoryError, AttachmentLinkEntity> => Effect.succeed({
                        id: data.entityB_id === "target-2" ? "fail-on-delete" : `entity-${crypto.randomUUID()}`,
                        createdAt: new Date(Date.now()).toISOString(),
                        updatedAt: new Date(Date.now()).toISOString(),
                        data
                    } as AttachmentLinkEntity),
                } as ModifiedRepositoryConfig
            );

            // Combine with attachment service layer
            const testLayer = Layer.provide(
                repoLayer,
                AttachmentServiceLive
            );

            // Run test with the special layer
            const test = Effect.gen(function* () {
                const service = yield* AttachmentService;

                // First create several links for the same target entity
                const inputs = [
                    {
                        entityA_id: "source-1",
                        entityA_type: "Source",
                        entityB_id: "target-delete",
                        entityB_type: "TargetToDelete"
                    },
                    {
                        entityA_id: "source-2",
                        entityA_type: "Source",
                        entityB_id: "target-delete",
                        entityB_type: "TargetToDelete"
                    },
                    {
                        entityA_id: "source-3",
                        entityA_type: "Source",
                        entityB_id: "target-2", // This will get ID 'fail-on-delete'
                        entityB_type: "TargetToDelete"
                    }
                ];

                // Create the links first
                yield* service.createLinks(inputs);

                // Try to bulk delete the links, which should fail due to one link failing
                const result = yield* Effect.either(service.deleteLinksTo("target-delete", "TargetToDelete"));

                // Operation should fail
                expect(result._tag).toBe("Left");

                // Verify links are still there (deletion was rolled back)
                const remainingLinks = yield* service.findLinksTo("target-delete", "TargetToDelete");

                // Links should still be there due to transaction rollback
                expect(remainingLinks.length).toBe(2);
            });

            yield* test.pipe(Effect.provide(testLayer));
        })
    );
});
