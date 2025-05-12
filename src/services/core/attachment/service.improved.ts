/**
 * @file Implementation of the AttachmentService using Effect.Service pattern.
 */

import { EntityId } from "@/types.js";
import { Effect, Option } from "effect";
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
 * 
 * This service implements transaction-like behavior for bulk operations using a
 * rollback mechanism to ensure atomicity. If any operation in a batch fails, all
 * successful operations will be undone to maintain consistency.
 */
export class AttachmentService extends Effect.Service<AttachmentServiceApi>()(
    "AttachmentService",
    {
        effect: Effect.gen(function* (_) {
            // Get repository instance for AttachmentLinkEntity
            const repo = yield* RepositoryService<AttachmentLinkEntity>().Tag;

            /**
             * Creates a single link between two entities.
             */
            const createLink = (
                input: CreateAttachmentLinkInput,
            ): Effect.Effect<AttachmentLinkEntity, AttachmentDbError> => {
                // Construct the data payload for the repository
                const dataToCreate = {
                    entityA_id: input.entityA_id,
                    entityA_type: input.entityA_type,
                    entityB_id: input.entityB_id,
                    entityB_type: input.entityB_type,
                    linkType: input.linkType,
                    metadata: input.metadata,
                    createdBy: input.createdBy,
                    expiresAt: input.expiresAt,
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

            /**
             * Deletes a specific link by its ID.
             */
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

            /**
             * Finds all links originating from a specific entity.
             */
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

            /**
             * Finds all links pointing to a specific entity.
             */
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

            /**
             * Gets a specific link by its ID.
             */
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

                return Effect.gen(function* () {
                    // First validate all inputs before starting the transaction
                    yield* validateCreateLinkInputs(inputs);

                    // Log transaction initiation
                    yield* Effect.logInfo(`Creating ${batchSize} attachment links [tx:${transactionId}]`);

                    // Track created links for potential rollback
                    const createdLinks: AttachmentLinkEntity[] = [];
                    let failedIndex = -1;
                    let failedInput: CreateAttachmentLinkInput | undefined;
                    let originalError: unknown;

                    try {
                        // Create links sequentially to handle potential rollbacks
                        for (let i = 0; i < inputs.length; i++) {
                            const input = inputs[i];
                            if (!input) continue; // Skip undefined inputs

                            // Periodically log progress for large batches
                            if (i > 0 && i % 100 === 0) {
                                yield* Effect.logInfo(`Progress: Created ${i}/${inputs.length} links [tx:${transactionId}]`);
                            }

                            try {
                                const link = yield* createLink(input);
                                createdLinks.push(link);
                            } catch (error) {
                                failedIndex = i;
                                failedInput = input;
                                originalError = error;
                                throw error;
                            }
                        }

                        yield* Effect.logInfo(`Successfully created ${createdLinks.length} attachment links [tx:${transactionId}]`);
                        return createdLinks as ReadonlyArray<AttachmentLinkEntity>;
                    } catch (error) {
                        // If any creation fails, roll back by deleting all created links
                        if (createdLinks.length > 0) {
                            yield* Effect.logWarning(
                                `Rolling back ${createdLinks.length} links due to failure at index ${failedIndex} [tx:${transactionId}]`
                            );

                            // Track rollback success/failure
                            let rollbackSuccessCount = 0;
                            let rollbackFailCount = 0;

                            // Delete created links in reverse order for better consistency
                            for (let i = createdLinks.length - 1; i >= 0; i--) {
                                const link = createdLinks[i];
                                if (!link) continue; // Skip undefined links
                                try {
                                    // Handle the potential AttachmentLinkNotFoundError explicitly
                                    yield* deleteLink(link.id).pipe(
                                        Effect.catchTag("AttachmentLinkNotFoundError", (error) => {
                                            // If the link is already gone, consider it successful rollback
                                            rollbackSuccessCount++;
                                            return Effect.succeed(undefined);
                                        })
                                    );
                                    rollbackSuccessCount++;
                                } catch (rollbackError) {
                                    rollbackFailCount++;
                                    yield* Effect.logError(`Failed to roll back link ${link.id} [tx:${transactionId}]`);
                                }
                            }

                            if (rollbackFailCount > 0) {
                                yield* Effect.logError(
                                    `CRITICAL: ${rollbackFailCount}/${createdLinks.length} rollbacks failed [tx:${transactionId}]`
                                );

                                throw new AttachmentTransactionError({
                                    operation: "createLinks",
                                    transactionId,
                                    completedCount: createdLinks.length,
                                    totalCount: inputs.length,
                                    entityIds: createdLinks.map(link => link.id),
                                    message: `Transaction rollback partially failed: ${rollbackFailCount} links could not be rolled back`,
                                    cause: error
                                });
                            }

                            yield* Effect.logInfo(`Successfully rolled back all ${createdLinks.length} links [tx:${transactionId}]`);
                        }

                        // Convert to a transaction error with detailed context
                        throw new AttachmentTransactionError({
                            operation: "createLinks",
                            transactionId,
                            completedCount: createdLinks.length,
                            totalCount: inputs.length,
                            message: `Failed creating link at position ${failedIndex} of ${inputs.length}`,
                            cause: error
                        });
                    }
                });
            };

            /**
             * Bulk operation to delete all links from a source entity with transaction support.
             * If any deletion fails, the operation will attempt to undo the deletions that succeeded.
             */
            const deleteLinksFrom = (
                entityA_id: EntityId,
                entityA_type: string,
            ): Effect.Effect<number, AttachmentTransactionError | AttachmentDbError | AttachmentLinkNotFoundError> => {
                // Generate a transaction ID for tracing purposes
                const transactionId = crypto.randomUUID();

                return Effect.gen(function* () {
                    // First, find all links from this entity
                    const links = yield* findLinksFrom(entityA_id, entityA_type);

                    if (links.length === 0) {
                        yield* Effect.logInfo(`No links found to delete for ${entityA_type}:${entityA_id} [tx:${transactionId}]`);
                        return 0;
                    }

                    yield* Effect.logInfo(`Deleting ${links.length} links from ${entityA_type}:${entityA_id} [tx:${transactionId}]`);

                    // Make a copy of links for potential rollback
                    const linksBackup = [...links];
                    const deletedLinks: string[] = [];
                    let failedLinkId: string | undefined;
                    let originalError: unknown;

                    try {
                        // Attempt to delete all links in one "transaction"
                        for (const link of links) {
                            if (!link) continue; // Skip undefined links
                            try {
                                yield* deleteLink(link.id);
                                deletedLinks.push(link.id);
                            } catch (error) {
                                failedLinkId = link.id;
                                originalError = error;
                                throw error;
                            }
                        }

                        yield* Effect.logInfo(`Successfully deleted ${deletedLinks.length} links [tx:${transactionId}]`);
                        return deletedLinks.length;
                    } catch (error) {
                        // If any deletion fails, attempt to restore deleted links
                        if (deletedLinks.length > 0) {
                            yield* Effect.logWarning(
                                `Rolling back ${deletedLinks.length} deleted links due to failure at ${failedLinkId} [tx:${transactionId}]`
                            );

                            // Track rollback success/failure
                            let restoreSuccessCount = 0;
                            let restoreFailCount = 0;

                            // Find the links that were successfully deleted
                            for (let i = 0; i < deletedLinks.length; i++) {
                                // Find the corresponding original link data
                                const originalLink = linksBackup.find(l => l.id === deletedLinks[i]);
                                if (!originalLink) continue;

                                try {
                                    yield* createLink({
                                        entityA_id: originalLink.data.entityA_id,
                                        entityA_type: originalLink.data.entityA_type,
                                        entityB_id: originalLink.data.entityB_id,
                                        entityB_type: originalLink.data.entityB_type,
                                        linkType: originalLink.data.linkType,
                                        metadata: originalLink.data.metadata,
                                        createdBy: originalLink.data.createdBy,
                                        expiresAt: originalLink.data.expiresAt
                                    });
                                    restoreSuccessCount++;
                                } catch (restoreError) {
                                    restoreFailCount++;
                                    yield* Effect.logError(`Failed to restore link ${originalLink.id} [tx:${transactionId}]`);
                                }
                            }

                            if (restoreFailCount > 0) {
                                yield* Effect.logError(
                                    `CRITICAL: ${restoreFailCount}/${deletedLinks.length} restores failed [tx:${transactionId}]`
                                );

                                return yield* Effect.fail(new AttachmentTransactionError({
                                    operation: "deleteLinksFrom",
                                    transactionId,
                                    completedCount: deletedLinks.length,
                                    totalCount: links.length,
                                    entityIds: [...deletedLinks],
                                    message: `Transaction rollback partially failed: ${restoreFailCount} links could not be restored`,
                                    cause: error
                                }));
                            }

                            yield* Effect.logInfo(`Successfully restored all ${restoreSuccessCount} links [tx:${transactionId}]`);
                        }

                        // Convert to a transaction error with detailed context
                        return yield* Effect.fail(new AttachmentTransactionError({
                            operation: "deleteLinksFrom",
                            transactionId,
                            entityIds: [entityA_id],
                            message: `Transaction failed: could not delete links from ${entityA_type}:${entityA_id} atomically`,
                            cause: error
                        }));
                    }
                });
            };

            /**
             * Bulk operation to delete all links to a target entity with transaction support.
             * If any deletion fails, the operation will attempt to undo the deletions that succeeded.
             */
            const deleteLinksTo = (
                entityB_id: EntityId,
                entityB_type: string,
            ): Effect.Effect<number, AttachmentTransactionError | AttachmentDbError | AttachmentLinkNotFoundError> => {
                // Generate a transaction ID for tracing purposes
                const transactionId = crypto.randomUUID();

                return Effect.gen(function* () {
                    // First, find all links to this entity
                    const links = yield* findLinksTo(entityB_id, entityB_type);

                    if (links.length === 0) {
                        yield* Effect.logInfo(`No links found to delete for ${entityB_type}:${entityB_id} [tx:${transactionId}]`);
                        return 0;
                    }

                    yield* Effect.logInfo(`Deleting ${links.length} links to ${entityB_type}:${entityB_id} [tx:${transactionId}]`);

                    // Make a copy of links for potential rollback
                    const linksBackup = [...links];
                    const deletedLinks: string[] = [];
                    let failedLinkId: string | undefined;
                    let originalError: unknown;

                    try {
                        // Attempt to delete all links in one "transaction"
                        for (const link of links) {
                            try {
                                yield* deleteLink(link.id);
                                deletedLinks.push(link.id);
                            } catch (error) {
                                failedLinkId = link.id;
                                originalError = error;
                                throw error;
                            }
                        }

                        yield* Effect.logInfo(`Successfully deleted ${deletedLinks.length} links [tx:${transactionId}]`);
                        return deletedLinks.length;
                    } catch (error) {
                        // If any deletion fails, attempt to restore deleted links
                        if (deletedLinks.length > 0) {
                            yield* Effect.logWarning(
                                `Rolling back ${deletedLinks.length} deleted links due to failure at ${failedLinkId} [tx:${transactionId}]`
                            );

                            // Track rollback success/failure
                            let restoreSuccessCount = 0;
                            let restoreFailCount = 0;

                            // Find the links that were successfully deleted
                            for (let i = 0; i < deletedLinks.length; i++) {
                                // Find the corresponding original link data
                                const originalLink = linksBackup.find(l => l.id === deletedLinks[i]);
                                if (!originalLink) continue;

                                try {
                                    yield* createLink({
                                        entityA_id: originalLink.data.entityA_id,
                                        entityA_type: originalLink.data.entityA_type,
                                        entityB_id: originalLink.data.entityB_id,
                                        entityB_type: originalLink.data.entityB_type,
                                        linkType: originalLink.data.linkType,
                                        metadata: originalLink.data.metadata,
                                        createdBy: originalLink.data.createdBy,
                                        expiresAt: originalLink.data.expiresAt
                                    });
                                    restoreSuccessCount++;
                                } catch (restoreError) {
                                    restoreFailCount++;
                                    yield* Effect.logError(`Failed to restore link ${originalLink.id} [tx:${transactionId}]`);
                                }
                            }

                            if (restoreFailCount > 0) {
                                yield* Effect.logError(
                                    `CRITICAL: ${restoreFailCount}/${deletedLinks.length} restores failed [tx:${transactionId}]`
                                );

                                return yield* Effect.fail(new AttachmentTransactionError({
                                    operation: "deleteLinksTo",
                                    transactionId,
                                    completedCount: deletedLinks.length,
                                    totalCount: links.length,
                                    entityIds: [...deletedLinks],
                                    message: `Transaction rollback partially failed: ${restoreFailCount} links could not be restored`,
                                    cause: error
                                }));
                            }

                            yield* Effect.logInfo(`Successfully restored all ${restoreSuccessCount} links [tx:${transactionId}]`);
                        }

                        // Convert to a transaction error with detailed context
                        return yield* Effect.fail(new AttachmentTransactionError({
                            operation: "deleteLinksTo",
                            transactionId,
                            entityIds: [entityB_id],
                            message: `Transaction failed: could not delete links to ${entityB_type}:${entityB_id} atomically`,
                            cause: error
                        }));
                    }
                });
            };

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
 * Default implementation of the AttachmentService.
 * This allows for direct usage via AttachmentService.Default
 */
export const Default = AttachmentService;

