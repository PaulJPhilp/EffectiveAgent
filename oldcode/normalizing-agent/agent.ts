/**
 * Define a data enrichment agent.
 *
 * Works with a chat model with tool calling support.
 */
// Load environment variables from .env file
import dotenv from "dotenv";
dotenv.config();

import {
    HumanMessage,
    ToolMessage,
    type AIMessage,
    type BaseMessage,
} from "@langchain/core/messages";
import type { RunnableConfig } from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { StateGraph } from "@langchain/langgraph";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ConfigurationAnnotation, ensureConfiguration } from "./config.js";
import { MergedProfileSchema, mergeProfiles, type ProfileSource } from "./mergeProfile.js";
import { parseProfileData, ProfileDataParseError } from "./parseProfile.js";
import { DATA_CLEANING_PROMPT } from "./prompts.js";
import { InputStateAnnotation } from "./state.js";
import { MODEL_TOOLS } from "./tools.js";
import type { AnyRecord, ClusteringResult, ProfileData } from "./types.js";
import { DataCleaningModel, MyStateAnnotation } from "./types.js";
import {
    isMessageType,
    loadChatModel,
    loadFiles,
    logParsingError,
    logProfile,
    normalizeProfileName
} from "./utils.js";

async function dataLoadingAgentNode(
    state: typeof MyStateAnnotation.State,
    config: RunnableConfig,
): Promise<typeof MyStateAnnotation.Update> {
    try {

        const configuration = ensureConfiguration(config);

        // Create necessary directories
        try {
            // Ensure logs directory exists
            if (!fs.existsSync('./logs')) {
                fs.mkdirSync('./logs', { recursive: true });
            }
        } catch (dirError) {
            console.error("[INIT] Error creating log directories:", dirError);
        }

        const files = await loadFiles(configuration.fileFolder);

        // If we have PDF files, set the initial currentFile to the first PDF
        let currentFile = undefined;
        if (files.pdf.length > 0) {
            currentFile = files.pdf[0];
            // console.log(`[INIT] Setting initial currentFile to first PDF: ${currentFile.metadata?.source || 'unknown'}`);
        } else if (files.txt.length > 0) {
            currentFile = files.txt[0];
            //console.log(`[INIT] Setting initial currentFile to first TXT: ${currentFile.metadata?.source || 'unknown'}`);
        } else {
            //console.log("[INIT] No files found to process");
        }

        //console.log("[INIT] Initializing state with profiles map");

        const newState = {
            data: files,
            pdfCount: 0,
            txtCount: 0,
            // This increments the step counter.
            // We configure a max step count to avoid infinite research loops
            loopStep: 1,
            // Initialize profiles map
            profiles: new Map(),
            // Set initial currentFile
            currentFile
        };
        console.log("[INIT] State initialized successfully");
        return newState;
    } catch (error) {
        console.error("[INIT] ERROR in dataloadingAgentNode:", error);
        // Re-throw to ensure the error is properly handled upstream
        throw error;
    }
}
function routeAfterLoading(
    state: typeof MyStateAnnotation.State,
    config: RunnableConfig
): string | string[] {
    try {
        const configuration = ensureConfiguration(config);

        // Increment loopStep centrally - this avoids parallel conflicts
        state.loopStep += 1;
        console.log(`[ROUTE] Loop step incremented to: ${state.loopStep}`);

        // Check max loops, missing data, etc.
        if (state.loopStep >= configuration.numSteps) {
            console.log("[ROUTE] Reached max steps, moving to merge phase");
            return "mergeProfilesNode";
        }

        if (!state.data) {
            console.error("[ROUTE] ERROR: state.data is undefined");
            return "mergeProfilesNode";
        }

        // Make sure PDF and TXT arrays exist
        if (!state.data.pdf || !state.data.txt) {
            console.error("[ROUTE] ERROR: state.data.pdf or state.data.txt is undefined");
            return "mergeProfilesNode";
        }

        const allPdfsDone = state.pdfCount >= state.data.pdf.length;
        const allTxtsDone = state.txtCount >= state.data.txt.length;

        if (allPdfsDone && allTxtsDone) {
            console.log("[ROUTE] All files processed, moving to merge phase");
            return "mergeProfilesNode";
        }

        console.log(`[ROUTE] Loop step: ${state.loopStep}, PDF count: ${state.pdfCount}/${state.data.pdf.length}, TXT count: ${state.txtCount}/${state.data.txt.length}`);

        const branches: string[] = [];

        // If there are PDFs to process, add the PDF cleaning branch.
        if (!allPdfsDone) {
            try {
                // Make sure to set currentFile for PDFs appropriately.
                state.currentPdfFile = state.data.pdf[state.pdfCount];
                if (!state.currentPdfFile) {
                    console.error(`[ROUTE] ERROR: PDF file at index ${state.pdfCount} is undefined`);
                    state.pdfCount += 1; // Skip this file
                } else {
                    console.log(`[ROUTE] Adding PDF branch for file: ${state.currentPdfFile.metadata?.source || 'unknown'}`);
                    branches.push("pdfCleaningNode");
                }
            } catch (error) {
                console.error("[ROUTE] ERROR in PDF branch setup:", error);
            }
        }

        // If there are TXTs to process, add the TXT cleaning branch.
        if (!allTxtsDone) {
            try {
                state.currentTxtFile = state.data.txt[state.txtCount];
                if (!state.currentTxtFile) {
                    console.error(`[ROUTE] ERROR: TXT file at index ${state.txtCount} is undefined`);
                    state.txtCount += 1; // Skip this file
                } else {
                    console.log(`[ROUTE] Adding TXT branch for file: ${state.currentTxtFile.metadata?.source || 'unknown'}`);
                    branches.push("txtCleaningNode");
                }
            } catch (error) {
                console.error("[ROUTE] ERROR in TXT branch setup:", error);
            }
        }

        // If no branch was added (which shouldn't happen), fall back to merging.
        if (branches.length === 0) {
            console.log("[ROUTE] No processing branches available, moving to merge phase");
            return "mergeProfilesNode";
        }

        console.log(`[ROUTE] Returning ${branches.length} processing branches: ${branches.join(', ')}`);
        return branches;
    } catch (error) {
        console.error("[ROUTE] Uncaught error in routeAfterLoading:", error);
        // Default to mergeProfilesNode on error
        return "mergeProfilesNode";
    }
}


/**
 * Calls the primary Language Model (LLM) to decide on the next research action.
 *
 * This function performs the following steps:
 * 1. Initializes configuration and sets up the 'Info' tool, which is the user-defined extraction schema.
 * 2. Prepares the prompt and message history for the LLM.
 * 3. Initializes and configures the LLM with available tools.
 * 4. Invokes the LLM and processes its response.
 * 5. Handles the LLM's decision to either continue research or submit final info.
 *
 * @param state - The current state of the research process.
 * @param config - Optional configuration for the runnable.
 * @returns A Promise resolving to an object containing:
 *   - messages: An array of BaseMessage objects representing the LLM's response.
 *   - info: An optional AnyRecord containing the extracted information if the LLM decided to submit final info.
 *   - loopStep: A number indicating the current step in the research loop.
 */

async function pdfCleaningNode(
    state: typeof MyStateAnnotation.State,
    config: RunnableConfig,
): Promise<typeof MyStateAnnotation.Update> {
    const taskId = Math.random().toString(36).substring(7);

    try {
        // Validate initial state
        if (!state.data || !state.data.pdf || state.pdfCount >= state.data.pdf.length) {
            console.log(`[PDF:${taskId}] No more PDF files to process`);
            return {
                messages: [],
                pdfCount: state.pdfCount
            };
        }

        // Get current file
        const currentFile = state.data.pdf[state.pdfCount];
        if (!currentFile) {
            console.error(`[PDF:${taskId}] ERROR: PDF file at index ${state.pdfCount} is null or undefined`);
            return {
                messages: [],
                pdfCount: state.pdfCount + 1
            };
        }

        // Ensure pageContent exists
        if (!currentFile.pageContent) {
            console.error(`[PDF:${taskId}] ERROR: PDF file has no page content`);
            const sourcePath = currentFile.metadata?.source || `PDF-${state.pdfCount}`;
            const fileName = path.basename(sourcePath.toString());
            logParsingError(
                fileName,
                'PDF',
                'No page content available',
                {}
            );
            return {
                messages: [],
                pdfCount: state.pdfCount + 1,
                currentPdfFile: currentFile
            };
        }

        const configuration = ensureConfiguration(config);
        const promptModel = await loadChatModel(DataCleaningModel);

        const prompt = `${DATA_CLEANING_PROMPT} + "\n" +${currentFile.pageContent}`;
        const messages = [{ role: "user", content: prompt }];

        console.log(`[PDF:${taskId}] Calling model`);
        const response: AIMessage = await promptModel.invoke(messages);
        const responseMessages = [response];

        if (typeof response.content !== 'string') {
            const errorMsg = 'Response content is not a string';
            const sourcePath = currentFile.metadata?.source || `PDF-${state.pdfCount}`;
            const fileName = path.basename(sourcePath.toString());
            logParsingError(
                fileName,
                'PDF',
                errorMsg,
                response.content
            );
            throw new ProfileDataParseError(errorMsg, response.content);
        }

        console.log(`[PDF:${taskId}] Successfully received response from model`);
        const pdfProfile = await parseProfileData(response.content);

        // Normalize the profile name
        const originalName = pdfProfile.name;
        const normalizedName = normalizeProfileName(originalName);

        // Update the name in the profile
        if (normalizedName !== originalName) {
            console.log(`[PDF:${taskId}] Normalized name from "${originalName}" to "${normalizedName}"`);
            pdfProfile.name = normalizedName;
        }

        // Check if profiles map exists
        if (!state.profiles) {
            console.error(`[PDF:${taskId}] ERROR: profiles map is undefined`);
            state.profiles = new Map();
        }

        const profile = state.profiles.get(normalizedName);

        if (profile === undefined) {
            state.profiles.set(normalizedName, { pdf: pdfProfile });
            console.log(`[PDF:${taskId}] Created new profile for ${normalizedName}`);
        } else {
            profile.pdf = pdfProfile;
            state.profiles.set(normalizedName, profile);
            console.log(`[PDF:${taskId}] Updated existing profile for ${normalizedName}`);
        }

        console.log(`[PDF:${taskId}] Completed processing PDF file`);
        logProfile(normalizedName, 'PDF', pdfProfile, 'clean');
        return {
            messages: responseMessages,
            pdfCount: state.pdfCount + 1,
            currentPdfFile: currentFile
        };
    } catch (error) {
        console.error(`[PDF:${taskId}] Error processing file:`, error);

        if (error instanceof ProfileDataParseError) {
            console.error(`[PDF:${taskId}] Failed to parse profile data:`, error.message);

            try {
                // Get the current file with error handling
                const currentFile = state.pdfCount < state.data.pdf.length ?
                    state.data.pdf[state.pdfCount] : null;

                // Safely get file path
                const sourcePath = currentFile?.metadata?.source || `PDF-${state.pdfCount}`;
                const profileName = path.basename(sourcePath.toString());

                logParsingError(
                    profileName,
                    'PDF',
                    error.message,
                    error.data
                );
            } catch (logError) {
                console.error(`[PDF:${taskId}] Error logging parsing error:`, logError);
            }
        }

        console.log(`[PDF:${taskId}] Completed with error`);
        return {
            messages: [],
            pdfCount: state.pdfCount + 1
        };
    }
}

async function txtCleaningNode(
    state: typeof MyStateAnnotation.State,
    config: RunnableConfig,
): Promise<typeof MyStateAnnotation.Update> {
    const taskId = Math.random().toString(36).substring(7);

    try {
        // Validate initial state
        if (!state.data || !state.data.txt || state.txtCount >= state.data.txt.length) {
            console.log(`[TXT:${taskId}] No more TXT files to process`);
            return {
                messages: [],
                txtCount: state.txtCount
            };
        }

        // Get current file
        const currentFile = state.data.txt[state.txtCount];
        if (!currentFile) {
            console.error(`[TXT:${taskId}] ERROR: TXT file at index ${state.txtCount} is null or undefined`);
            return {
                messages: [],
                txtCount: state.txtCount + 1
            };
        }

        // Ensure pageContent exists
        if (!currentFile.pageContent) {
            console.error(`[TXT:${taskId}] ERROR: TXT file has no page content`);
            const sourcePath = currentFile.metadata?.source || `TXT-${state.txtCount}`;
            const fileName = path.basename(sourcePath.toString());
            logParsingError(
                fileName,
                'TXT',
                'No page content available',
                {}
            );
            return {
                messages: [],
                txtCount: state.txtCount + 1,
                currentTxtFile: currentFile
            };
        }

        const configuration = ensureConfiguration(config);
        const promptModel = await loadChatModel(DataCleaningModel);

        const prompt = `${DATA_CLEANING_PROMPT} + "\n" +${currentFile.pageContent}`;
        const messages = [{ role: "user", content: prompt }];

        console.log(`[TXT:${taskId}] Calling model`);
        const response: AIMessage = await promptModel.invoke(messages);
        const responseMessages = [response];

        if (typeof response.content !== 'string') {
            const errorMsg = 'Response content is not a string';
            const sourcePath = currentFile.metadata?.source || `TXT-${state.txtCount}`;
            const fileName = path.basename(sourcePath.toString());
            logParsingError(
                fileName,
                'TXT',
                errorMsg,
                response.content
            );
            throw new ProfileDataParseError(errorMsg, response.content);
        }

        console.log(`[TXT:${taskId}] Successfully received response from model`);
        const txtProfile = await parseProfileData(response.content);

        // Normalize the profile name
        const originalName = txtProfile.name;
        const normalizedName = normalizeProfileName(originalName);

        // Update the name in the profile
        if (normalizedName !== originalName) {
            console.log(`[TXT:${taskId}] Normalized name from "${originalName}" to "${normalizedName}"`);
            txtProfile.name = normalizedName;
        }

        // Check if profiles map exists
        if (!state.profiles) {
            console.error(`[TXT:${taskId}] ERROR: profiles map is undefined`);
            state.profiles = new Map();
        }

        const profile = state.profiles.get(normalizedName);

        if (profile === undefined) {
            state.profiles.set(normalizedName, { txt: txtProfile });
            console.log(`[TXT:${taskId}] Created new profile for ${normalizedName}`);
        } else {
            profile.txt = txtProfile;
            state.profiles.set(normalizedName, profile);
            console.log(`[TXT:${taskId}] Updated existing profile for ${normalizedName}`);
        }

        console.log(`[TXT:${taskId}] Completed processing TXT file`);
        logProfile(normalizedName, 'TXT', txtProfile, 'clean')
        return {
            messages: responseMessages,
            txtCount: state.txtCount + 1,
            currentTxtFile: currentFile
        };
    } catch (error) {
        console.error(`[TXT:${taskId}] Error processing file:`, error);

        if (error instanceof ProfileDataParseError) {
            console.error(`[TXT:${taskId}] Failed to parse profile data:`, error.message);

            try {
                // Get the current file with error handling
                const currentFile = state.txtCount < state.data.txt.length ?
                    state.data.txt[state.txtCount] : null;

                // Safely get file path
                const sourcePath = currentFile?.metadata?.source || `TXT-${state.txtCount}`;
                const profileName = path.basename(sourcePath.toString());

                logParsingError(
                    profileName,
                    'TXT',
                    error.message,
                    error.data
                );
            } catch (logError) {
                console.error(`[TXT:${taskId}] Error logging parsing error:`, logError);
            }
        }

        console.log(`[TXT:${taskId}] Completed with error`);
        return {
            messages: [],
            txtCount: state.txtCount + 1
        };
    }
}

/**
 * A debug node that logs the number of profiles in the Profiles map.
 * This node is called right after the loop is finished.
 *
 * @param state - The current state of the research process.
 * @param config - Optional configuration for the runnable.
 * @returns The unchanged state.
 */
async function mergeProfilesNode(
    state: typeof MyStateAnnotation.State,
    config: RunnableConfig,
): Promise<typeof MyStateAnnotation.Update> {
    try {
        console.log("[MERGE] Starting mergeProfilesNode");

        // Validate state
        if (!state) {
            console.error("[MERGE] ERROR: State is undefined");
            return {};
        }

        // Check if profiles exists
        if (!state.profiles) {
            console.error("[MERGE] ERROR: Profiles map is undefined, initializing empty map");
            state.profiles = new Map();
        }

        console.log(`[MERGE] Number of profiles in the Profiles map: ${state.profiles.size}`);

        // Log each profile name for debugging
        console.log("[MERGE] Profile names:");
        try {
            for (const [name, profile] of state.profiles.entries()) {
                if (!profile) {
                    console.error(`[MERGE] ERROR: Profile for ${name} is undefined`);
                    continue;
                }
                console.log(
                    `- ${name} (PDF: ${profile.pdf ? "yes" : "no"}, TXT: ${profile.txt ? "yes" : "no"})`,
                );
            }
        } catch (profileError) {
            console.error("[MERGE] ERROR iterating profiles:", profileError);
        }

        // Process and merge profiles that have both PDF and TXT sources
        console.log("[MERGE] Starting to merge profiles with multiple sources");

        // Create merged directory if it doesn't exist
        const mergedDir = path.join(process.cwd(), "data", "merged");
        try {
            fs.mkdirSync(mergedDir, { recursive: true });
            console.log(`[MERGE] Created or verified merged directory at: ${mergedDir}`);
        } catch (mkdirError) {
            console.error(`[MERGE] ERROR creating merged directory: ${mkdirError}`);
        }

        // Track merge statistics
        let mergeSuccessCount = 0;
        let mergeErrorCount = 0;
        let singleSourceCount = 0;

        // Process each profile
        for (const [name, profileData] of state.profiles.entries()) {
            try {
                if (!profileData) {
                    console.error(`[MERGE] ERROR: ProfileData for ${name} is undefined`);
                    continue;
                }

                const sources: ProfileSource = {
                    pdf: profileData.pdf || undefined,
                    txt: profileData.txt || undefined
                };

                // Check if we have multiple sources to merge
                const hasPdf = !!sources.pdf;
                const hasTxt = !!sources.txt;

                if (hasPdf && hasTxt) {
                    // We have both sources, merge them
                    console.log(`[MERGE] Merging profiles for ${name} (has both PDF and TXT sources)`);
                    try {
                        const mergedProfile = await mergeProfiles(sources);

                        // Save merged profile to disk
                        const sanitizedName = name.replace(/[\/\\:*?"<>|]/g, '_');
                        const outputPath = path.join(mergedDir, `${sanitizedName}.json`);

                        fs.writeFileSync(
                            outputPath,
                            JSON.stringify(mergedProfile, null, 2)
                        );

                        console.log(`[MERGE] ✅ Successfully merged and saved profile for ${name} to ${outputPath}`);
                        mergeSuccessCount++;
                    } catch (mergeError) {
                        console.error(`[MERGE] ❌ Error merging profile for ${name}:`, mergeError);
                        mergeErrorCount++;
                    }
                } else if (hasPdf || hasTxt) {
                    // We only have one source, use it directly
                    const singleSource = hasPdf ? sources.pdf : sources.txt;
                    if (singleSource) {
                        console.log(`[MERGE] Using single source (${hasPdf ? 'PDF' : 'TXT'}) for ${name}`);

                        // Save the single source profile
                        const sanitizedName = name.replace(/[\/\\:*?"<>|]/g, '_');
                        const outputPath = path.join(mergedDir, `${sanitizedName}.json`);

                        fs.writeFileSync(
                            outputPath,
                            JSON.stringify(singleSource, null, 2)
                        );

                        console.log(`[MERGE] ✅ Saved single-source profile for ${name} to ${outputPath}`);
                        singleSourceCount++;
                    } else {
                        console.error(`[MERGE] ⚠️ Source data is undefined for ${name}`);
                    }
                } else {
                    console.error(`[MERGE] ⚠️ No valid sources for profile ${name}`);
                }
            } catch (profileError) {
                console.error(`[MERGE] Unhandled error processing profile ${name}:`, profileError);
                mergeErrorCount++;
            }
        }

        // Log merge summary
        console.log("\n[MERGE] Profile merging summary:");
        console.log(`- Successfully merged: ${mergeSuccessCount}`);
        console.log(`- Single source profiles: ${singleSourceCount}`);
        console.log(`- Merge errors: ${mergeErrorCount}`);
        console.log(`- Total profiles processed: ${mergeSuccessCount + singleSourceCount + mergeErrorCount}`);

        // Check for parsing errors and summarize them
        const errorLogPath = "./logs/parsing_errors.log";
        try {
            if (fs.existsSync(errorLogPath)) {
                try {
                    const logContent = fs.readFileSync(errorLogPath, "utf8");
                    const errorCount = (logContent.match(/ERROR ENTRY/g) || []).length;

                    if (errorCount > 0) {
                        console.log(
                            `\n[MERGE] ⚠️ WARNING: ${errorCount} parsing errors occurred during processing.`,
                        );
                        console.log(
                            `[MERGE] Review the detailed log at: ${path.resolve(errorLogPath)}`,
                        );

                        // Find the profile names with errors
                        const profileRegex = /Profile: (.*?)$/gm;
                        const matches = [...logContent.matchAll(profileRegex)];
                        const errorProfiles = matches.map((match) => match[1]);

                        console.log("\n[MERGE] Profiles with parsing errors:");
                        const uniqueErrorProfiles = [...new Set(errorProfiles)];
                        for (const profile of uniqueErrorProfiles) {
                            console.log(`- ${profile}`);
                        }
                    } else {
                        console.log("\n[MERGE] ✅ No parsing errors detected.");
                    }
                } catch (err) {
                    console.error("[MERGE] Failed to read parsing error log:", err);
                }
            } else {
                console.log("\n[MERGE] ✅ No parsing errors detected. No error log file exists.");
            }
        } catch (fileError) {
            console.error("[MERGE] Error checking error log file:", fileError);
        }

        // Return empty object (no state changes needed)
        return {};
    } catch (error) {
        console.error("[MERGE] Uncaught error in mergeProfilesNode:", error);
        // Return empty object even on error
        return {};
    }
}

/**
 * Routes after the mergeProfilesNode to the end of the graph.
 *
 * @param state - The current state of the research process.
 * @returns Always returns "__end__" to finish the graph execution.
 */
function routeAfterMerge(state: typeof MyStateAnnotation.State): "__end__" {
    console.log("routeAfterMerge: ending graph execution");
    return "__end__";
}

/**
 * Calls the primary Language Model (LLM) to decide on the next research action.
 *
 * This function performs the following steps:
 * 1. Initializes configuration and sets up the 'Info' tool, which is the user-defined extraction schema.
 * 2. Prepares the prompt and message history for the LLM.
 * 3. Initializes and configures the LLM with available tools.
 * 4. Invokes the LLM and processes its response.
 * 5. Handles the LLM's decision to either continue research or submit final info.
 *
 * @param state - The current state of the research process.
 * @param config - Optional configuration for the runnable.
 * @returns A Promise resolving to an object containing:
 *   - messages: An array of BaseMessage objects representing the LLM's response.
 *   - info: An optional AnyRecord containing the extracted information if the LLM decided to submit final info.
 *   - loopStep: A number indicating the current step in the research loop.
 */

async function callAgentModel(
    state: typeof MyStateAnnotation.State,
    config: RunnableConfig,
): Promise<typeof MyStateAnnotation.Update> {
    const configuration = ensureConfiguration(config);
    // First, define the info tool. This uses the user-provided
    // json schema to define the research targets
    // We pass an empty function because we will not actually invoke this tool.
    // We are just using it for formatting.
    const infoTool = tool(async () => { }, {
        name: "Info",
        description: "Call this when you have gathered all the relevant info",
        schema: state.extractionSchema,
    });

    // Next, load the model
    const rawModel = await loadChatModel(configuration.model);
    if (!rawModel.bindTools) {
        throw new Error("Chat model does not support tool binding");
    }
    const model = rawModel.bindTools([...MODEL_TOOLS, infoTool], {
        tool_choice: "any",
    });

    // Format the schema into the configurable system prompt
    const p = configuration.prompt.replace(
        "{info}",
        JSON.stringify(state.extractionSchema, null, 2),
    );

    const messages = [{ role: "user", content: p }, ...state.messages];

    // Next, we'll call the model.
    const response: AIMessage = await model.invoke(messages);
    const responseMessages = [response];

    // If the model has collected enough information to fill uot
    // the provided schema, great! It will call the "Info" tool
    // We've decided to track this as a separate state variable
    let data: Record<string, unknown> | undefined;
    if (response?.tool_calls?.length) {
        for (const tool_call of response.tool_calls) {
            if (tool_call.name === "Info") {
                data = tool_call.args;
                // If info was called, the agent is submitting a response.
                // (it's not actually a function to call, it's a schema to extract)
                // To ensure that the graph doesn'tend up in an invalid state
                // (where the AI has called tools but no tool message has been provided)
                // we will drop any extra tool_calls.
                response.tool_calls = response.tool_calls?.filter(
                    (tool_call) => tool_call.name === "Info",
                );
                break;
            }
        }
    } else {
        // If LLM didn't respect the tool_choice
        responseMessages.push(
            new HumanMessage("Please respond by calling one of the provided tools."),
        );
    }

    return {
        messages: responseMessages,

        // This increments the step counter.
        // We configure a max step count to avoid infinite research loops
        loopStep: 1,
    };
}

/**
 * Validate whether the current extracted info is satisfactory and complete.
 */
const InfoIsSatisfactory = z.object({
    reason: z
        .array(z.string())
        .describe(
            "First, provide reasoning for why this is either good or bad as a final result. Must include at least 3 reasons.",
        ),
    is_satisfactory: z
        .boolean()
        .describe(
            "After providing your reasoning, provide a value indicating whether the result is satisfactory. If not, you will continue researching.",
        ),
    improvement_instructions: z
        .string()
        .optional()
        .describe(
            "If the result is not satisfactory, provide clear and specific instructions on what needs to be improved or added to make the information satisfactory. This should include details on missing information, areas that need more depth, or specific aspects to focus on in further research.",
        ),
});

/**
 * Validates the quality of the data enrichment agent's output.
 *
 * This function performs the following steps:
 * 1. Prepares the initial prompt using the main prompt template.
 * 2. Constructs a message history for the model.
 * 3. Prepares a checker prompt to evaluate the presumed info.
 * 4. Initializes and configures a language model with structured output.
 * 5. Invokes the model to assess the quality of the gathered information.
 * 6. Processes the model's response and determines if the info is satisfactory.
 *
 * @param state - The current state of the research process.
 * @param config - Optional configuration for the runnable.
 * @returns A Promise resolving to an object containing either:
 *   - messages: An array of BaseMessage objects if the info is not satisfactory.
 *   - info: An AnyRecord containing the extracted information if it is satisfactory.
 */
async function reflect(
    state: typeof MyStateAnnotation.State,
    config: RunnableConfig,
): Promise<{ messages: BaseMessage[] } | { info: AnyRecord }> {
    const configuration = ensureConfiguration(config);
    const presumedInfo = state.data; // The current extracted result
    const lm = state.messages[state.messages.length - 1];
    if (!isMessageType(lm, "ai")) {
        throw new Error(
            `${reflect.name} expects the last message in the state to be an AI message with tool calls. Got: ${isMessageType(lm, "ai") ? "ai" : "unknown"}`,
        );
    }
    const lastMessage = lm as AIMessage;

    // Load the configured model & provide the reflection/critique schema
    const rawModel = await loadChatModel(configuration.model);
    const boundModel = rawModel.withStructuredOutput(InfoIsSatisfactory);
    // Template in the conversation history:
    const p = configuration.prompt.replace(
        "{info}",
        JSON.stringify(state.extractionSchema, null, 2),
    );
    const messages = [
        { role: "user", content: p },
        ...state.messages.slice(0, -1),
    ];

    const checker_prompt = `I am thinking of calling the info tool with the info below. \
Is this good? Give your reasoning as well. \
You can encourage the Assistant to look at specific URLs if that seems relevant, or do more searches.
If you don't think it is good, you should be very specific about what could be improved.

{presumed_info}`;
    const p1 = checker_prompt.replace(
        "{presumed_info}",
        JSON.stringify(presumedInfo ?? {}, null, 2),
    );
    messages.push({ role: "user", content: p1 });

    // Call the model
    const response = await boundModel.invoke(messages);
    if (response.is_satisfactory && presumedInfo) {
        return {
            info: presumedInfo,
            messages: [
                new ToolMessage({
                    tool_call_id: lastMessage.tool_calls?.[0]?.id || "",
                    content: response.reason.join("\n"),
                    name: "Info",
                    artifact: response,
                    status: "success",
                }),
            ],
        };
    }
    return {
        messages: [
            new ToolMessage({
                tool_call_id: lastMessage.tool_calls?.[0]?.id || "",
                content: `Unsatisfactory response:\n${response.improvement_instructions}`,
                name: "Info",
                artifact: response,
                status: "error",
            }),
        ],
    };
}

/**
 * Determines the next step in the research process based on the agent's last action.
 *
 * @param state - The current state of the research process.
 * @returns "reflect" if the agent has called the "Info" tool to submit findings,
 *          "tools" if the agent has called any other tool or no tool at all.
 */
function routeAfterAgent(
    state: typeof MyStateAnnotation.State,
): "callAgentModel" | "reflect" | "tools" | "__end__" {
    const lastMessage = state.messages[state.messages.length - 1];

    // If for some reason the last message is not an AIMessage
    // (if you've modified this template and broken one of the assumptions)
    // ensure the system doesn't crash but instead tries to recover by calling the agent model again.
    if (!isMessageType(lastMessage, "ai")) {
        return "callAgentModel";
    }

    const aiMessage = lastMessage as AIMessage;
    // If the "Info" tool was called, then the model provided its extraction output. Reflect on the result
    if (aiMessage.tool_calls && aiMessage.tool_calls[0]?.name === "Info") {
        return "reflect";
    }

    // The last message is a tool call that is not "Info" (extraction output)
    return "tools";
}

/**
 * Schedules the next node after the checker's evaluation.
 *
 * @param state - The current state of the research process.
 * @param config - The configuration for the research process.
 * @returns "__end__" if the research should end, "callAgentModel" if it should continue.
 */
function routeAfterChecker(
    state: typeof MyStateAnnotation.State,
    config?: RunnableConfig,
): "__end__" | "callAgentModel" {
    console.log("routeAfterChecker");
    const configuration = ensureConfiguration(config);
    const lastMessage = state.messages[state.messages.length - 1];

    if (state.loopStep < configuration.maxLoops) {
        if (!state.data) {
            return "callAgentModel";
        }
        if (!isMessageType(lastMessage, "tool")) {
            throw new Error(
                `routeAfterChecker expected a tool message. Received: ${isMessageType(lastMessage, "tool") ? "tool" : "unknown"}.`
            );
        }
        return (lastMessage as ToolMessage).status === "error" ? "callAgentModel" : "__end__";
    }
    return "__end__";
}

async function normalizeProfilesNode(
    state: typeof MyStateAnnotation.State,
    config: RunnableConfig,
): Promise<typeof MyStateAnnotation.Update> {
    try {
        console.log("[NORMALIZE] Starting profile normalization of merged profiles");

        // Validate state
        if (!state.profiles) {
            console.error("[NORMALIZE] ERROR: Profiles map is undefined");
            return {};
        }

        console.log(`[NORMALIZE] Processing ${state.profiles.size} merged profiles`);
        let normalizedCount = 0;

        // Process each profile
        for (const [name, profileData] of state.profiles.entries()) {
            try {
                if (!profileData) {
                    console.error(`[NORMALIZE] ERROR: ProfileData for ${name} is undefined`);
                    continue;
                }

                // Get the merged profile data
                const mergedProfile = profileData.pdf || profileData.txt;
                if (!mergedProfile) {
                    console.error(`[NORMALIZE] ERROR: No valid profile data for ${name}`);
                    continue;
                }

                console.log(`[NORMALIZE] Normalizing profile for ${name}`);

                try {
                    // Call the AI model to normalize the profile
                    const promptModel = await loadChatModel(DataCleaningModel);
                    const prompt = `
                    Normalize this profile data following these rules:
                    1. Standardize company names (remove Inc., LLC, etc. and use consistent capitalization)
                    2. Normalize job titles to standard industry terms
                    3. Ensure consistent date formats (YYYY-MM-DD)
                    4. Standardize location formats (City, State/Province, Country)
                    5. Deduplicate and standardize skills
                    6. Ensure consistent capitalization and formatting
                    7. Remove any redundant or duplicate information
                    8. Normalize education and certification names
                    9. Standardize URLs (ensure they start with https://)
                    10. Clean up any special characters or formatting issues

                    Profile to normalize:
                    ${JSON.stringify(mergedProfile, null, 2)}

                    Return ONLY the normalized profile as a valid JSON object with the same structure.
                    Do not include any explanations or additional text.`;

                    const messages = [{ role: "user", content: prompt }];
                    const response: AIMessage = await promptModel.invoke(messages);

                    // Extract and parse the normalized profile
                    let jsonStr = response.content.toString();
                    jsonStr = jsonStr.replace(/```json\n?|\n?```/g, '');
                    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        jsonStr = jsonMatch[0];
                    }

                    const normalizedProfile = await MergedProfileSchema.parseAsync(JSON.parse(jsonStr));

                    // Update the profile in the state
                    state.profiles.set(name, {
                        pdf: normalizedProfile,
                        txt: profileData.txt
                    });

                    // Log the normalized profile
                    logProfile(name, 'MERGED', normalizedProfile, 'normalized');
                    normalizedCount++;
                    console.log(`[NORMALIZE] ✅ Successfully normalized profile for ${name}`);
                } catch (normalizationError) {
                    console.error(`[NORMALIZE] Error normalizing profile for ${name}:`, normalizationError);
                }
            } catch (profileError) {
                console.error(`[NORMALIZE] Error processing profile ${name}:`, profileError);
            }
        }

        console.log(`[NORMALIZE] Successfully normalized ${normalizedCount} profiles`);
        return {};
    } catch (error) {
        console.error("[NORMALIZE] Uncaught error in normalizeProfilesNode:", error);
        return {};
    }
}

/**
 * Node that performs persona clustering on normalized profiles
 */
async function personaClusteringNode(
    state: typeof MyStateAnnotation.State,
    config: RunnableConfig,
): Promise<typeof MyStateAnnotation.Update> {
    const taskId = Math.random().toString(36).substring(7)

    try {
        console.log("[PERSONA] Starting persona clustering analysis...")

        // Load all normalized profiles
        const normalizedDir = path.join(process.cwd(), 'data', 'normalized')
        const profiles: ProfileData[] = []

        const nameDirs = fs.readdirSync(normalizedDir)
        for (const nameDir of nameDirs) {
            const namePath = path.join(normalizedDir, nameDir)

            if (!fs.statSync(namePath).isDirectory()) {
                continue
            }

            const jsonFile = path.join(namePath, `${nameDir}.merged.json`)
            if (fs.existsSync(jsonFile)) {
                try {
                    const content = fs.readFileSync(jsonFile, 'utf-8')
                    const profile = JSON.parse(content) as ProfileData
                    profile.sourceFile = jsonFile
                    profiles.push(profile)
                } catch (error) {
                    if (error instanceof Error) {
                        console.error(`[PERSONA:${taskId}] Error reading profile from ${jsonFile}:`, error.message)
                    } else {
                        console.error(`[PERSONA:${taskId}] Unknown error reading profile from ${jsonFile}`)
                    }
                }
            }
        }

        if (profiles.length === 0) {
            throw new Error('[PERSONA] No valid profiles found in the normalized directory')
        }

        console.log(`[PERSONA:${taskId}] Loaded ${profiles.length} normalized profiles`)

        // Get the model for clustering
        const promptModel = await loadChatModel(DataCleaningModel)

        const prompt = `You are a professional data analyst specializing in identifying meaningful patterns and clusters in professional profile data.

Analyze these ${profiles.length} professional profiles and identify meaningful persona clusters.

Focus on finding patterns in:
- Skills and expertise
- Professional background
- Career trajectory
- Industry focus
- Typical responsibilities

For each cluster you identify:
1. Name: Give it a clear, descriptive name that captures the essence of the persona
2. Description: Write a concise but detailed description of this persona type
3. Key Characteristics: List 4-7 defining characteristics shared by profiles in this cluster
4. Common Skills: List 5-10 skills frequently found in this cluster
5. Background: Describe the typical educational and professional background
6. Percentage: Estimate what percentage of the total profiles fit this persona
7. Examples: List 2-3 representative profile names from the data

Guidelines for clustering:
- Identify 3-7 distinct, meaningful clusters
- Ensure each cluster represents a clear and coherent professional persona
- Base clusters on strong patterns in the data
- Avoid overlapping or redundant clusters
- Each cluster should contain at least 10% of profiles
- Total percentages should sum to approximately 100%

Here are the profiles to analyze:
${JSON.stringify(profiles, null, 2)}

Return ONLY a valid JSON object with this exact structure:
{
    "clusters": [
        {
            "name": "string",
            "description": "string",
            "commonCharacteristics": ["string"],
            "skills": ["string"],
            "typicalBackground": "string",
            "percentageOfTotal": number,
            "representativeProfiles": ["string"]
        }
    ],
    "analysis": "string - overall analysis of the clustering results",
    "totalProfiles": number,
    "date": "${new Date().toISOString().split('T')[0]}"
}`

        console.log('[PERSONA] Calling LLM for cluster analysis...')
        const response = await promptModel.invoke([{ role: 'user', content: prompt }])

        // Extract and parse the JSON response
        let jsonStr = response.content.toString()
        jsonStr = jsonStr.replace(/```json\n?|\n?```/g, '')
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            throw new Error('[PERSONA] Could not extract JSON from LLM response')
        }

        // Parse and validate the response
        const result = JSON.parse(jsonMatch[0]) as ClusteringResult

        // Validate cluster percentages
        const totalPercentage = result.clusters.reduce((sum: number, cluster: { percentageOfTotal: number }) => sum + cluster.percentageOfTotal, 0)
        if (Math.abs(totalPercentage - 100) > 5) {
            console.warn(`[CLUSTER] Warning: Cluster percentages sum to ${totalPercentage}%, expected close to 100%`)
        }

        // Save the clustering results
        const outputDir = path.join(process.cwd(), 'data', 'clusters')
        fs.mkdirSync(outputDir, { recursive: true })

        const outputPath = path.join(outputDir, `clusters_${new Date().toISOString().split('T')[0]}.json`)
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2))

        console.log(`[PERSONA] Successfully identified ${result.clusters.length} persona clusters`)
        console.log(`[PERSONA] Results saved to ${outputPath}`)

        return {
            personaClusters: result
        }
    } catch (error) {
        if (error instanceof Error) {
            console.error(`[PERSONA:${taskId}] Error in persona clustering:`, error.message)
        } else {
            console.error(`[PERSONA:${taskId}] Unknown error in persona clustering`)
        }
        throw error
    }
}

// Create the graph
const workflow = new StateGraph(
    {
        stateSchema: MyStateAnnotation,
        input: InputStateAnnotation,
    },
    ConfigurationAnnotation,
)
    .addNode("dataLoadingAgentNode", dataLoadingAgentNode)
    .addNode("pdfCleaningNode", pdfCleaningNode)
    .addNode("txtCleaningNode", txtCleaningNode)
    .addNode("mergeProfilesNode", mergeProfilesNode)
    .addNode("normalizeProfilesNode", normalizeProfilesNode)
    .addNode("personaClusteringNode", personaClusteringNode)
    .addEdge("__start__", "dataLoadingAgentNode")

    // Create fan-out branches from dataLoadingAgentNode for parallel execution
    .addConditionalEdges("dataLoadingAgentNode", routeAfterLoading, [
        "pdfCleaningNode", // Branch 1
        "txtCleaningNode", // Branch 2
        "mergeProfilesNode", // This is the rendezvous point after processing
        "__end__",
    ])

    // Fan-in from pdfCleaningNode back to routeAfterLoading
    .addConditionalEdges("pdfCleaningNode", routeAfterLoading, [
        "pdfCleaningNode", // Continue processing PDFs in parallel
        "txtCleaningNode", // Switch to processing TXT files
        "mergeProfilesNode", // Move to merge when done
        "__end__",
    ])

    // Fan-in from txtCleaningNode back to routeAfterLoading
    .addConditionalEdges("txtCleaningNode", routeAfterLoading, [
        "pdfCleaningNode", // Switch to processing PDF files
        "txtCleaningNode", // Continue processing TXT files in parallel
        "mergeProfilesNode", // Move to merge when done
        "__end__",
    ])

    // Add edge from merge to normalization
    .addEdge("mergeProfilesNode", "normalizeProfilesNode")

    // Add edge from normalization to persona clustering
    .addEdge("normalizeProfilesNode", "personaClusteringNode")

    // Final edge from persona clustering to end
    .addEdge("personaClusteringNode", "__end__");

// Compile the graph - LangGraph.js handles parallel execution
// through the graph structure, not compile options
const graph = workflow.compile();

graph.name = "ProfileCleaner";

const recursionLimit = process.env.RECURSION_LIMIT ? Number.parseInt(process.env.RECURSION_LIMIT, 10) : 100;
console.log(`recursionlimit = ${recursionLimit}`);

// Export the graph
export { graph };

graph.invoke(
    {
        extractionSchema: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "name of the person",
                },
                linkedin: {
                    type: "string",
                    description: "linkedin profile URL of the person",
                },
                twitter: {
                    type: "string",
                    description: "twitter handle of the person",
                },
                summary: {
                    type: "string",
                    description: "summary of the person",
                },
                skills: {
                    type: "array",
                    items: {
                        type: "string",
                    },
                    description: "skills of the person",
                },
            },
            required: ["name", "summary"],
        },
    },
    {
        configurable: {
            model: process.env.MODEL || "gpt-4o",
            prompt: "Clean data from PDFs and TXTs. Return profiles with useful information.",
            thread_id: "pdf-loader",
            maxSearchResults: process.env.MAX_SEARCH_RESULTS
                ? Number.parseInt(process.env.MAX_SEARCH_RESULTS, 10)
                : 3,
            maxInfoToolCalls: process.env.MAX_INFO_TOOL_CALLS
                ? Number.parseInt(process.env.MAX_INFO_TOOL_CALLS, 10)
                : 1,
            maxLoops: process.env.MAX_LOOPS
                ? Number.parseInt(process.env.MAX_LOOPS, 10)
                : 10,
            fileFolder: process.env.FILE_FOLDER || "data/PersonaDocuments",
            recursionLimit: process.env.RECURSION_LIMIT
                ? Number.parseInt(process.env.RECURSION_LIMIT, 10)
                : 150,
            numSteps: process.env.NUM_STEPS
                ? Number.parseInt(process.env.NUM_STEPS)
                : 150,
            maxTasks: process.env.MAX_TASKS
                ? Number.parseInt(process.env.MAX_TASKS)
                : 2,
        },
        recursionLimit: process.env.RECURSION_LIMIT
            ? Number.parseInt(process.env.RECURSION_LIMIT, 10)
            : 150,
        maxConcurrency: process.env.MAX_TASKS
            ? Number.parseInt(process.env.MAX_TASKS)
            : 2,
    },
);
