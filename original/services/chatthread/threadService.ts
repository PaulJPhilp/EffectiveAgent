import { Context, Data, Effect, Layer, Option, ReadonlyArray } from "effect";
import { z } from "zod";

// --- Dependency Error Imports ---
import {
    type DataValidationError as RepoDataValidationError,
    type EntityNotFoundError as RepoEntityNotFoundError,
    type RepositoryError as RepoError,
} from "../repository/errors"; // Adjust path
import { type SkillExecutionError } from "../skill/errors"; // Adjust path
import { type BaseEntity } from "../repository/entities/base-entity"; // Adjust path

// --- Data Structures ---

/**
 * Zod schema for the logical representation of a chat message.
 */
export const ChatMessageSchema = z.object({
    role: z.enum(["user", "assistant", "system", "tool", "summary"]),
    content: z.string(),
    timestamp: z.date(),
    /** Optional metadata. For summary messages, should contain `summaryMetadataId`. */
    metadata: z.record(z.unknown()).optional(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

/**
 * Zod schema for the data stored per chat message via RepositoryService.
 */
export const ChatMessageEntityDataSchema = z.object({
    conversationId: z.string().min(1), // Corresponds to threadId
    role: ChatMessageSchema.shape.role,
    content: ChatMessageSchema.shape.content,
    timestamp: ChatMessageSchema.shape.timestamp,
    /** Stores metadata, including the link for summary messages. */
    metadata: ChatMessageSchema.shape.metadata.optional(),
    /** Optional: Denormalized originating thread ID for faster history lookup */
    // originatingThreadId: z.string().min(1).optional(),
});
export type ChatMessageEntityData = z.infer<typeof ChatMessageEntityDataSchema>;
export type ChatMessageEntity = BaseEntity<ChatMessageEntityData>;

/**
 * Zod schema for the data stored per summarization event via RepositoryService.
 */
export const SummarizationMetadataEntityDataSchema = z.object({
    conversationId: z.string().min(1),
    /** IDs of the original messages that were summarized. */
    summarizedMessageIds: z.array(z.string()).min(1),
    /** ID of the corresponding summary message (role: 'summary'). Added after summary creation. */
    summaryMessageId: z.string().optional(),
    /** Timestamp range covered by the summarized messages. */
    timestampRange: z.object({ start: z.date(), end: z.date() }),
});
export type SummarizationMetadataEntityData = z.infer<
    typeof SummarizationMetadataEntityDataSchema
>;
export type SummarizationMetadataEntity =
    BaseEntity<SummarizationMetadataEntityData>;

// --- Error Types ---

/** Union type for all errors potentially raised by ChatMemoryService. */
export type ChatMemoryError =
    | DataValidationError
    | ConversationNotFoundError
    | GenericMemoryError;

/** Error indicating invalid message data was provided or encountered. */
export class DataValidationError extends Data.TaggedError("DataValidationError")<{
    readonly message: string;
    readonly cause?: unknown; // e.g., ZodError or RepoDataValidationError
}> { }

/** Error indicating the specified conversationId was not found. */
export class ConversationNotFoundError extends Data.TaggedError(
    "ConversationNotFoundError"
)<{
    readonly conversationId: string;
    readonly message: string;
    readonly cause?: RepoEntityNotFoundError | unknown;
}> { }

/** General error for repository, skill (via strategy), or other unexpected failures. */
export class GenericMemoryError extends Data.TaggedError("GenericMemoryError")<{
    readonly message: string;
    readonly cause?: RepoError | SkillExecutionError | unknown;
}> { }

// --- History Management Strategy Interface (Defined here or imported) ---
export interface MemoryManagementStrategy {
    readonly postAddMessagesHook: (params: {
        readonly conversationId: string;
        readonly addedMessagesCount: number;
        readonly totalMessagesCount: number;
    }) => Effect.Effect<void, GenericMemoryError>; // Errors mapped to GenericMemoryError
}
export const MemoryManagementStrategyTag = Context.Tag<MemoryManagementStrategy>();


// --- Service Interface ---

/**
 * Defines the contract for the ChatMemoryService.
 * Manages persistent conversational history (messages).
 */
export interface IChatMemoryService {
    /**
     * Retrieves the ordered message history for a conversation/thread,
     * potentially traversing parent branches. Includes summaries.
     *
     * @param params Parameters including conversationId (threadId) and optional filters.
     * @returns An Effect yielding a readonly array of `ChatMessage` (can be empty),
     *          or failing with `ConversationNotFoundError` or `GenericMemoryError`.
     */
    readonly getMessages: (params: {
        readonly conversationId: string; // Corresponds to threadId
        readonly limit?: number; // Max number of *final* messages after assembly
        readonly before?: Date; // Filter messages before this timestamp
        // Add other potential parameters needed for branch traversal?
    }) => Effect.Effect<
        ReadonlyArray<ChatMessage>,
        ConversationNotFoundError | GenericMemoryError
    >;

    /**
     * Adds one or more messages to a conversation's history.
     * Triggers the configured history management strategy afterwards.
     *
     * @param params Parameters including conversationId (threadId) and messages.
     * @returns An Effect completing successfully (`void`) or failing with
     *          `DataValidationError` or `GenericMemoryError`.
     */
    readonly addMessages: (params: {
        readonly conversationId: string; // Corresponds to threadId
        readonly messages: ReadonlyArray.NonEmptyReadonlyArray<ChatMessage>;
    }) => Effect.Effect<void, DataValidationError | GenericMemoryError>;

    /**
     * Clears the message history and associated summarization metadata
     * for a specific conversation/thread.
     *
     * @param params Parameters including conversationId (threadId).
     * @returns An Effect completing successfully (`void`) or failing with
     *          `ConversationNotFoundError` or `GenericMemoryError`.
     */
    readonly clearMessages: (params: {
        readonly conversationId: string; // Corresponds to threadId
    }) => Effect.Effect<void, ConversationNotFoundError | GenericMemoryError>;
}

// --- Service Tag ---

/**
 * Effect Tag for the ChatMemoryService.
 */
export class ChatMemoryService extends Context.Tag("ChatMemoryService")<
    ChatMemoryService,
    IChatMemoryService
>() { }