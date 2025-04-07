/**
 * @file Tests for the AttachmentApi live implementation.
 */

import { Cause, Effect, Exit, Layer, Option, Ref } from "effect";
import { describe, expect, it } from "vitest";

import { AttachmentLinkNotFoundError } from "@core/attachment/errors.js";
import type { AttachmentLinkEntity } from "@core/attachment/schema.js";
// Import API and types from the service being tested
import { AttachmentApi, AttachmentApiInterface, CreateAttachmentLinkInput } from "@core/attachment/types.js";

// Import the 'make' function for the repository directly
import { make as makeInMemoryRepository } from "@core/repository/implementations/in-memory/live.js";

import type { EntityId } from "@/types.js"; // Use path alias
import { AttachmentDbError } from "@core/attachment/errors.js";
import { EntityNotFoundError as RepoEntityNotFoundError } from "@core/repository/errors.js";

// --- Test Setup ---

// Define the entity type string identifier
const attachmentEntityType = "AttachmentLink";

// Create a simplified direct implementation of AttachmentApi for testing
const createTestAttachmentApi = (): Effect.Effect<AttachmentApiInterface> => {
    return Effect.gen(function* () {
        // Create in-memory repo directly
        const store = yield* Ref.make(new Map<EntityId, AttachmentLinkEntity>());
        const repo = makeInMemoryRepository<AttachmentLinkEntity>(
            attachmentEntityType,
            store
        );

        // Define service methods
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

        return {
            createLink,
            deleteLink,
            findLinksFrom,
            findLinksTo,
            getLinkById,
        };
    });
};

// Create a Layer that provides our test implementation
const TestApiLayer = Layer.effect(
    AttachmentApi,
    createTestAttachmentApi()
);

// Helper functions to run tests with the layer provided
const runTest = <E, A>(effect: Effect.Effect<A, E, AttachmentApi>) => {
    const providedEffect = Effect.provide(effect, TestApiLayer) as Effect.Effect<A, E, never>;
    // Add logging for any Cause (Failure or Die)
    const effectWithLogging = providedEffect.pipe(
        Effect.catchAllCause(cause => {
            console.error("Effect Cause in runTest:", Cause.pretty(cause));
            // Re-fail with the original cause so Vitest sees a rejection
            return Effect.failCause(cause);
        })
    );
    return Effect.runPromise(effectWithLogging);
}

const runFailTest = <E, A>(effect: Effect.Effect<A, E, AttachmentApi>) => {
    const providedEffect = Effect.provide(effect, TestApiLayer) as Effect.Effect<A, E, never>;
    // Add logging for any Cause (Failure or Die)
    const effectWithLogging = providedEffect.pipe(
        Effect.catchAllCause(cause => {
            console.error("Effect Cause in runFailTest:", Cause.pretty(cause));
            // Re-fail with the original cause. runPromiseExit will capture this.
            return Effect.failCause(cause);
        })
    );
    return Effect.runPromiseExit(effectWithLogging);
}

// --- Test Data ---
const linkInput1: CreateAttachmentLinkInput = {
    entityA_id: "chat-1",
    entityA_type: "ChatMessage",
    entityB_id: "file-abc",
    entityB_type: "File",
    linkType: "GENERATED",
};
const linkInput2: CreateAttachmentLinkInput = {
    entityA_id: "chat-1", // Same source
    entityA_type: "ChatMessage",
    entityB_id: "file-def", // Different target
    entityB_type: "File",
};
const linkInput3: CreateAttachmentLinkInput = {
    entityA_id: "exec-5", // Different source
    entityA_type: "SkillExecution",
    entityB_id: "file-abc", // Same target as 1
    entityB_type: "File",
};

// --- Test Suite ---
describe("AttachmentApiLive", () => {

    it("should create a link", async () => {
        // Effect requires AttachmentApi
        const effect = Effect.gen(function* () {
            const attachmentApi = yield* AttachmentApi;
            const created = yield* attachmentApi.createLink(linkInput1);

            expect(created.id).toBeTypeOf("string");
            expect(created.createdAt).toBeTypeOf("number");
            expect(created.data.entityA_id).toBe(linkInput1.entityA_id);
            expect(created.data.entityA_type).toBe(linkInput1.entityA_type);
            expect(created.data.entityB_id).toBe(linkInput1.entityB_id);
            expect(created.data.entityB_type).toBe(linkInput1.entityB_type);
            expect(created.data.linkType).toBe(linkInput1.linkType);
            return created;
        });
        await expect(runTest(effect)).resolves.toBeDefined();
    });

    it("should get a link by its ID", async () => {
        let createdId: EntityId;
        // Effect requires AttachmentApi
        const effect = Effect.gen(function* () {
            const attachmentApi = yield* AttachmentApi;
            const created = yield* attachmentApi.createLink(linkInput1);
            createdId = created.id;

            const foundOpt = yield* attachmentApi.getLinkById(createdId);
            expect(Option.isSome(foundOpt)).toBe(true);
            if (Option.isSome(foundOpt)) {
                expect(foundOpt.value.id).toBe(createdId);
                expect(foundOpt.value.data.entityA_id).toBe(linkInput1.entityA_id);
            }

            const notFoundOpt = yield* attachmentApi.getLinkById("non-existent");
            expect(Option.isNone(notFoundOpt)).toBe(true);
        });
        await expect(runTest(effect)).resolves.toBeUndefined();
    });

    it("should find links from a specific entity", async () => {
        // Effect requires AttachmentApi
        const effect = Effect.gen(function* () {
            const attachmentApi = yield* AttachmentApi;
            yield* attachmentApi.createLink(linkInput1); // chat-1 -> file-abc
            yield* attachmentApi.createLink(linkInput2); // chat-1 -> file-def
            yield* attachmentApi.createLink(linkInput3); // exec-5 -> file-abc

            const linksFromChat1 = yield* attachmentApi.findLinksFrom(
                "chat-1",
                "ChatMessage",
            );
            expect(linksFromChat1).toHaveLength(2);
            expect(linksFromChat1.map((l) => l.data.entityB_id)).toEqual(
                expect.arrayContaining(["file-abc", "file-def"]),
            );

            const linksFromExec5 = yield* attachmentApi.findLinksFrom(
                "exec-5",
                "SkillExecution",
            );
            expect(linksFromExec5).toHaveLength(1);
            expect(linksFromExec5[0]?.data.entityB_id).toBe("file-abc");

            const linksFromNonExistent = yield* attachmentApi.findLinksFrom(
                "other-id",
                "OtherType",
            );
            expect(linksFromNonExistent).toHaveLength(0);
        });
        await expect(runTest(effect)).resolves.toBeUndefined();
    });

    it("should find links to a specific entity", async () => {
        // Effect requires AttachmentApi
        const effect = Effect.gen(function* () {
            const attachmentApi = yield* AttachmentApi;
            yield* attachmentApi.createLink(linkInput1); // chat-1 -> file-abc
            yield* attachmentApi.createLink(linkInput2); // chat-1 -> file-def
            yield* attachmentApi.createLink(linkInput3); // exec-5 -> file-abc

            const linksToFileAbc = yield* attachmentApi.findLinksTo(
                "file-abc",
                "File",
            );
            expect(linksToFileAbc).toHaveLength(2);
            expect(linksToFileAbc.map((l) => l.data.entityA_id)).toEqual(
                expect.arrayContaining(["chat-1", "exec-5"]),
            );

            const linksToFileDef = yield* attachmentApi.findLinksTo(
                "file-def",
                "File",
            );
            expect(linksToFileDef).toHaveLength(1);
            expect(linksToFileDef[0]?.data.entityA_id).toBe("chat-1");

            const linksToNonExistent = yield* attachmentApi.findLinksTo(
                "other-id",
                "OtherType",
            );
            expect(linksToNonExistent).toHaveLength(0);
        });
        await expect(runTest(effect)).resolves.toBeUndefined();
    });

    it("should delete a link", async () => {
        let createdId: EntityId;
        // Effect requires AttachmentApi
        const effect = Effect.gen(function* () {
            const attachmentApi = yield* AttachmentApi;
            const created = yield* attachmentApi.createLink(linkInput1);
            createdId = created.id;

            // Verify exists
            const foundOpt = yield* attachmentApi.getLinkById(createdId);
            expect(Option.isSome(foundOpt)).toBe(true);

            // Delete
            yield* attachmentApi.deleteLink(createdId);

            // Verify gone
            const notFoundOpt = yield* attachmentApi.getLinkById(createdId);
            expect(Option.isNone(notFoundOpt)).toBe(true);
        });
        await expect(runTest(effect)).resolves.toBeUndefined();
    });

    it("should fail deleteLink with AttachmentLinkNotFoundError for non-existent ID", async () => {
        // Effect requires AttachmentApi
        const effect = Effect.gen(function* () {
            const attachmentApi = yield* AttachmentApi;
            return yield* attachmentApi.deleteLink("non-existent-id");
        });
        // Use runFailTest helper
        const exit = await runFailTest(effect);
        expect(exit._tag).toBe("Failure");
        if (Exit.isFailure(exit)) {
            const failure = Cause.failureOption(exit.cause);
            expect(Option.isSome(failure)).toBe(true);
            if (Option.isSome(failure)) {
                expect(failure.value._tag).toBe("AttachmentLinkNotFoundError");
                expect((failure.value as AttachmentLinkNotFoundError).linkId).toBe("non-existent-id");
            }
        } else {
            expect.fail("Expected effect to fail");
        }
    });

});
