import { Context, Data, Effect, ReadonlyArray } from "effect";
import { z } from "zod";

// Assuming RepositoryService errors are defined and accessible
import {
    type DataValidationError as RepoDataValidationError,
    type EntityNotFoundError as RepoEntityNotFoundError,
    type RepositoryError as RepoError,
} from "../repository/errors"; // Adjust path

// Assuming SkillService errors are defined and accessible
import { type SkillExecutionError } from "../skill/errors"; // Adjust path

// Assuming BaseEntity is defined by RepositoryService
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
    conversationId: z.string().min(1),
    role: ChatMessageSchema.shape.role,
    content: ChatMessageSchema.shape.content,
    timestamp: ChatMessageSchema.shape.timestamp,
    /** Stores metadata, including the link for summary messages. */
    metadata: ChatMessageSchema.shape.metadata.optional(),
});
export type ChatMessageEntityData = z.infer<typeof ChatMessageEntityDataSchema>;
export type ChatMessageEntity = BaseEntity<ChatMessageEntityData>; // Type including repo metadata

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
    BaseEntity<SummarizationMetadataEntityData>; // Type including repo metadata

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
    readonly cause?: RepoEntityNotFoundError | unknown; // Can be optional if not always caused by repo
}> { }

/** General error for repository, skill, or other unexpected failures. */
export class GenericMemoryError extends Data.TaggedError("GenericMemoryError")<{
    readonly message: string;
    readonly cause?: RepoError | SkillExecutionError | unknown; // Include Skill errors
}> { }

// --- Service Interface ---

/**
 * Defines the contract for the ChatMemoryService.
 * Manages persistent conversational history.
 */
export interface IChatMemoryService {
    /**
     * Retrieves an ordered list of chat messages for a given conversation.
     * Includes summary messages in their chronological position.
     *
     * @param params Parameters including conversationId and optional filters.
     * @returns An Effect yielding a readonly array of `ChatMessage` (can be empty
     *          if conversation exists but has no messages matching criteria),
     *          or failing with `ConversationNotFoundError` or `GenericMemoryError`.
     */
    readonly getMessages: (params: {
        readonly conversationId: string;
        readonly limit?: number; // Max number of messages to return (most recent)
        readonly before?: Date; // Retrieve messages with timestamp before this date
        // readonly after?: Date; // Potentially add later for pagination
    }) => Effect.Effect<
        ReadonlyArray<ChatMessage>,
        ConversationNotFoundError | GenericMemoryError
    >;

    /**
     * Adds one or more messages to a conversation's history.
     * Creates the history if it doesn't exist.
     * Triggers the configured history management strategy (e.g., summarization)
     * after successfully adding messages.
     *
     * @param params Parameters including conversationId and messages to add.
     * @returns An Effect that completes successfully (`void`) or fails with
     *          `DataValidationError` or `GenericMemoryError`. Strategy errors
     *          are typically handled internally but could potentially surface
     *          as `GenericMemoryError` depending on configuration/implementation.
     */
    readonly addMessages: (params: {
        readonly conversationId: string;
        /** Must provide at least one message. */
        readonly messages: ReadonlyArray.NonEmptyReadonlyArray<ChatMessage>;
    }) => Effect.Effect<void, DataValidationError | GenericMemoryError>;

    /**
     * Clears the message history and associated summarization metadata
     * for a specific conversation.
     *
     * @param params Parameters including conversationId.
     * @returns An Effect that completes successfully (`void`) or fails with
     *          `ConversationNotFoundError` (if no history existed) or `GenericMemoryError`.
     */
    readonly clearMessages: (params: {
        readonly conversationId: string;
    }) => Effect.Effect<void, ConversationNotFoundError | GenericMemoryError>;
}

// --- Service Tag ---

/**
 * Effect Tag for the ChatMemoryService. Use this to specify the service
 * as a dependency in Effect layers and access it from the context.
 */
export class ChatMemoryService extends Context.Tag("ChatMemoryService")<
    ChatMemoryService,
    IChatMemoryService
>() { }
