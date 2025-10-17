/**
 * Multi-Tool Example: Calculator + Mock Web Search
 *
 * This example demonstrates tool calling and orchestration with multiple tools.
 * It shows how the model can decide which tools to use and iterate on results.
 *
 * Prerequisites:
 *   - OPENAI_API_KEY environment variable set
 *
 * Usage:
 *   npx tsx tools-multitool.ts
 */

import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { defineTool, runTools } from "../../packages/effect-aisdk/src/index.js";

async function main() {
    console.log("🔧 Multi-Tool Orchestration Example\n");

    if (!process.env.OPENAI_API_KEY) {
        console.error("❌ OPENAI_API_KEY environment variable is not set");
        process.exit(1);
    }

    const model = openai("gpt-4o-mini");    // Define calculator tools
    const addTool = defineTool(
        "add",
        z.object({
            a: z.number().describe("First number"),
            b: z.number().describe("Second number"),
        }),
        async (args: any) => {
            console.log(`  ➕ Computing ${args.a} + ${args.b}`);
            return args.a + args.b;
        }
    );

    const subtractTool = defineTool(
        "subtract",
        z.object({
            a: z.number().describe("First number"),
            b: z.number().describe("Second number"),
        }),
        async (args: any) => {
            console.log(`  ➖ Computing ${args.a} - ${args.b}`);
            return args.a - args.b;
        }
    );

    const multiplyTool = defineTool(
        "multiply",
        z.object({
            a: z.number().describe("First number"),
            b: z.number().describe("Second number"),
        }),
        async (args: any) => {
            console.log(`  ✖️  Computing ${args.a} × ${args.b}`);
            return args.a * args.b;
        }
    );

    // Define a mock web search tool
    const searchTool = defineTool(
        "web_search",
        z.object({
            query: z.string().describe("Search query"),
        }),
        async (args: any) => {
            console.log(`  🔍 Searching for: "${args.query}"`);
            // Mock search results
            const mockResults: Record<string, string[]> = {
                "JavaScript frameworks": [
                    "React",
                    "Vue",
                    "Angular",
                    "Svelte",
                    "Next.js",
                ],
                "Python libraries": ["NumPy", "Pandas", "Django", "FastAPI", "PyTorch"],
                "AI models": ["GPT-4", "Claude 3", "Gemini", "LLaMA", "Mistral"],
            };

            const key = Object.keys(mockResults).find((k) =>
                args.query.toLowerCase().includes(k.toLowerCase())
            );

            if (key) {
                return {
                    query: args.query,
                    results: mockResults[key],
                    count: mockResults[key].length,
                };
            }

            return {
                query: args.query,
                results: ["No results found"],
                count: 0,
            };
        }
    );

    // Define tool descriptions
    addTool.definition.description = "Add two numbers together";
    subtractTool.definition.description = "Subtract one number from another";
    multiplyTool.definition.description = "Multiply two numbers";
    searchTool.definition.description =
        "Search the web for information (mock implementation)";

    const tools = [addTool, subtractTool, multiplyTool, searchTool];

    // Test case 1: Simple calculation
    console.log("Test 1: Simple Calculation");
    console.log("─".repeat(50));
    const messages1 = [
        {
            role: "user" as const,
            content: "What is 42 times 7?",
        },
    ];

    try {
        const result1 = await runTools(model, messages1, tools, {
            maxTurns: 5,
            toolTimeout: 5000,
        });

        console.log(
            `✅ Completed in ${result1.turnCount} turn(s), reason: ${result1.reason}`
        );
        console.log(`   Tool calls made: ${result1.toolCalls.length}`);
        console.log(`   Final result: ${JSON.stringify(result1.finalMessages.pop())}\n`);
    } catch (error: any) {
        console.error(
            `❌ Error: ${error.message || "Unknown error"}`,
            error.stack
        );
    }

    // Test case 2: Multi-step calculation
    console.log("Test 2: Multi-step Calculation");
    console.log("─".repeat(50));
    const messages2 = [
        {
            role: "user" as const,
            content: "Calculate (15 + 20) * 3",
        },
    ];

    try {
        const result2 = await runTools(model, messages2, tools, {
            maxTurns: 5,
            toolTimeout: 5000,
        });

        console.log(
            `✅ Completed in ${result2.turnCount} turn(s), reason: ${result2.reason}`
        );
        console.log(`   Tool calls made: ${result2.toolCalls.length}`);
        if (result2.toolResults.length > 0) {
            const lastResult = result2.toolResults[result2.toolResults.length - 1];
            console.log(`   Result: ${lastResult.result}`);
        }
        console.log();
    } catch (error: any) {
        console.error(
            `❌ Error: ${error.message || "Unknown error"}`,
            error.stack
        );
    }

    // Test case 3: Using web search
    console.log("Test 3: Web Search + Calculation");
    console.log("─".repeat(50));
    const messages3 = [
        {
            role: "user" as const,
            content:
                'Search for JavaScript frameworks and tell me how many you found, then add 10 to that number',
        },
    ];

    try {
        const result3 = await runTools(model, messages3, tools, {
            maxTurns: 5,
            toolTimeout: 5000,
        });

        console.log(
            `✅ Completed in ${result3.turnCount} turn(s), reason: ${result3.reason}`
        );
        console.log(`   Tool calls made: ${result3.toolCalls.length}`);
        console.log();
    } catch (error: any) {
        console.error(
            `❌ Error: ${error.message || "Unknown error"}`,
            error.stack
        );
    }

    console.log("✨ Examples complete!");
}

main().catch(console.error);
