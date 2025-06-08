import { Effect, Option } from "effect";
import type { ChatServiceApi } from "./api.js";
import type { ChatCompletionResult } from "./types.js";
/**
 * Chat generation agent state
 */
export interface ChatAgentState {
    readonly completionCount: number;
    readonly lastCompletion: Option.Option<ChatCompletionResult>;
    readonly lastUpdate: Option.Option<number>;
    readonly completionHistory: ReadonlyArray<{
        readonly timestamp: number;
        readonly modelId: string;
        readonly inputLength: number;
        readonly responseLength: number;
        readonly success: boolean;
        readonly finishReason: string;
        readonly toolCallsCount: number;
    }>;
}
declare const ChatService_base: Effect.Service.Class<ChatServiceApi, "ChatService", {
    readonly effect: Effect.Effect<ChatServiceApi, never, import("@/services/ai/index.js").ModelServiceApi | import("@/services/ai/index.js").ProviderServiceApi>;
}>;
/**
 * ChatService provides methods for generating chat completions using AI providers.
 * Simplified implementation without AgentRuntime dependency.
 */
export declare class ChatService extends ChatService_base {
}
export default ChatService;
//# sourceMappingURL=service.d.ts.map