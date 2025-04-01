import { Effect, Option } from "effect"
import { z } from "zod"
import { ToolExecutionError } from "../errors/index.js"
import type { Tool, ToolExecutionContext } from "../types/index.js"

// --- Schemas --- 

const WebSearchInputSchema = z.object({
    query: z.string().min(1, { message: "Search query cannot be empty." })
        .describe("The search query string.")
})

type WebSearchInput = z.infer<typeof WebSearchInputSchema>

const SearchResultSchema = z.object({
    title: z.string().describe("The title of the search result."),
    link: z.string().url({ message: "Invalid URL in search result." })
        .describe("The URL link of the search result."),
    snippet: z.string().describe("A brief snippet or description of the result.")
})

const WebSearchOutputSchema = z.object({
    results: z.array(SearchResultSchema)
        .describe("A list of search result objects.")
})

type WebSearchOutput = z.infer<typeof WebSearchOutputSchema>

// --- Tool Definition --- 

export const webSearchTool: Tool<typeof WebSearchInputSchema, typeof WebSearchOutputSchema> = {
    id: "web-search",
    name: "Web Search",
    description: "Performs a web search using an external API and returns a list of results (title, link, snippet). Requires SEARCH_API_KEY and SEARCH_API_URL configuration.",
    inputSchema: WebSearchInputSchema,
    outputSchema: WebSearchOutputSchema,
    tags: ["web", "search", "external-api"],

    // --- Execution Logic --- 

    execute: (input: WebSearchInput, context: ToolExecutionContext) =>
        Effect.gen(function* (_) {
            const log = yield* _(context.loggingService.getLogger("WebSearchTool"))
            yield* _(log.debug("Executing web search tool", { query: input.query }))

            // Step 1: Get configuration (API Key and URL)
            // We need to get these from the ConfigurationService passed in the context
            const apiKeyOption = yield* _(context.configurationService.get("SEARCH_API_KEY"))
            const apiUrlOption = yield* _(context.configurationService.get("SEARCH_API_URL"))
            // TODO: Define a specific URL structure or base URL if needed

            if (Option.isNone(apiKeyOption)) {
                const error = new ToolExecutionError("Configuration error: SEARCH_API_KEY is not set.", { toolId: webSearchTool.id });
                yield* _(log.error(error.message));
                return yield* _(Effect.fail(error));
            }
            if (Option.isNone(apiUrlOption)) {
                const error = new ToolExecutionError("Configuration error: SEARCH_API_URL is not set.", { toolId: webSearchTool.id });
                yield* _(log.error(error.message));
                return yield* _(Effect.fail(error));
            }

            const apiKey = Option.getOrThrow(apiKeyOption); // Should not throw due to check above
            const apiUrl = Option.getOrThrow(apiUrlOption); // Should not throw due to check above

            // Step 2: Construct the request URL (Example using query params - adjust based on actual API)
            const url = new URL(apiUrl);
            url.searchParams.append("query", input.query);
            url.searchParams.append("key", apiKey);
            // Add other necessary params like country, num_results etc.

            yield* _(log.debug("Sending request to search API", { url: url.toString() }));

            // Step 3: Perform the fetch request
            const response = yield* _(Effect.tryPromise({
                try: () => fetch(url.toString(), {
                    method: "GET", // Or POST depending on API
                    headers: {
                        "Accept": "application/json",
                        // Add other headers like Authorization if needed, potentially using apiKey
                    }
                }),
                catch: (error) => new ToolExecutionError("Network request to search API failed.", {
                    toolId: webSearchTool.id,
                    cause: error instanceof Error ? error : new Error(String(error))
                })
            }));

            if (!response.ok) {
                const errorText = yield* _(Effect.promise(() => response.text())); // Try to get error body
                const error = new ToolExecutionError(
                    `Search API request failed with status ${response.status}: ${response.statusText}. Body: ${errorText}`,
                    { toolId: webSearchTool.id }
                );
                yield* _(log.error("Search API error response", { status: response.status, error }));
                return yield* _(Effect.fail(error));
            }

            // Step 4: Parse the JSON response
            const jsonResponse = yield* _(Effect.tryPromise({
                try: () => response.json(),
                catch: (error) => new ToolExecutionError("Failed to parse JSON response from search API.", {
                    toolId: webSearchTool.id,
                    cause: error instanceof Error ? error : new Error(String(error))
                })
            }));

            yield* _(log.debug("Received response from search API", { response: jsonResponse }));

            // Step 5: Transform the response to match the OutputSchema
            // This depends HEAVILY on the actual API response structure
            // Example transformation (assuming a hypothetical API structure)
            const transformedResults = (jsonResponse.items ?? []).map((item: any) => ({
                title: item.title ?? "No Title",
                link: item.link ?? "",
                snippet: item.snippet ?? "No Snippet"
            }));

            // The final result must match WebSearchOutputSchema
            const finalOutput: WebSearchOutput = { results: transformedResults };

            yield* _(log.info("Web search successful", { query: input.query, resultCount: finalOutput.results.length }));

            return finalOutput;

        }).pipe(Effect.annotateLogs({ toolId: webSearchTool.id }))
}; 