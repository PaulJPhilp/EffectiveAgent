import { EffectiveError } from "@/errors.js";
// src/services/pipeline/chat/api.ts
import { Effect } from "effect";

/**
 * Represents a message in a chat conversation
 */
export interface ChatMessage {
  /** The role of the message sender */
  role: "user" | "assistant" | "system";
  /** The content of the message */
  content: string;
}

/**
 * Represents a chat history with its messages
 */
export interface ChatHistory {
  /** The ordered list of messages in the chat */
  messages: ChatMessage[];
}

/**
 * Errors that can occur in chat history operations
 */
export class ChatHistoryError extends EffectiveError {
  constructor(params: { description: string; method: string; cause?: unknown }) {
    super({ ...params, module: "ChatHistoryService" });
  }

  static invalidHistoryId(historyId: string): ChatHistoryError {
    return new ChatHistoryError({
      description: `Invalid history ID: ${historyId}`,
      method: "validateHistoryId"
    });
  }

  static invalidHistory(reason: string): ChatHistoryError {
    return new ChatHistoryError({
      description: `Invalid chat history: ${reason}`,
      method: "validateHistory"
    });
  }

  static loadFailed(historyId: string, cause?: unknown): ChatHistoryError {
    return new ChatHistoryError({
      description: `Failed to load chat history: ${historyId}`,
      method: "loadHistory",
      cause
    });
  }

  static saveFailed(historyId: string, cause?: unknown): ChatHistoryError {
    return new ChatHistoryError({
      description: `Failed to save chat history: ${historyId}`,
      method: "saveHistory",
      cause
    });
  }
}

/**
 * Service API for managing chat history
 */
export interface ChatHistoryServiceApi {
  /**
   * Loads chat history based on an identifier.
   * Returns null if not found.
   * 
   * @param historyId - The unique identifier for the chat history
   * @returns Effect that resolves to the chat history or null if not found
   * @throws ChatHistoryError if validation fails or operation errors
   */
  loadHistory(
    historyId: string,
  ): Effect.Effect<ChatHistory | null, ChatHistoryError>;

  /**
   * Saves or updates chat history.
   * 
   * @param historyId - The unique identifier for the chat history
   * @param history - The chat history to save
   * @returns Effect that completes when save is successful
   * @throws ChatHistoryError if validation fails or operation errors
   */
  saveHistory(
    historyId: string,
    history: ChatHistory,
  ): Effect.Effect<void, ChatHistoryError>;

  /**
   * Loads chat history and appends a user message.
   * If historyId is not provided or history not found, starts with empty history.
   * 
   * @param historyId - Optional unique identifier for the chat history
   * @param userMessage - The user message to append
   * @returns Effect that resolves to the messages array including the new message
   * @throws ChatHistoryError if validation fails or operation errors
   */
  loadAndAppendMessage(
    historyId: string | undefined,
    userMessage: string,
  ): Effect.Effect<ChatMessage[], ChatHistoryError>;

  /**
   * Appends an assistant's response to the chat history and saves it.
   * 
   * @param historyId - The unique identifier for the chat history
   * @param messages - The current messages array
   * @param response - The assistant's response to append
   * @returns Effect that completes when save is successful
   * @throws ChatHistoryError if validation fails or operation errors
   */
  appendAndSaveResponse(
    historyId: string | undefined,
    messages: ChatMessage[],
    response: string,
  ): Effect.Effect<void, ChatHistoryError>;
}
