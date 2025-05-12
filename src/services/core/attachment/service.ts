/**
 * @file Implementation of the AttachmentService using Effect.Service pattern.
 */

import { EntityId } from "@/types.js";
import { Effect, Layer, Option } from "effect";
import { EntityNotFoundError as RepoEntityNotFoundError } from "../repository/errors.js";
import { RepositoryService } from "../repository/service.js";
import { AttachmentServiceApi } from "./api.js";
import {
    AttachmentDbError,
    AttachmentLinkNotFoundError,
    AttachmentTransactionError,
    AttachmentValidationError
} from "./errors.js";
import {
    AttachmentLinkEntity
} from "./schema.js";
import { CreateAttachmentLinkInput } from "./types.js";

/**
 * Implementation of the AttachmentService using Effect.Service pattern.
 * Provides methods for creating, querying, and managing attachment links between entities.
 */
export class AttachmentService extends Effect.Service<AttachmentServiceApi>()(
    "AttachmentService",
    {
        effect: Effect.gen(function* (_) {
            // Get repository instance for AttachmentLinkEntity
            const repo = yield* RepositoryService<AttachmentLinkEntity>().Tag;

            const createLink = (
                input: CreateAttachmentLinkInput,
            ): Effect.Effect<AttachmentLinkEntity, AttachmentDbError> => {
                // Construct the data payload for the repository
                const dataToCreate = {
                    entityA_id: input.entityA_id,
                    entityA_type: input.entityA_type,
                    entityB_id: input.entityB_id,
                    entityB_type: input.entityB_type,
                    linkType: input.linkType, // Pass optional linkType
                    metadata: input.metadata, // Pass optional metadata
                    createdBy: input.createdBy, // Pass optional creator info
                    expiresAt: input.expiresAt, // Pass optional expiration date
                };
                return repo.create(dataToCreate).pipe(
                    Effect.mapError(
                        (cause) =>
                            new AttachmentDbError({
                                operation: "createLink",
                                message: "Failed to create attachment link",
                                cause,
                            }),
                    ),
                );
            };

            const deleteLink = (
                linkId: EntityId,
            ): Effect.Effect<void, AttachmentLinkNotFoundError | AttachmentDbError> =>
                repo.delete(linkId).pipe(
                    Effect.mapError((repoError) => {
                        if (repoError instanceof RepoEntityNotFoundError) {
                            return new AttachmentLinkNotFoundError({ linkId });
                        }
                        return new AttachmentDbError({
                            operation: "deleteLink",
                            message: `Failed to delete link ID ${linkId}`,
                            cause: repoError,
                        });
                    }),
                );

            const findLinksFrom = (
                entityA_id: EntityId,
                entityA_type: string,
            ): Effect.Effect<ReadonlyArray<AttachmentLinkEntity>, AttachmentDbError> =>
                repo.findMany({ filter: { entityA_id, entityA_type } }).pipe(
                    Effect.mapError(
                        (cause) =>
                            new AttachmentDbError({
                                operation: "findLinksFrom",
                                message: `Failed to find links from ${entityA_type}:${entityA_id}`,
                                cause,
                            }),
                    ),
                );

            const findLinksTo = (
                entityB_id: EntityId,
                entityB_type: string,
            ): Effect.Effect<ReadonlyArray<AttachmentLinkEntity>, AttachmentDbError> =>
                repo.findMany({ filter: { entityB_id, entityB_type } }).pipe(
                    Effect.mapError(
                        (cause) =>
                            new AttachmentDbError({
                                operation: "findLinksTo",
                                message: `Failed to find links to ${entityB_type}:${entityB_id}`,
                                cause,
                            }),
                    ),
                );

            const getLinkById = (
                linkId: EntityId,
            ): Effect.Effect<Option.Option<AttachmentLinkEntity>, AttachmentDbError> =>
                repo.findById(linkId).pipe(
                    Effect.mapError(
                        (cause) =>
                            new AttachmentDbError({
                                operation: "getLinkById",
                                message: `Failed to get link by ID ${linkId}`,
                                cause,
                            }),
                    ),
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
                    return Effect.fail(new AttachmentValidationError({
                        operation: "createLinks",
                        validationIssues,
                        message: `Invalid inputs: ${validationIssues.length} issues found`
                    }));
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
                inputs: ReadonlyArray<CreateAttachmentLinkInput>,
            ): Effect.Effect<
                ReadonlyArray<AttachmentLinkEntity>,
                AttachmentValidationError | AttachmentTransactionError | AttachmentDbError
            > => {
                if (inputs.length === 0) return Effect.succeed([]);

                // Generate a transaction ID for tracing purposes
                const transactionId = crypto.randomUUID();
                const batchSize = inputs.length;

                // Use an Effect.gen with proper error handling for transaction-like behavior
                return Effect.gen(function* () {
                    // First validate all inputs before starting the transaction
                    yield* validateCreateLinkInputs(inputs);

                    // Log transaction initiation
                    yield* Effect.logInfo(`Starting attachment link creation transaction [${transactionId}]`, {
                        transactionId,
                        batchSize,
                        operation: "createLinks"
                    });

                    // Track created links for potential rollback
                    const createdLinks: AttachmentLinkEntity[] = [];

                    try {
                        // Create links sequentially to handle potential rollbacks
                        for (let i = 0; i < inputs.length; i++) {
                            const input = inputs[i];

                            // Periodically log progress for large batches
                            if (i > 0 && i % 100 === 0) {
                                yield* Effect.logInfo(`Progress: Created ${i}/${inputs.length} links [${transactionId}]`);
                            }

                            try {
                                // Explicitly check input is defined even though it should be from the array iteration
                                if (!input) {
                                    throw new AttachmentValidationError({
                                        operation: "createLinks",
                                        validationIssues: ["Unexpected undefined input in batch"],
                                        message: `Invalid input at position ${i}: undefined`
                                    });
                                }

                                const link = yield* createLink(input);
                                createdLinks.push(link);
                            } catch (error) {
                                throw {
                                    error,
                                    failedAtIndex: i,
                                    failedInput: input
                                };
                            }
                        }

                        // Log successful completion
                        yield* Effect.logInfo(`Successfully created ${createdLinks.length} attachment links [${transactionId}]`);

                        return createdLinks;
                    } catch (caughtError: unknown) {
                        // Type assert the caught error to access its properties
                        const error = caughtError as {
                            error?: unknown;
                            failedAtIndex?: number;
                            failedInput?: CreateAttachmentLinkInput
                        };

                        // If any creation fails, roll back by deleting all created links
                        if (createdLinks.length > 0) {
                            const failedInput = error.failedInput || "unknown";
                            const failedIndex = error.failedAtIndex !== undefined ? error.failedAtIndex : "unknown";

                            yield* Effect.logWarning(
                                `Rolling back ${createdLinks.length} links due to failure at index ${failedIndex} [${transactionId}]`,
                                {
                                    transactionId,
                                    failedIndex,
                                    failedInput,
                                    createdCount: createdLinks.length,
                                    totalCount: inputs.length,
                                    error: error.error || error
                                }
                            );

                            // Delete created links in reverse order for better consistency
                            const rollbackResults = yield* Effect.forEach(
                                [...createdLinks].reverse(),
                                (link) => Effect.either(deleteLink(link.id)),
                                { concurrency: 5, discard: false } // Limited concurrency for rollbacks
                            );

                            // Check if any rollbacks failed
                            const failedRollbacks = rollbackResults.filter(result => result._tag === "Left");

                            if (failedRollbacks.length > 0) {
                                yield* Effect.logError(
                                    `CRITICAL: ${failedRollbacks.length}/${createdLinks.length} rollbacks failed [${transactionId}]`,
                                    {
                                        transactionId,
                                        failedRollbackCount: failedRollbacks.length
                                    }
                                );

                                throw new AttachmentTransactionError({
                                    operation: "createLinks",
                                    transactionId,
                                    completedCount: createdLinks.length,
                                    totalCount: inputs.length,
                                    message: `Transaction rollback partially failed: ${failedRollbacks.length} links could not be rolled back`,
                                    cause: error.error || error
                                });
                            }

                            yield* Effect.logInfo(`Successfully rolled back all ${createdLinks.length} links [${transactionId}]`);
                        }

                        // Convert the error to our domain error
                        if (error.error) {
                            if (error.error instanceof AttachmentDbError) {
                                throw new AttachmentTransactionError({
                                    operation: "createLinks",
                                    transactionId,
                                    completedCount: createdLinks.length,
                                    totalCount: inputs.length,
                                    message: `Failed creating link at position ${error.failedAtIndex} of ${inputs.length}`,
                                    cause: error.error
                                });
                            }
                            throw error.error;
                        } else {
                            throw new AttachmentDbError({
                                operation: "createLinks",
                                message: `Unexpected error in createLinks transaction [${transactionId}]`,
                                cause: error
                            });
                        }
                    }
                });
            };

            // Bulk operation to delete all links from a source entity with transaction support
            const deleteLinksFrom = (
                entityA_id: EntityId,
                entityA_type: string,
            ): Effect.Effect<number, AttachmentDbError> =>
                Effect.gen(function* () {
                    // First, find all links from this entity
                    const links = yield* findLinksFrom(entityA_id, entityA_type);

                    if (links.length === 0) return 0;

                    // Make a copy of links for potential rollback
                    const linksBackup = [...links];

                    try {
                        // Attempt to delete all links in one "transaction"
                        let successCount = 0;

                        for (const link of links) {
                            yield* deleteLink(link.id);
                            successCount++;
                        }

                        return successCount;
                    } catch (error) {
                        // If any deletion fails, attempt to restore deleted links
                        if (links.length > 0) {
                            // Calculate how many links were successfully deleted before error
                            const deletedCount = yield* Effect.gen(function* () {
                                const remainingLinks = yield* findLinksFrom(entityA_id, entityA_type);
                                return links.length - remainingLinks.length;
                            }).pipe(
                                Effect.catchAll(() => Effect.succeed(0)) // If query fails, assume worst case
                            );

                            if (deletedCount > 0) {
                                yield* Effect.logWarning("Rolling back partially deleted links due to error", {
                                    deletedCount,
                                    entityA_id,
                                    entityA_type,
                                    error
                                });

                                // Recreate the deleted links to maintain atomicity
                                yield* Effect.forEach(
                                    linksBackup.slice(0, deletedCount),
                                    (link) => Effect.either(createLink({
                                        entityA_id: link.data.entityA_id,
                                        entityA_type: link.data.entityA_type,
                                        entityB_id: link.data.entityB_id,
                                        entityB_type: link.data.entityB_type,
                                        linkType: link.data.linkType,
                                        metadata: link.data.metadata,
                                        createdBy: link.data.createdBy,
                                        expiresAt: link.data.expiresAt
                                    })),
                                    { discard: true }
                                );
                            }
                        }

                        throw error; // Re-throw to maintain the error chain
                    }
                }).pipe(
                    Effect.mapError(
                        (cause) =>
                            new AttachmentDbError({
                                operation: "deleteLinksFrom",
                                message: `Transaction failed: could not delete links from ${entityA_type}:${entityA_id} atomically`,
                                cause,
                            }),
                    ),
                );

            // Bulk operation to delete all links to a target entity with transaction support
            const deleteLinksTo = (
                entityB_id: EntityId,
                entityB_type: string,
            ): Effect.Effect<number, AttachmentDbError> =>
                Effect.gen(function* () {
                    // First, find all links to this entity
                    const links = yield* findLinksTo(entityB_id, entityB_type);

                    if (links.length === 0) return 0;

                    // Make a copy of links for potential rollback
                    const linksBackup = [...links];

                    try {
                        // Attempt to delete all links in one "transaction"
                        let successCount = 0;

                        for (const link of links) {
                            yield* deleteLink(link.id);
                            successCount++;
                        }

                        return successCount;
                    } catch (error) {
                        // If any deletion fails, attempt to restore deleted links
                        if (links.length > 0) {
                            // Calculate how many links were successfully deleted before error
                            const deletedCount = yield* Effect.gen(function* () {
                                const remainingLinks = yield* findLinksTo(entityB_id, entityB_type);
                                return links.length - remainingLinks.length;
                            }).pipe(
                                Effect.catchAll(() => Effect.succeed(0)) // If query fails, assume worst case
                            );

                            if (deletedCount > 0) {
                                yield* Effect.logWarning("Rolling back partially deleted links due to error", {
                                    deletedCount,
                                    entityB_id,
                                    entityB_type,
                                    error
                                });

                                // Recreate the deleted links to maintain atomicity
                                yield* Effect.forEach(
                                    linksBackup.slice(0, deletedCount),
                                    (link) => Effect.either(createLink({
                                        entityA_id: link.data.entityA_id,
                                        entityA_type: link.data.entityA_type,
                                        entityB_id: link.data.entityB_id,
                                        entityB_type: link.data.entityB_type,
                                        linkType: link.data.linkType,
                                        metadata: link.data.metadata,
                                        createdBy: link.data.createdBy,
                                        expiresAt: link.data.expiresAt
                                    })),
                                    { discard: true }
                                );
                            }
                        }

                        throw error; // Re-throw to maintain the error chain
                    }
                }).pipe(
                    Effect.mapError(
                        (cause) =>
                            new AttachmentDbError({
                                operation: "deleteLinksTo",
                                message: `Transaction failed: could not delete links to ${entityB_type}:${entityB_id} atomically`,
                                cause,
                            }),
                    ),
                );

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
        dependencies: [] // No explicit dependencies here as they're provided through the layer system
    }
) { }

/**
 * Live Layer for the AttachmentService.
 * Provides the default implementation for attachment link operations.
 */
export const AttachmentServiceLive = Layer.succeed(AttachmentService);

/**
 * Default export for the AttachmentService.
 */
export default AttachmentService;
