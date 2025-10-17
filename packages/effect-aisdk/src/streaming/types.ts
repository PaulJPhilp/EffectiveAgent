/** eslint-disable @typescript-eslint/no-explicit-any */
export type StreamEventBase = {
  timestamp: number;
  provider: "openai" | "anthropic" | "unknown";
};

export type TokenDeltaEvent = StreamEventBase & {
  type: "token-delta";
  delta: string;
};

export type MessagePartEvent = StreamEventBase & {
  type: "message-part";
  contentPart: string | { type: string; data: any };
};

export type ToolCallStartedEvent = StreamEventBase & {
  type: "tool-call-started";
  toolName: string;
  argsPartial?: Record<string, any>;
};

export type ToolCallDeltaEvent = StreamEventBase & {
  type: "tool-call-delta";
  toolName: string;
  argsDelta: Record<string, any>;
};

export type ToolCallReadyEvent = StreamEventBase & {
  type: "tool-call-ready";
  toolName: string;
  argsFinal: Record<string, any>;
};

export type ToolResultEvent = StreamEventBase & {
  type: "tool-result";
  toolName: string;
  result: any;
};

export type FinalMessageEvent = StreamEventBase & {
  type: "final-message";
  text: string;
  raw?: any;
};

export type StreamErrorEvent = StreamEventBase & {
  type: "error";
  error: Error;
};

export type StreamCompleteEvent = StreamEventBase & {
  type: "complete";
};

export type UnifiedStreamEvent =
  | TokenDeltaEvent
  | MessagePartEvent
  | ToolCallStartedEvent
  | ToolCallDeltaEvent
  | ToolCallReadyEvent
  | ToolResultEvent
  | FinalMessageEvent
  | StreamErrorEvent
  | StreamCompleteEvent;

export type StreamCallbacks = Partial<{
  onTokenDelta: (e: TokenDeltaEvent) => void;
  onMessagePart: (e: MessagePartEvent) => void;
  onToolCallStarted: (e: ToolCallStartedEvent) => void;
  onToolCallDelta: (e: ToolCallDeltaEvent) => void;
  onToolCallReady: (e: ToolCallReadyEvent) => void;
  onToolResult: (e: ToolResultEvent) => void;
  onFinalMessage: (e: FinalMessageEvent) => void;
  onError: (e: StreamErrorEvent) => void;
  onComplete: (e: StreamCompleteEvent) => void;
}>;

export type StreamOptions = {
  provider: "openai" | "anthropic" | "unknown";
  // model and provider specific params
  model: string;
  temperature?: number;
  top_p?: number;
  // messages content according to provider's chat/message API
  messages: Array<
    | { role: "system" | "user" | "assistant"; content: string }
    | Record<string, any>
  >;
  // room for future: tools, toolChoice, responseFormat, etc.
  signal?: AbortSignal;
};

export type StreamHandle = {
  readable: ReadableStream<UnifiedStreamEvent>;
  // helper to collect final text from the stream
  collectText: () => Promise<string>;
  // hook up event callbacks
  pipeToCallbacks: (cb: StreamCallbacks) => void;
};

export type StreamResult<T = string> = {
  text: string;
  object?: T;
  finishReason: "stop" | "length" | "tool_calls" | "content_filter" | "error";
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

export type StreamEvents = UnifiedStreamEvent[];

export type StreamController = {
  enqueue: (event: UnifiedStreamEvent) => void;
  error: (error: Error) => void;
  close: () => void;
};
