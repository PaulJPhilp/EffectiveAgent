/**
 * @file Service implementation for the ScientistChatPipeline
 * @module ea/pipelines/scientist-chat/service
 */

import { Effect } from "effect";
import {
  ScientistChatPipeline,
  type ScientistChatPipelineApi,
  type ScientistChatPipelineInput,
  type ScientistChatResponse,
} from "./contract.js";
import { ScientistChatPipelineError } from "./errors.js";
import { type CitationData, type ResearchData } from "./types.js";

/**
 * Service for research data
 */
export interface ResearchToolApi {
  readonly _tag: "ResearchTool";
  readonly search: (query: string) => Effect.Effect<ResearchData[], never>;
}

/**
 * Implementation of the ResearchTool service using Effect.Service pattern
 */
export class ResearchTool extends Effect.Service<ResearchToolApi>()(
  "ResearchTool",
  {
    effect: Effect.succeed({
      _tag: "ResearchTool" as const,
      search: (query: string): Effect.Effect<ResearchData[], never> => {
        // Mock implementation - replace with real research API call
        return Effect.succeed([
          {
            title: `Research on ${query}`,
            abstract: `Mock research data for ${query}`,
            source: "Mock Database",
            year: new Date().getFullYear(),
          },
        ]);
      },
    }),
    dependencies: [],
  }
) {}

/**
 * Service for citation formatting
 */
export interface CitationToolApi {
  readonly _tag: "CitationTool";
  readonly formatCitation: (
    data: ResearchData
  ) => Effect.Effect<CitationData, never>;
}

/**
 * Implementation of the CitationTool service using Effect.Service pattern
 */
export class CitationTool extends Effect.Service<CitationToolApi>()(
  "CitationTool",
  {
    effect: Effect.succeed({
      _tag: "CitationTool" as const,
      formatCitation: (
        data: ResearchData
      ): Effect.Effect<CitationData, never> => {
        // Mock implementation - replace with real citation formatting
        return Effect.succeed({
          citation: `${data.title} (${data.year}). ${data.source}.`,
          style: "APA",
        });
      },
    }),
    dependencies: [],
  }
) {}

// Implementation of chat functionality for reuse
const implementChat = (
  input: ScientistChatPipelineInput
): Effect.Effect<ScientistChatResponse, ScientistChatPipelineError> =>
  Effect.gen(function* () {
    yield* Effect.logInfo(
      `Generating scientific response for domain: ${input.domain || "general"}`
    );

    return yield* Effect.try({
      try: () => {
        // TODO: Replace with actual Phoenix MCP server call
        // For now, using mock responses
        const domain = input.domain || "general";

        // Get domain-specific information and citations
        const { info, citations } = getDomainInfo(domain, input.message);

        // Adjust complexity based on academic level
        const responseMessage = adjustComplexity(
          info,
          input.academicLevel || "undergraduate"
        );

        // Generate notes based on domain
        const notes = [
          `This explanation is based on current scientific understanding in the field of ${domain}.`,
          "Scientific understanding evolves as new research emerges.",
        ];

        // Create the response
        return {
          message: responseMessage,
          citations: input.includeCitations ? citations : undefined,
          notes,
        };
      },
      catch: (error) =>
        new ScientistChatPipelineError({
          message: `Failed to generate scientific response: ${
            error instanceof Error ? error.message : String(error)
          }`,
          cause: error,
        }),
    });
  });

/**
 * Implementation of the ScientistChatPipeline service
 */
export class ScientistChatPipelineService extends Effect.Service<ScientistChatPipelineApi>()(
  "ScientistChatPipeline",
  {
    effect: Effect.succeed({
      // Method implementations
      chat: implementChat,

      explainConcept: (
        conceptQuery: string,
        options?: Omit<ScientistChatPipelineInput, "message">
      ): Effect.Effect<ScientistChatResponse, ScientistChatPipelineError> =>
        Effect.gen(function* () {
          yield* Effect.logInfo(
            `Explaining scientific concept: ${conceptQuery}`
          );

          // Determine the most likely domain based on concept
          const domainKeywords: Record<string, string[]> = {
            physics: [
              "energy",
              "force",
              "motion",
              "gravity",
              "quantum",
              "relativity",
              "particle",
              "wave",
            ],
            biology: [
              "cell",
              "organ",
              "tissue",
              "gene",
              "protein",
              "evolution",
              "ecosystem",
              "species",
            ],
            chemistry: [
              "molecule",
              "atom",
              "reaction",
              "bond",
              "compound",
              "acid",
              "base",
              "solution",
            ],
            astronomy: [
              "star",
              "planet",
              "galaxy",
              "cosmos",
              "universe",
              "black hole",
              "supernova",
              "nebula",
            ],
          };

          // Determine likely domain from concept query
          let likelyDomain = options?.domain || "general";
          if (likelyDomain === "general") {
            const conceptLower = conceptQuery.toLowerCase();
            for (const [domain, keywords] of Object.entries(domainKeywords)) {
              if (keywords.some((keyword) => conceptLower.includes(keyword))) {
                likelyDomain = domain;
                break;
              }
            }
          }

          // Create input for the chat method with the determined domain
          const chatInput: ScientistChatPipelineInput = {
            message: `Please explain this scientific concept in detail: ${conceptQuery}`,
            domain: likelyDomain,
            academicLevel: options?.academicLevel || "undergraduate",
            includeCitations:
              options?.includeCitations !== undefined
                ? options.includeCitations
                : true,
            history: options?.history,
          };

          // Get the base response from the chat method
          const response = yield* implementChat(chatInput);

          // Enhance the response for concept explanation
          return {
            ...response,
            message: `${conceptQuery}: ${response.message}`,
            notes: [
              ...(response.notes || []),
              "This explanation focuses on core principles and may be simplified for clarity.",
            ],
          };
        }),
    }),
    dependencies: [],
  }
) {}

// Helper functions outside the class
const getDomainInfo = (
  domain: string,
  query: string
): { info: string; citations: Array<any> } => {
  // TODO: Replace with actual Phoenix MCP server call
  // For now, using mock domain-specific responses
  const domainResponses: Record<
    string,
    { info: string; citations: Array<any> }
  > = {
    physics: {
      info: "In physics, energy conservation is a fundamental principle stating that energy can neither be created nor destroyed - only converted from one form to another.",
      citations: [
        {
          id: "feynman1964",
          title: "The Feynman Lectures on Physics",
          authors: ["Feynman, R.P.", "Leighton, R.B.", "Sands, M."],
          year: 1964,
          url: "https://www.feynmanlectures.caltech.edu/",
        },
        {
          id: "conservation2022",
          title:
            "Conservation of Energy: Theoretical and Experimental Approaches",
          authors: ["Johnson, A.R.", "Chen, L.Q."],
          year: 2022,
          url: "https://example.org/physics/conservation",
        },
      ],
    },
    biology: {
      info: "In biology, cellular respiration is the process by which cells convert nutrients into ATP, the energy currency of the cell, while releasing waste products.",
      citations: [
        {
          id: "campbell2020",
          title: "Campbell Biology",
          authors: [
            "Urry, L.A.",
            "Cain, M.L.",
            "Wasserman, S.A.",
            "Minorsky, P.V.",
            "Reece, J.B.",
          ],
          year: 2020,
          url: "https://www.pearson.com/campbell-biology",
        },
        {
          id: "respiration2021",
          title: "Cellular Respiration: Mechanisms and Regulation",
          authors: ["Garcia, S.T.", "Patel, N.V."],
          year: 2021,
          url: "https://example.org/biology/respiration",
        },
      ],
    },
    chemistry: {
      info: "In chemistry, acids and bases are substances that, when dissolved in water, increase the concentration of hydrogen ions (H+) or hydroxide ions (OH-), respectively.",
      citations: [
        {
          id: "pauling1988",
          title: "General Chemistry",
          authors: ["Pauling, L."],
          year: 1988,
          url: "https://www.example.org/chemistry/general",
        },
        {
          id: "acids2023",
          title: "Modern Understanding of Acid-Base Chemistry",
          authors: ["Roberts, A.J.", "Williams, D.H."],
          year: 2023,
          url: "https://example.org/chemistry/acids-bases",
        },
      ],
    },
    astronomy: {
      info: "In astronomy, black holes are regions of spacetime where gravity is so strong that nothing—including light—can escape once it passes the event horizon.",
      citations: [
        {
          id: "hawking1988",
          title: "A Brief History of Time",
          authors: ["Hawking, S."],
          year: 1988,
          url: "https://www.example.org/astronomy/brief-history",
        },
      ],
    },
    general: {
      info: "This is a general scientific explanation that covers basic principles and concepts.",
      citations: [
        {
          id: "science2023",
          title: "General Scientific Principles",
          authors: ["Smith, J.", "Brown, K."],
          year: 2023,
          url: "https://example.org/science/principles",
        },
      ],
    },
  };

  return domainResponses[domain] || domainResponses.general;
};

const adjustComplexity = (text: string, level: string): string => {
  // TODO: Replace with actual Phoenix MCP server call
  // For now, using simple text adjustments
  switch (level) {
    case "elementary":
      return `${text} This is explained in simple terms for elementary level understanding.`;
    case "highschool":
      return `${text} This explanation is suitable for high school students.`;
    case "undergraduate":
      return `${text} This explanation is at an undergraduate level.`;
    case "graduate":
      return `${text} This is an advanced explanation suitable for graduate students.`;
    case "expert":
      return `${text} This is a detailed technical explanation for experts in the field.`;
    default:
      return text;
  }
};

/**
 * Layer for the ScientistChatPipeline service
 */
export const ScientistChatPipelineLayer = ScientistChatPipelineService;
