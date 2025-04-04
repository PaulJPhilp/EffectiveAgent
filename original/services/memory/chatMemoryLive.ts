// src/memory/chat/chat-memory-service-live.ts (Example path)
import { Effect, Layer, ReadonlyArray } from "effect";
import {
    type IChatMemoryService, ChatMemoryService, type ChatMessage,
    type ChatMessageEntityData, type SummarizationMetadataEntityData,
    DataValidationError, ConversationNotFoundError, GenericMemoryError,
    ChatMessageEntityDataSchema, // Import schema if needed for validation
} from "./chat-memory-service"; // Adjust path
import { ILoggingService, LoggingService } from "../../logging/types"; // Adjust path
import { IRepositoryService, RepositoryService } from "../../repository/repository-service"; // Adjust path
import { DataValidationError as RepoDataValidationError, EntityNotFoundError as RepoEntityNotFoundError } from "../../repository/errors"; // Adjust path
import { MemoryManagementStrategyTag, type MemoryManagementStrategy } from "./testing/mocks"; // Adjust path to where Tag is defined

export class ChatMemoryServiceLive implements IChatMemoryService {
    // Assuming repository service handles both types via the generic tag
    constructor(
        private readonly repository: IRepositoryService<any>, // Use 'any' or a base type
        private readonly logging: ILoggingService,
        private readonly strategy: MemoryManagementStrategy
    ) { }

    // Helper to map repo errors
    private mapRepoError = (error: unknown, conversationId?: string): ChatMemoryError => {
        if (error instanceof RepoDataValidationError) {
            return new DataValidationError({ message: "Invalid message data for storage", cause: error });
        }
        if (error instanceof RepoEntityNotFoundError && conversationId) {
            return new ConversationNotFoundError({ conversationId: conversationId, message: `Conversation entity not found: ${error.message}`, cause: error });
        }
        if (error instanceof RepoEntityNotFoundError) {
            // Should have conversationId if mapping from repo error in context
            return new GenericMemoryError({ message: `Repository entity not found: ${error.message}`, cause: error });
        }
        // Map RepoError and others to GenericMemoryError
        return new GenericMemoryError({ message: "Chat memory repository operation failed", cause: error });
    }

    getMessages = (params: { conversationId: string; limit?: number; before?: Date }) =>
        Effect.gen(function* (_) {
            const log = yield* _(this.logging.getLogger("ChatMemoryService"));

            // Simple existence check first
            const existenceCheck = yield* _(
                this.repository.find({ conversationId: params.conversationId } /* Add limit: 1 if repo supports */)
                    .pipe(
                        Effect.map(results => results.length > 0),
                        Effect.catchAll(repoError => Effect.fail(this.mapRepoError(repoError, params.conversationId)))
                    )
            );

            if (!existenceCheck) {
                return yield* _(Effect.fail(new ConversationNotFoundError({ conversationId: params.conversationId, message: "Conversation history not found" })));
            }

            // Fetch actual messages with criteria
            // TODO: Add sorting, limit, before criteria to find call if mock/repo supports it
            const entities = yield* _(
                this.repository.find({ conversationId: params.conversationId })
                    .pipe(Effect.mapError(e => this.mapRepoError(e, params.conversationId)))
            );

            // Filter only ChatMessageEntityData (repo mock might return mixed types if not careful)
            const chatEntities = entities.filter(e => isChatMessageData(e.data));

            // Sort and map
            const messages = chatEntities
                .sort((a, b) => a.data.timestamp.getTime() - b.data.timestamp.getTime()) // Ascending for history
                .slice(params.limit ? -params.limit : 0) // Apply limit (most recent) - adjust if repo handles limit
                .map(entity => ({
                    role: entity.data.role,
                    content: entity.data.content,
                    timestamp: entity.data.timestamp,
                    metadata: entity.data.metadata,
                } as ChatMessage));

            return ReadonlyArray.fromIterable(messages);
        }).pipe(Effect.annotateLogs({ service: "ChatMemoryService", method: "getMessages" }));


    addMessages = (params: { conversationId: string; messages: ReadonlyArray.NonEmptyReadonlyArray<ChatMessage> }) =>
        Effect.gen(function* (_) {
            const log = yield* _(this.logging.getLogger("ChatMemoryService"));
            const messagesToAdd = ReadonlyArray.toReadonlyArray(params.messages);
            const now = new Date(); // Consistent timestamp for batch

            const createEffects = messagesToAdd.map(msg => {
                // Basic validation example
                const validation = ChatMessageSchema.safeParse(msg);
                if (!validation.success) {
                    return Effect.fail(new DataValidationError({ message: `Invalid input message structure: ${validation.error.message}`, cause: validation.error }));
                }

                const entityData: ChatMessageEntityData = {
                    conversationId: params.conversationId,
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.timestamp ?? now,
                    metadata: msg.metadata
                };
                return this.repository.create(entityData).pipe(
                    Effect.mapError(e => this.mapRepoError(e, params.conversationId))
                );
            });

            // Execute creates
            const createdEntities = yield* _(Effect.all(createEffects, { concurrency: "inherit" }));

            // Get total count *after* adding (approximation without transaction)
            // This needs a proper count method in repo ideally
            const countResult = yield* _(
                this.repository.find({ conversationId: params.conversationId })
                    .pipe(
                        Effect.map(entities => entities.filter(e => isChatMessageData(e.data)).length), // Count only chat messages
                        Effect.catchAll(() => Effect.succeed(messagesToAdd.length)) // Fallback count
                    )
            );

            // Trigger post-add hook
            yield* _(
                this.strategy.postAddMessagesHook({
                    conversationId: params.conversationId,
                    addedMessagesCount: messagesToAdd.length,
                    totalMessagesCount: countResult
                })
                // Errors from hook are handled within the strategy mock/impl
            );

            yield* _(log.debug("Messages added successfully", { conversationId: params.conversationId, count: messagesToAdd.length }));

        }).pipe(Effect.annotateLogs({ service: "ChatMemoryService", method: "addMessages" }));


    clearMessages = (params: { conversationId: string }) =>
        Effect.gen(function* (_) {
            const log = yield* _(this.logging.getLogger("ChatMemoryService"));
            // Find all relevant entities
            const entitiesToDelete = yield* _(
                this.repository.find({ conversationId: params.conversationId })
                    .pipe(Effect.mapError(e => this.mapRepoError(e, params.conversationId)))
            );

            if (entitiesToDelete.length === 0) {
                return yield* _(Effect.fail(new ConversationNotFoundError({ conversationId: params.conversationId, message: "Conversation not found, nothing to clear" })));
            }

            const deleteEffects = entitiesToDelete.map(entity =>
                this.repository.delete(entity.id).pipe(
                    // Don't fail on EntityNotFoundError during delete if we already found it
                    Effect.catchTag("EntityNotFoundError", () => Effect.void),
                    Effect.mapError(e => this.mapRepoError(e, params.conversationId))
                )
            );

            // Execute deletes
            yield* _(Effect.all(deleteEffects, { concurrency: "inherit", discard: true }));
            yield* _(log.info("Messages cleared successfully", { conversationId: params.conversationId, count: entitiesToDelete.length }));
        }).pipe(Effect.annotateLogs({ service: "ChatMemoryService", method: "clearMessages" }));
}

// Layer for the Live Service
export const ChatMemoryServiceLiveLayer = Layer.effect(
    ChatMemoryService,
    Effect.gen(function* (_) {
        const logSvc = yield* _(LoggingService);
        const repoSvc = yield* _(RepositoryService); // Get the generic repo
        const strategy = yield* _(MemoryManagementStrategyTag); // Get the strategy via Tag
        return new ChatMemoryServiceLive(repoSvc, logSvc, strategy);
    })
);
