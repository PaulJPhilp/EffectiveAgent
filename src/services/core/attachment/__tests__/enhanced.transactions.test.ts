/**
 * @file Enhanced tests for transaction support in the AttachmentService.
 */

import { Effect, Layer, Option } from "effect";
import { describe, expect, it } from "vitest";

import type { RepositoryServiceApi } from "../../repository/api.js";
import {
  EntityNotFoundError as RepoEntityNotFoundError,
  RepositoryError,
} from "../../repository/errors.js";
import { RepositoryService } from "../../repository/service.js";
import {
  AttachmentTransactionError,
  AttachmentValidationError,
} from "../errors.js";
import type { AttachmentLinkEntity } from "../schema.js";
import { AttachmentService } from "../service.js";

// Local Effect.Service for test repository
class TestAttachmentLinkRepositoryService extends Effect.Service<
  RepositoryServiceApi<AttachmentLinkEntity>
>()("TestAttachmentLinkRepositoryService", { succeed: {} }) {}

describe("Enhanced AttachmentService Transaction Support", () => {
  /**
   * Create a repository that will fail under specific test conditions.
   * This allows us to test various scenarios of transaction failures.
   */
  const makeAdvancedTestRepo = (
    config: {
      failOnCreate?: string[];
      failOnDelete?: string[];
      requestsBeforeFailure?: number; // Will fail after this many requests
      simulateNetworkIssue?: boolean;
      customCreateFn?: (
        data: AttachmentLinkEntity["data"]
      ) => Effect.Effect<AttachmentLinkEntity, RepositoryError>;
      customDeleteFn?: (
        id: string
      ) => Effect.Effect<void, RepositoryError | RepoEntityNotFoundError>;
      trackCreatedIds?: string[]; // Optional array to track created IDs
      deleteCallCounter?: { count: number }; // Optional counter to track delete calls
    } = {}
  ): RepositoryServiceApi<AttachmentLinkEntity> => {
    // Track entities to simulate a database
    const entities: Record<string, AttachmentLinkEntity> = {};
    let requestCount = 0;

    // Default create implementation
    const defaultCreate = (data: AttachmentLinkEntity["data"]) => {
      // Count requests to simulate failure after N requests
      requestCount++;

      // Simulate network issue
      if (config.simulateNetworkIssue && Math.random() < 0.2) {
        return Effect.fail(
          new RepositoryError({
            message: "Simulated network connectivity issue",
            entityType: "AttachmentLink",
          })
        );
      }

      // Fail after N requests if configured
      if (
        config.requestsBeforeFailure &&
        requestCount >= config.requestsBeforeFailure
      ) {
        return Effect.fail(
          new RepositoryError({
            message: "Simulated failure after too many requests",
            entityType: "AttachmentLink",
          })
        );
      }

      // Fail on specific entity IDs
      if (
        config.failOnCreate &&
        (config.failOnCreate.includes(data.entityA_id) ||
          config.failOnCreate.includes(data.entityB_id))
      ) {
        return Effect.fail(
          new RepositoryError({
            message: "Simulated create failure for specific entity",
            entityType: "AttachmentLink",
          })
        );
      }

      const id = `entity-${crypto.randomUUID()}`;
      const newEntity = {
        id,
        createdAt: new Date(Date.now()),
        updatedAt: new Date(Date.now()),
        data,
      } as AttachmentLinkEntity;

      entities[id] = newEntity;
      return Effect.succeed(newEntity);
    };

    return {
      create: config.customCreateFn ?? defaultCreate,
      findById: (id: string) => {
        const entity = entities[id];
        if (!entity) {
          return Effect.succeed(Option.none<AttachmentLinkEntity>());
        }
        return Effect.succeed(Option.some(entity));
      },
      delete: (id: string) => {
        if (config.failOnDelete?.includes(id)) {
          return Effect.fail(
            new RepositoryError({
              message: "Simulated delete failure for specific entity",
              entityType: "AttachmentLink",
            })
          );
        }
        if (config.simulateNetworkIssue && Math.random() < 0.2) {
          return Effect.fail(
            new RepositoryError({
              message: "Simulated network connectivity issue during delete",
              entityType: "AttachmentLink",
            })
          );
        }
        if (!entities[id]) {
          return Effect.fail(
            new RepoEntityNotFoundError({
              entityId: id,
              entityType: "AttachmentLink",
            }) as unknown as RepositoryError
          );
        }
        delete entities[id];
        return Effect.succeed(undefined);
      },
      findOne: () => Effect.succeed(Option.none()),
      findMany: (options?: any) => {
        const filter = options?.filter || {};
        const results: AttachmentLinkEntity[] = [];
        Object.values(entities).forEach((entity) => {
          let match = true;
          if (
            filter.entityA_id &&
            entity.data.entityA_id !== filter.entityA_id
          ) {
            match = false;
          }
          if (
            filter.entityA_type &&
            entity.data.entityA_type !== filter.entityA_type
          ) {
            match = false;
          }
          if (
            filter.entityB_id &&
            entity.data.entityB_id !== filter.entityB_id
          ) {
            match = false;
          }
          if (
            filter.entityB_type &&
            entity.data.entityB_type !== filter.entityB_type
          ) {
            match = false;
          }
          if (match) {
            results.push(entity);
          }
        });
        return Effect.succeed(results);
      },
      update: () =>
        Effect.succeed({
          id: "test-id",
          createdAt: new Date(Date.now()),
          updatedAt: new Date(Date.now()),
          data: {
            entityA_id: "source-id",
            entityA_type: "SourceType",
            entityB_id: "target-id",
            entityB_type: "TargetType",
          },
        } as AttachmentLinkEntity),
      count: () => Effect.succeed(Object.keys(entities).length),
    } satisfies RepositoryServiceApi<AttachmentLinkEntity>;
  };

  // Test input validation
  describe("Input validation", () => {
    it("should reject invalid inputs in createLinks", () =>
      Effect.gen(function* () {
        // Create a layer with standard repo
        const repoLayer = Layer.succeed(
          TestAttachmentLinkRepositoryService,
          makeAdvancedTestRepo()
        );

        // Combine with attachment service layer
        const testLayer = Layer.provideMerge(
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
              entityB_type: "Target",
            },
            {
              entityA_id: "source-1",
              // Missing entityA_type
              entityB_id: "target-2",
              entityB_type: "Target",
            },
          ] as any[];

          // Attempt to create the links with validation
          const result = yield* Effect.either(
            service.createLinks(invalidInputs)
          );

          // Should fail with validation error
          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(AttachmentValidationError);
            const error = result.left as AttachmentValidationError;
            expect(error.validationIssues.length).toBe(2);
          }
        });

        yield* test.pipe(Effect.provide(testLayer));
      }));
  });

  // Test createLinks transaction support
  describe("createLinks transaction", () => {
    it("should handle partial failures and roll back successfully", () =>
      Effect.gen(function* () {
        // Create a failing repo that fails when creating a link with specific entityB_id
        const repoLayer = Layer.succeed(
          TestAttachmentLinkRepositoryService,
          makeAdvancedTestRepo({
            failOnCreate: ["will-fail"],
          })
        );

        // Combine with attachment service layer
        const testLayer = Layer.provideMerge(
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
              entityB_type: "Target",
            },
            {
              entityA_id: "source-2",
              entityA_type: "Source",
              entityB_id: "will-fail", // This will trigger a failure
              entityB_type: "Target",
            },
            {
              entityA_id: "source-3",
              entityA_type: "Source",
              entityB_id: "target-3",
              entityB_type: "Target",
            },
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
      }));

    it("should handle rollback failures and report critical errors", () =>
      Effect.gen(function* () {
        // Create a mock repository factory that includes customized behavior
        const makeCustomFailingRepo =
          (): RepositoryServiceApi<AttachmentLinkEntity> => {
            // Track entities and delete calls
            const entities: Record<string, AttachmentLinkEntity> = {};
            let deleteCount = 0;

            return {
              create: (data: AttachmentLinkEntity["data"]) => {
                // Fail on specific entity ID to simulate partial failure
                if (data.entityB_id === "will-fail") {
                  return Effect.fail(
                    new RepositoryError({
                      message: "Simulated transaction failure",
                      entityType: "AttachmentLink",
                    })
                  );
                }

                const newEntity = {
                  id: `entity-${crypto.randomUUID()}`,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  data,
                } as AttachmentLinkEntity;

                entities[newEntity.id] = newEntity;
                return Effect.succeed(newEntity);
              },

              // Custom delete implementation that fails on first call
              delete: (id: string) => {
                deleteCount++;
                // Fail on the first delete to simulate rollback failure
                if (deleteCount === 1) {
                  return Effect.fail(
                    new RepositoryError({
                      message: "Simulated rollback failure",
                      entityType: "AttachmentLink",
                    })
                  );
                }

                if (!entities[id]) {
                  return Effect.fail(
                    new RepoEntityNotFoundError({
                      entityId: id,
                      entityType: "AttachmentLink",
                    }) as unknown as RepositoryError
                  );
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

                Object.values(entities).forEach((entity) => {
                  let match = true;

                  if (
                    filter.entityA_id &&
                    entity.data.entityA_id !== filter.entityA_id
                  ) {
                    match = false;
                  }

                  if (
                    filter.entityA_type &&
                    entity.data.entityA_type !== filter.entityA_type
                  ) {
                    match = false;
                  }

                  if (
                    filter.entityB_id &&
                    entity.data.entityB_id !== filter.entityB_id
                  ) {
                    match = false;
                  }

                  if (
                    filter.entityB_type &&
                    entity.data.entityB_type !== filter.entityB_type
                  ) {
                    match = false;
                  }

                  if (match) {
                    results.push(entity);
                  }
                });

                return Effect.succeed(results);
              },

              update: () =>
                Effect.succeed({
                  id: "test-id",
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  data: {
                    entityA_id: "source-id",
                    entityA_type: "SourceType",
                    entityB_id: "target-id",
                    entityB_type: "TargetType",
                  },
                } as AttachmentLinkEntity),

              count: () => Effect.succeed(Object.keys(entities).length),
            };
          };

        // Create our custom repo with the factory function
        const failingRepo = makeCustomFailingRepo();

        // Create a layer for the repository service
        const repoLayer = Layer.succeed(
          TestAttachmentLinkRepositoryService,
          failingRepo
        );

        // Combine with attachment service layer - matching the pattern in transaction.test.ts
        const testLayer = Layer.provideMerge(
          AttachmentService.Default,
          repoLayer
        );

        // Run test with the layer
        const test = Effect.gen(function* () {
          const service = yield* AttachmentService;

          // Create multiple links where one will fail, but rollback will also partially fail
          const inputs = [
            {
              entityA_id: "source-1",
              entityA_type: "Source",
              entityB_id: "target-1",
              entityB_type: "Target",
            },
            {
              entityA_id: "source-2",
              entityA_type: "Source",
              entityB_id: "target-2",
              entityB_type: "Target",
            },
            {
              entityA_id: "source-3",
              entityA_type: "Source",
              entityB_id: "will-fail", // This will trigger a failure
              entityB_type: "Target",
            },
          ];

          // Attempt to create the links with transaction support
          const result = yield* Effect.either(service.createLinks(inputs));

          // The operation should fail with a transaction error
          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(AttachmentTransactionError);
            const error = result.left as AttachmentTransactionError;
            expect(error.operation).toBe("createLinks");
            // Message should indicate rollback failure
            expect(error.message).toContain("rollback");
          }
        });

        yield* test.pipe(Effect.provide(testLayer));
      }));
  });

  // Test deleteLinksFrom transaction support
  describe("deleteLinksFrom transaction", () => {
    it("should delete all links and report count on success", () =>
      Effect.gen(function* () {
        // Create a standard test repo
        const repo = makeAdvancedTestRepo();
        const repoLayer = Layer.succeed(
          TestAttachmentLinkRepositoryService,
          repo
        );

        // Combine with attachment service layer
        const testLayer = Layer.provideMerge(
          AttachmentService.Default,
          repoLayer
        );

        // Run test with the layer
        const test = Effect.gen(function* () {
          const service = yield* AttachmentService;

          // First create several links for testing
          const links = yield* service.createLinks([
            {
              entityA_id: "source-1",
              entityA_type: "Source",
              entityB_id: "target-1",
              entityB_type: "Target",
            },
            {
              entityA_id: "source-1",
              entityA_type: "Source",
              entityB_id: "target-2",
              entityB_type: "Target",
            },
            {
              entityA_id: "source-1",
              entityA_type: "Source",
              entityB_id: "target-3",
              entityB_type: "Target",
            },
          ]);

          expect(links.length).toBe(3);

          // Now delete all links from source-1
          const result = yield* service.deleteLinksFrom("source-1", "Source");

          // Should report 3 deleted links
          expect(result).toBe(3);

          // Verify no links remain
          const remainingLinks = yield* service.findLinksFrom(
            "source-1",
            "Source"
          );
          expect(remainingLinks).toHaveLength(0);
        });

        yield* test.pipe(Effect.provide(testLayer));
      }));

    it("should roll back partial deletions on failure", () =>
      Effect.gen(function* () {
        // Create a repo that will fail on specific deletes
        const _repo = makeAdvancedTestRepo();

        // Track created entity IDs and delete counter
        const createdIds: string[] = [];
        let deleteCounter = 0;

        // Create a repository with custom behavior for this test
        const customRepo = {
          ...makeAdvancedTestRepo(),
          // Custom create implementation that tracks created IDs
          create: (data: AttachmentLinkEntity["data"]) => {
            return Effect.gen(function* () {
              // Create the entity using the standard implementation
              const entity = yield* Effect.succeed({
                id: `entity-${crypto.randomUUID()}`,
                createdAt: new Date(Date.now()),
                updatedAt: new Date(Date.now()),
                data,
              } as AttachmentLinkEntity);

              // Track the ID
              createdIds.push(entity.id);
              return entity;
            });
          },

          // Custom delete implementation that fails on the second call
          delete: (id: string) => {
            deleteCounter++;
            // Make the second delete fail
            if (deleteCounter === 2) {
              return Effect.fail(
                new RepositoryError({
                  message: "Simulated delete failure",
                  entityType: "AttachmentLink",
                })
              );
            }

            // For other cases, use standard delete implementation
            return makeAdvancedTestRepo().delete(id);
          },
        } as RepositoryServiceApi<AttachmentLinkEntity>;

        const repoLayer = Layer.succeed(
          TestAttachmentLinkRepositoryService,
          customRepo
        );

        // Combine with attachment service layer
        const testLayer = Layer.provideMerge(
          AttachmentService.Default,
          repoLayer
        );

        // Run test with the layer
        const test = Effect.gen(function* () {
          const service = yield* AttachmentService;

          // First create several links for testing
          const links = yield* service.createLinks([
            {
              entityA_id: "source-1",
              entityA_type: "Source",
              entityB_id: "target-1",
              entityB_type: "Target",
            },
            {
              entityA_id: "source-1",
              entityA_type: "Source",
              entityB_id: "target-2",
              entityB_type: "Target",
            },
            {
              entityA_id: "source-1",
              entityA_type: "Source",
              entityB_id: "target-3",
              entityB_type: "Target",
            },
          ]);

          expect(links.length).toBe(3);
          expect(createdIds.length).toBe(3);

          // Reset the delete counter for our test
          deleteCounter = 0;

          // Now delete all links, but the second deletion will fail
          const result = yield* Effect.either(
            service.deleteLinksFrom("source-1", "Source")
          );

          // Should fail with transaction error
          expect(result._tag).toBe("Left");
          if (result._tag === "Left") {
            expect(result.left).toBeInstanceOf(AttachmentTransactionError);
          }

          // Verify all links have been restored (rollback successful)
          const remainingLinks = yield* service.findLinksFrom(
            "source-1",
            "Source"
          );
          expect(remainingLinks).toHaveLength(3); // All links should be restored
        });

        yield* test.pipe(Effect.provide(testLayer));
      }));
  });

  // Test deleteLinksTo transaction support
  describe("deleteLinksTo transaction", () => {
    it("should delete all links to a target entity on success", () =>
      Effect.gen(function* () {
        // Create a standard test repo
        const repo = makeAdvancedTestRepo();
        const repoLayer = Layer.succeed(
          TestAttachmentLinkRepositoryService,
          repo
        );

        // Combine with attachment service layer
        const testLayer = Layer.provideMerge(
          AttachmentService.Default,
          repoLayer
        );

        // Run test with the layer
        const test = Effect.gen(function* () {
          const service = yield* AttachmentService;

          // Create links with the same target but different sources
          const links = yield* service.createLinks([
            {
              entityA_id: "source-1",
              entityA_type: "Source",
              entityB_id: "common-target",
              entityB_type: "Target",
            },
            {
              entityA_id: "source-2",
              entityA_type: "Source",
              entityB_id: "common-target",
              entityB_type: "Target",
            },
            {
              entityA_id: "source-3",
              entityA_type: "Source",
              entityB_id: "common-target",
              entityB_type: "Target",
            },
          ]);

          expect(links.length).toBe(3);

          // Delete all links to the common target
          const result = yield* service.deleteLinksTo(
            "common-target",
            "Target"
          );

          expect(result).toBe(3);

          // Verify they're gone
          const remainingLinks = yield* service.findLinksTo(
            "common-target",
            "Target"
          );
          expect(remainingLinks).toHaveLength(0);
        });

        yield* test.pipe(Effect.provide(testLayer));
      }));

    it("should handle network errors during delete operations", () =>
      Effect.gen(function* () {
        // Create a repo that simulates network issues
        const repo = makeAdvancedTestRepo({
          simulateNetworkIssue: true, // 20% chance of failure on each operation
        });

        const repoLayer = Layer.succeed(
          TestAttachmentLinkRepositoryService,
          repo
        );

        // Combine with attachment service layer
        const testLayer = Layer.provideMerge(
          AttachmentService.Default,
          repoLayer
        );

        // Run test with the layer - this is more of a stress test
        const test = Effect.gen(function* () {
          const service = yield* AttachmentService;

          // Create a large batch of links to increase chances of hitting a network error
          const inputs = Array.from({ length: 10 }, (_, i) => ({
            entityA_id: `source-${i}`,
            entityA_type: "Source",
            entityB_id: "network-test-target",
            entityB_type: "Target",
          }));

          // Create the links - might fail due to simulated network issues, which is acceptable for this test setup.
          yield* Effect.catchAll(
            service.createLinks(inputs),
            () => Effect.void // Ignore errors from createLinks for this test
          );

          // Attempt to delete all links to the target
          const result = yield* Effect.either(
            service.deleteLinksTo("network-test-target", "Target")
          );

          // Regardless of success or failure, the system should remain consistent
          if (result._tag === "Right") {
            // If successful, all links should be deleted
            const remainingLinks = yield* service.findLinksTo(
              "network-test-target",
              "Target"
            );
            expect(remainingLinks).toHaveLength(0);
          } else {
            // If failed, the transaction error should be properly reported
            expect(result.left).toBeInstanceOf(AttachmentTransactionError);
            // And the entity state should be consistent - all or nothing
          }
        });

        yield* test.pipe(Effect.provide(testLayer));
      }));
  });

  // Test stress scenarios
  describe("Stress testing", () => {
    it("should handle large batches efficiently", () =>
      Effect.gen(function* () {
        // Create a standard test repo
        const repo = makeAdvancedTestRepo();
        const repoLayer = Layer.succeed(
          TestAttachmentLinkRepositoryService,
          repo
        );

        // Combine with attachment service layer
        const testLayer = Layer.provideMerge(
          AttachmentService.Default,
          repoLayer
        );

        // Run test with the layer
        const test = Effect.gen(function* () {
          const service = yield* AttachmentService;

          // Create a large batch of links
          const largeInput = Array.from({ length: 50 }, (_, i) => ({
            entityA_id: "batch-source",
            entityA_type: "LargeBatchTest",
            entityB_id: `batch-target-${i}`,
            entityB_type: "Target",
            metadata: { index: i, batchTest: true } as any,
          }));

          // Create the links
          const links = yield* service.createLinks(largeInput);

          expect(links.length).toBe(50);

          // Delete all links from the source
          const deleteResult = yield* service.deleteLinksFrom(
            "batch-source",
            "LargeBatchTest"
          );

          expect(deleteResult).toBe(50);

          // Verify all are gone
          const remaining = yield* service.findLinksFrom(
            "batch-source",
            "LargeBatchTest"
          );
          expect(remaining).toHaveLength(0);
        });

        yield* test.pipe(Effect.provide(testLayer));
      }));
  });
});
