// src/services/pipeline/chat/api.ts
import type { Effect, Ref } from "effect";
import { EffectiveError } from "@/errors.js";
import type { ChatAgentState } from "./service.js";

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
  messages: ReadonlyArray<ChatMessage>;
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
 * Service API for managing chat history with AgentRuntime integration
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
  ): Effect.Effect<ReadonlyArray<ChatMessage>, ChatHistoryError>;

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
    messages: ReadonlyArray<ChatMessage>,
    response: string,
  ): Effect.Effect<void, ChatHistoryError>;

  /**
   * Get the current agent state for monitoring/debugging
   */
  readonly getAgentState: () => Effect.Effect<ChatAgentState, never>;

  /**
   * Get the runtime status (returns error as runtime is not available in simplified state)
   * @returns Effect that resolves to state information
   */
  readonly getRuntime: () => Effect.Effect<{ state: Ref.Ref<ChatAgentState> }, never>;

  /**
   * Terminate the agent
   */
  readonly terminate: () => Effect.Effect<void>;
}
