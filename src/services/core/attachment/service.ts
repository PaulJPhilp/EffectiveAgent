/**
 * @file Implementation of the AttachmentService using Effect.Service pattern.
 */

import { Effect, type Option, Ref } from "effect";
import type { EntityId } from "@/types.js";
import { EntityNotFoundError as RepoEntityNotFoundError } from "../repository/errors.js";
import type { DrizzleClientApi } from "../repository/implementations/drizzle/config.js";
import { RepositoryService } from "../repository/service.js";
import type { AttachmentServiceApi } from "./api.js";
import {
  AttachmentDbError,
  AttachmentLinkNotFoundError,
  AttachmentTransactionError,
  AttachmentValidationError,
} from "./errors.js";
import type { AttachmentLinkEntity, AttachmentLinkEntityData } from "./schema.js";
import type { CreateAttachmentLinkInput } from "./types.js";

/**
 * Implementation of the AttachmentService using Effect.Service pattern.
 * Provides methods for creating, querying, and managing attachment links between entities.
 */
export class AttachmentService extends Effect.Service<AttachmentServiceApi>()(
  "AttachmentService",
  {
    effect: Effect.gen(function* (_) {
      yield* Effect.logDebug("Initializing AttachmentService");

      // Get repository instance for AttachmentLinkEntity
      const repo = yield* RepositoryService<AttachmentLinkEntity>().Tag;

      const createLink = (
        input: CreateAttachmentLinkInput
      ): Effect.Effect<
        AttachmentLinkEntity,
        AttachmentDbError,
        DrizzleClientApi
      > => {
        return Effect.gen(function* () {
          yield* Effect.logDebug("Creating attachment link", {
            entityA_type: input.entityA_type,
            entityB_type: input.entityB_type,
          });

          // Construct the data payload for the repository
          const dataToCreate = {
            entityA_id: input.entityA_id,
            entityA_type: input.entityA_type,
            entityB_id: input.entityB_id,
            entityB_type: input.entityB_type,
            metadata: input.metadata ?? {},
            ...(input.linkType ? { linkType: input.linkType } : {}),
            ...(input.createdBy ? { createdBy: input.createdBy } : {}),
            ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
          } as AttachmentLinkEntityData;

          const result = yield* repo.create(dataToCreate).pipe(
            Effect.mapError(
              (cause) =>
                new AttachmentDbError({
                  operation: "createLink",
                  message: "Failed to create attachment link",
                  cause,
                })
            )
          );

          yield* Effect.logDebug("Attachment link created successfully", {
            linkId: result.id,
          });

          return result;
        });
      };

      const deleteLink = (
        linkId: EntityId
      ): Effect.Effect<
        void,
        AttachmentLinkNotFoundError | AttachmentDbError,
        DrizzleClientApi
      > =>
        Effect.gen(function* () {
          yield* Effect.logDebug("Deleting attachment link", { linkId });

          const result = yield* repo.delete(linkId).pipe(
            Effect.mapError((repoError) => {
              if (repoError instanceof RepoEntityNotFoundError) {
                return new AttachmentLinkNotFoundError({ linkId });
              }
              return new AttachmentDbError({
                operation: "deleteLink",
                message: `Failed to delete link ID ${linkId}`,
                cause: repoError,
              });
            })
          );

          yield* Effect.logDebug("Attachment link deleted successfully", {
            linkId,
          });
          return result;
        });

      const findLinksFrom = (
        entityA_id: EntityId,
        entityA_type: string
      ): Effect.Effect<
        ReadonlyArray<AttachmentLinkEntity>,
        AttachmentDbError,
        DrizzleClientApi
      > =>
        repo.findMany({ filter: { entityA_id, entityA_type } }).pipe(
          Effect.mapError(
            (cause) =>
              new AttachmentDbError({
                operation: "findLinksFrom",
                message: `Failed to find links from ${entityA_type}:${entityA_id}`,
                cause,
              })
          )
        );

      const findLinksTo = (
        entityB_id: EntityId,
        entityB_type: string
      ): Effect.Effect<
        ReadonlyArray<AttachmentLinkEntity>,
        AttachmentDbError,
        DrizzleClientApi
      > =>
        repo.findMany({ filter: { entityB_id, entityB_type } }).pipe(
          Effect.mapError(
            (cause) =>
              new AttachmentDbError({
                operation: "findLinksTo",
                message: `Failed to find links to ${entityB_type}:${entityB_id}`,
                cause,
              })
          )
        );

      const getLinkById = (
        linkId: EntityId
      ): Effect.Effect<
        Option.Option<AttachmentLinkEntity>,
        AttachmentDbError,
        DrizzleClientApi
      > =>
        repo.findById(linkId).pipe(
          Effect.mapError(
            (cause) =>
              new AttachmentDbError({
                operation: "getLinkById",
                message: `Failed to get link by ID ${linkId}`,
                cause,
              })
          )
        );

      /**
       * Validates a batch of link creation inputs to ensure they are valid.
       * Provides early failure before attempting any database operations.
       */
      const validateCreateLinkInputs = (
        inputs: ReadonlyArray<CreateAttachmentLinkInput>
      ): Effect.Effect<void, AttachmentValidationError> => {
        const validationIssues: string[] = [];

        // Check each input for validation issues
        inputs.forEach((input, index) => {
          if (!input.entityA_id) {
            validationIssues.push(`Input[${index}]: entityA_id is required`);
          }
          if (!input.entityA_type) {
            validationIssues.push(`Input[${index}]: entityA_type is required`);
          }
          if (!input.entityB_id) {
            validationIssues.push(`Input[${index}]: entityB_id is required`);
          }
          if (!input.entityB_type) {
            validationIssues.push(`Input[${index}]: entityB_type is required`);
          }
        });

        if (validationIssues.length > 0) {
          return Effect.fail(
            new AttachmentValidationError({
              operation: "createLinks",
              validationIssues,
              message: `Invalid inputs: ${validationIssues.length} issues found`,
            })
          );
        }

        return Effect.succeed(undefined);
      };

      /**
       * Bulk operation to create multiple links at once with transaction support for atomicity.
       * If any creation fails, all created links will be rolled back to maintain consistency.
       *
       * @param inputs - Array of link configuration objects
       * @returns Effect resolving to an array of all created link entities
       * @throws AttachmentValidationError if any inputs are invalid
       * @throws AttachmentTransactionError if transaction fails and cannot be rolled back
       * @throws AttachmentDbError for other database-related errors
       */
      const createLinks = (
        inputs: ReadonlyArray<CreateAttachmentLinkInput>
      ): Effect.Effect<
        ReadonlyArray<AttachmentLinkEntity>,
        | AttachmentValidationError
        | AttachmentTransactionError
        | AttachmentDbError,
        DrizzleClientApi
      > => {
        if (inputs.length === 0) return Effect.succeed([]);

        const transactionId = crypto.randomUUID();
        const batchSize = inputs.length;

        return Effect.gen(function* () {
          yield* validateCreateLinkInputs(inputs);

          yield* Effect.logInfo(
            `Starting attachment link creation transaction [${transactionId}]`,
            {
              transactionId,
              batchSize,
              operation: "createLinks",
            }
          );

          const createdLinksRef = yield* Ref.make<AttachmentLinkEntity[]>([]);

          const mainLogic = Effect.gen(function* () {
            for (let i = 0; i < inputs.length; i++) {
              const input = inputs[i];

              if (i > 0 && i % 100 === 0) {
                yield* Effect.logInfo(
                  `Progress: Created ${i}/${inputs.length} links [${transactionId}]`
                );
              }

              const singleCreateEffect = Effect.gen(function* () {
                if (!input) {
                  return yield* Effect.fail(
                    new AttachmentValidationError({
                      operation: "createLinks",
                      validationIssues: ["Unexpected undefined input in batch"],
                      message: `Invalid input at position ${i}: undefined`,
                    })
                  );
                }
                return yield* createLink(input);
              }).pipe(
                Effect.tap((link) =>
                  Ref.update(createdLinksRef, (list) => [...list, link])
                ),
                Effect.mapError((originalError) => ({
                  originalError,
                  failedAtIndex: i,
                  failedInput: input,
                  message: `Error during link creation at index ${i}.`,
                }))
              );
              yield* singleCreateEffect;
            }
            const finalLinks = yield* Ref.get(createdLinksRef);
            yield* Effect.logInfo(
              `Successfully created ${finalLinks.length} attachment links [${transactionId}]`
            );
            return finalLinks;
          });

          return yield* mainLogic.pipe(
            Effect.catchAll((enrichedError: any) =>
              Effect.gen(function* () {
                const linksToRollback = yield* Ref.get(createdLinksRef);
                if (linksToRollback.length > 0) {
                  const failedInput = enrichedError.failedInput || "unknown";
                  const failedIndex =
                    enrichedError.failedAtIndex !== undefined
                      ? enrichedError.failedAtIndex
                      : "unknown";

                  yield* Effect.logWarning(
                    `Rolling back ${linksToRollback.length} links due to failure at index ${failedIndex} [${transactionId}]`,
                    {
                      transactionId,
                      failedIndex,
                      failedInput: JSON.stringify(failedInput), // Ensure serializable
                      createdCount: linksToRollback.length,
                      totalCount: inputs.length,
                      error: enrichedError.originalError
                        ? String(enrichedError.originalError)
                        : String(enrichedError),
                    }
                  );

                  const rollbackResults = yield* Effect.forEach(
                    [...linksToRollback].reverse(), // Process in reverse for rollback
                    (link) => Effect.either(deleteLink(link.id)),
                    { concurrency: 5, discard: false }
                  );

                  const failedRollbacks = rollbackResults.filter(
                    (result) => result._tag === "Left"
                  );

                  if (failedRollbacks.length > 0) {
                    yield* Effect.logError(
                      `CRITICAL: ${failedRollbacks.length}/${linksToRollback.length} rollbacks failed [${transactionId}]`,
                      {
                        transactionId,
                        failedRollbackCount: failedRollbacks.length,
                        errors: failedRollbacks.map((fr) => String(fr.left)), // Log specific rollback errors
                      }
                    );
                    return yield* Effect.fail(
                      new AttachmentTransactionError({
                        operation: "createLinks",
                        transactionId,
                        completedCount:
                          linksToRollback.length - failedRollbacks.length, // Partially successful rollbacks
                        totalCount: inputs.length,
                        message: `Transaction rollback partially failed: ${failedRollbacks.length} links could not be rolled back. Original error at index ${failedIndex}.`,
                        cause: enrichedError.originalError || enrichedError,
                      })
                    );
                  }
                  yield* Effect.logInfo(
                    `Successfully rolled back all ${linksToRollback.length} links [${transactionId}]`
                  );
                }

                // Determine the cause for the final failure message
                const cause = enrichedError.originalError || enrichedError;
                const finalMessage =
                  enrichedError.message ||
                  "Transaction failed during link creation.";

                if (
                  cause instanceof AttachmentValidationError ||
                  cause instanceof AttachmentDbError
                ) {
                  return yield* Effect.fail(cause); // Preserve original error type if it's one of ours
                }

                return yield* Effect.fail(
                  new AttachmentTransactionError({
                    operation: "createLinks",
                    transactionId,
                    completedCount: linksToRollback.length, // links that were made before error
                    totalCount: inputs.length,
                    message: finalMessage,
                    cause,
                  })
                );
              })
            )
          );
        });
      };

      // Bulk operation to delete all links from a source entity with transaction support
      const deleteLinksFrom = (
        entityA_id: EntityId,
        entityA_type: string
      ): Effect.Effect<number, AttachmentDbError, DrizzleClientApi> =>
        Effect.gen(function* () {
          const initialLinks = yield* findLinksFrom(entityA_id, entityA_type);
          if (initialLinks.length === 0) return 0;

          const transactionId = crypto.randomUUID(); // For logging context
          yield* Effect.logInfo(
            `Starting deleteLinksFrom transaction [${transactionId}] for ${entityA_type}:${entityA_id}`,
            {
              entityA_id,
              entityA_type,
              initialLinkCount: initialLinks.length,
              transactionId,
            }
          );

          const successfullyDeletedLinksRef = yield* Ref.make<
            AttachmentLinkEntity[]
          >([]);

          const mainDeleteLogic = Effect.gen(function* () {
            let successCount = 0;
            for (const link of initialLinks) {
              yield* deleteLink(link.id).pipe(
                Effect.tap(() => {
                  successCount++;
                  Ref.update(successfullyDeletedLinksRef, (deletedLinks) => [
                    ...deletedLinks,
                    link,
                  ]);
                }),
                Effect.mapError((originalError) => ({
                  originalError,
                  failedLink: link,
                  message: `Failed to delete link ID ${link.id} during bulk operation.`,
                }))
              );
            }
            yield* Effect.logInfo(
              `Successfully deleted ${successCount} links in transaction [${transactionId}]`
            );
            return successCount;
          });

          return yield* mainDeleteLogic.pipe(
            Effect.catchAll((enrichedError: any) =>
              Effect.gen(function* () {
                const linksToRestore = yield* Ref.get(
                  successfullyDeletedLinksRef
                );
                yield* Effect.logWarning(
                  `deleteLinksFrom transaction [${transactionId}] failed. Attempting to restore ${linksToRestore.length} links. Error: ${enrichedError.message}`,
                  {
                    entityA_id,
                    entityA_type,
                    restoreCount: linksToRestore.length,
                    originalError: String(
                      enrichedError.originalError || enrichedError
                    ),
                    failedLink: JSON.stringify(enrichedError.failedLink), // Ensure serializable
                  }
                );

                if (linksToRestore.length > 0) {
                  const restoreResults = yield* Effect.forEach(
                    linksToRestore, // These are the links that were successfully deleted before the error
                    (linkToRestore) =>
                      Effect.either(
                        createLink({
                          entityA_id: linkToRestore.data.entityA_id,
                          entityA_type: linkToRestore.data.entityA_type,
                          entityB_id: linkToRestore.data.entityB_id,
                          entityB_type: linkToRestore.data.entityB_type,
                          linkType: linkToRestore.data.linkType,
                          metadata: (linkToRestore.data.metadata || {}) as any,
                          createdBy: linkToRestore.data.createdBy,
                          expiresAt: linkToRestore.data.expiresAt,
                        })
                      ),
                    { discard: false, concurrency: 5 }
                  );

                  const failedRestores = restoreResults.filter(
                    (r) => r._tag === "Left"
                  );
                  if (failedRestores.length > 0) {
                    yield* Effect.logError(
                      `CRITICAL: ${failedRestores.length}/${linksToRestore.length} link restorations failed during rollback of deleteLinksFrom [${transactionId}]`,
                      {
                        transactionId,
                        failedRestoreCount: failedRestores.length,
                        errors: failedRestores.map((fr) => String(fr.left)),
                      }
                    );
                    // The transaction is in a bad state. The original error is still the primary issue.
                  }
                }
                // Propagate a new error indicating the transaction failure.
                return yield* Effect.fail(
                  new AttachmentDbError({
                    operation: "deleteLinksFrom",
                    message: `Transaction failed: could not delete links from ${entityA_type}:${entityA_id} atomically. Original error: ${enrichedError.message}`,
                    cause: enrichedError.originalError || enrichedError,
                  })
                );
              })
            )
          );
        });

      // Bulk operation to delete all links to a target entity with transaction support
      const deleteLinksTo = (
        entityB_id: EntityId,
        entityB_type: string
      ): Effect.Effect<number, AttachmentDbError, DrizzleClientApi> =>
        Effect.gen(function* () {
          const initialLinks = yield* findLinksTo(entityB_id, entityB_type);
          if (initialLinks.length === 0) return 0;

          const transactionId = crypto.randomUUID(); // For logging context
          yield* Effect.logInfo(
            `Starting deleteLinksTo transaction [${transactionId}] for ${entityB_type}:${entityB_id}`,
            {
              entityB_id,
              entityB_type,
              initialLinkCount: initialLinks.length,
              transactionId,
            }
          );

          const successfullyDeletedLinksRef = yield* Ref.make<
            AttachmentLinkEntity[]
          >([]);

          const mainDeleteLogic = Effect.gen(function* () {
            let successCount = 0;
            for (const link of initialLinks) {
              yield* deleteLink(link.id).pipe(
                Effect.tap(() => {
                  successCount++;
                  Ref.update(successfullyDeletedLinksRef, (deletedLinks) => [
                    ...deletedLinks,
                    link,
                  ]);
                }),
                Effect.mapError((originalError) => ({
                  originalError,
                  failedLink: link,
                  message: `Failed to delete link ID ${link.id} during bulk operation for deleteLinksTo.`,
                }))
              );
            }
            yield* Effect.logInfo(
              `Successfully deleted ${successCount} links in transaction [${transactionId}] for deleteLinksTo`
            );
            return successCount;
          });

          return yield* mainDeleteLogic.pipe(
            Effect.catchAll((enrichedError: any) =>
              Effect.gen(function* () {
                const linksToRestore = yield* Ref.get(
                  successfullyDeletedLinksRef
                );
                yield* Effect.logWarning(
                  `deleteLinksTo transaction [${transactionId}] failed. Attempting to restore ${linksToRestore.length} links. Error: ${enrichedError.message}`,
                  {
                    entityB_id,
                    entityB_type,
                    restoreCount: linksToRestore.length,
                    originalError: String(
                      enrichedError.originalError || enrichedError
                    ),
                    failedLink: JSON.stringify(enrichedError.failedLink), // Ensure serializable
                  }
                );

                if (linksToRestore.length > 0) {
                  const restoreResults = yield* Effect.forEach(
                    linksToRestore,
                    (linkToRestore) =>
                      Effect.either(
                        createLink({
                          entityA_id: linkToRestore.data.entityA_id,
                          entityA_type: linkToRestore.data.entityA_type,
                          entityB_id: linkToRestore.data.entityB_id,
                          entityB_type: linkToRestore.data.entityB_type,
                          linkType: linkToRestore.data.linkType,
                          metadata: (linkToRestore.data.metadata || {}) as any,
                          createdBy: linkToRestore.data.createdBy,
                          expiresAt: linkToRestore.data.expiresAt,
                        })
                      ),
                    { discard: false, concurrency: 5 }
                  );

                  const failedRestores = restoreResults.filter(
                    (r) => r._tag === "Left"
                  );
                  if (failedRestores.length > 0) {
                    yield* Effect.logError(
                      `CRITICAL: ${failedRestores.length}/${linksToRestore.length} link restorations failed during rollback of deleteLinksTo [${transactionId}]`,
                      {
                        transactionId,
                        failedRestoreCount: failedRestores.length,
                        errors: failedRestores.map((fr) => String(fr.left)),
                      }
                    );
                  }
                }
                return yield* Effect.fail(
                  new AttachmentDbError({
                    operation: "deleteLinksTo",
                    message: `Transaction failed: could not delete links to ${entityB_type}:${entityB_id} atomically. Original error: ${enrichedError.message}`,
                    cause: enrichedError.originalError || enrichedError,
                  })
                );
              })
            )
          );
        });

      return {
        createLink,
        deleteLink,
        findLinksFrom,
        findLinksTo,
        getLinkById,
        createLinks,
        deleteLinksFrom,
        deleteLinksTo,
      };
    }),
  }
) {}

/**
 * Default export for the AttachmentService.
 */
export default AttachmentService;
