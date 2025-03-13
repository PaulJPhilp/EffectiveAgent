import type { StateGraph } from "@langchain/langgraph"
import { END, Send, START } from "@langchain/langgraph"
import type { NormalizationState } from "../types.js"

/**
 * Add edges to connect the normalization nodes in the graph
 */
export function addEdges(graph: StateGraph<NormalizationState>): void {
    // Define the routing function
    function routeNext(state: NormalizationState) {
        if (state.status === "error") {
            return new Send(END, state)
        }
        if (state.status === "initializing") {
            return new Send("initialize_run", state)
        }
        if (state.status === "profiles_loaded") {
            return new Send("load_profiles", state)
        }
        if (state.status === "profiles_normalized") {
            return new Send("normalize_profiles", state)
        }
        if (state.status === "complete") {
            return new Send(END, state)
        }
        return new Send("save_results", state)
    }

    // Add conditional edges based on state status
    graph.addConditionalEdges(START, routeNext)
} 