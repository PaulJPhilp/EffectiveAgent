import { Effect } from "effect";
import type { AgentActivity } from "./types.js";

export declare const wsParse: (message: string) => Effect.Effect<AgentActivity, SyntaxError>;
export declare const wsStringify: (activity: AgentActivity) => string; 