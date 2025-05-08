/**
 * @file Service implementation for the VentureCapitalistChatPipeline
 * @module ea/pipelines/venture-capitalist-chat/service
 */

import { Effect } from "effect";
import {
    type VentureCapitalistChatPipelineApi,
    VentureCapitalistChatPipelineError,
    type VentureCapitalistChatPipelineInput,
    type VentureCapitalistChatResponse
} from "./contract.js";

/**
 * Service for market research
 */
export interface MarketResearchToolApi {
    readonly _tag: "MarketResearchTool"
    readonly getIndustryInsights: (industry: string) => Effect.Effect<{
        trends: string[];
        keyMetrics: string[];
        valuationMultiples: Record<string, number>;
        comparables: Array<{
            companyName: string;
            description: string;
            valuation?: {
                amount: number;
                currency: string;
                date: string;
            };
        }>;
    }, never>
}

/**
 * Implementation of the MarketResearchTool service using Effect.Service pattern
 */
export class MarketResearchTool extends Effect.Service<MarketResearchToolApi>()("MarketResearchTool", {
    effect: Effect.succeed({
        _tag: "MarketResearchTool" as const,
        getIndustryInsights: (industry: string) => {
            // Mock implementation - replace with real market research
            const industryData: Record<string, any> = {
                "tech": {
                    trends: [
                        "Increased focus on AI and machine learning",
                        "Growth in cloud-native applications",
                        "Rising importance of cybersecurity"
                    ],
                    keyMetrics: ["MRR growth", "Customer acquisition cost", "Churn rate"],
                    valuationMultiples: {
                        "revenue": 10,
                        "arpu": 50,
                        "user": 500
                    },
                    comparables: [
                        {
                            companyName: "CloudTech Solutions",
                            description: "SaaS platform for enterprise resource planning",
                            valuation: {
                                amount: 15000000,
                                currency: "USD",
                                date: "2023-08-15"
                            }
                        },
                        {
                            companyName: "AI Analytics Inc",
                            description: "AI-powered data analytics platform",
                            valuation: {
                                amount: 28000000,
                                currency: "USD",
                                date: "2023-05-20"
                            }
                        }
                    ]
                },
                "healthcare": {
                    trends: [
                        "Telehealth adoption acceleration",
                        "Personalized medicine advances",
                        "Digital health records integration"
                    ],
                    keyMetrics: ["Patient acquisition cost", "Regulatory milestones", "Clinical efficacy"],
                    valuationMultiples: {
                        "revenue": 6,
                        "patient": 2000,
                        "clinic": 1000000
                    },
                    comparables: [
                        {
                            companyName: "TeleHealth Connect",
                            description: "Remote patient monitoring platform",
                            valuation: {
                                amount: 22000000,
                                currency: "USD",
                                date: "2023-07-12"
                            }
                        },
                        {
                            companyName: "MedTech Innovations",
                            description: "Medical device manufacturer for home diagnostics",
                            valuation: {
                                amount: 35000000,
                                currency: "USD",
                                date: "2023-03-18"
                            }
                        }
                    ]
                },
                "fintech": {
                    trends: [
                        "Embedded finance integration",
                        "Blockchain and decentralized finance growth",
                        "Regulatory technology advancements"
                    ],
                    keyMetrics: ["Transaction volume", "User growth", "Default rate"],
                    valuationMultiples: {
                        "revenue": 8,
                        "user": 250,
                        "transaction": 0.05
                    },
                    comparables: [
                        {
                            companyName: "PayEase",
                            description: "Payment processing platform for small businesses",
                            valuation: {
                                amount: 18000000,
                                currency: "USD",
                                date: "2023-09-22"
                            }
                        },
                        {
                            companyName: "LendingTree",
                            description: "AI-driven loan approval platform",
                            valuation: {
                                amount: 12500000,
                                currency: "USD",
                                date: "2023-02-10"
                            }
                        }
                    ]
                },
                "ecommerce": {
                    trends: [
                        "Omnichannel retail experiences",
                        "Sustainable supply chain practices",
                        "Direct-to-consumer model growth"
                    ],
                    keyMetrics: ["CAC:LTV ratio", "Average order value", "Repeat purchase rate"],
                    valuationMultiples: {
                        "revenue": 3,
                        "customer": 200,
                        "order": 20
                    },
                    comparables: [
                        {
                            companyName: "Shopify Plus",
                            description: "End-to-end ecommerce platform",
                            valuation: {
                                amount: 9000000,
                                currency: "USD",
                                date: "2023-06-05"
                            }
                        },
                        {
                            companyName: "Direct Brands Co",
                            description: "D2C brand aggregator",
                            valuation: {
                                amount: 14000000,
                                currency: "USD",
                                date: "2023-04-30"
                            }
                        }
                    ]
                }
            };

            // Default values if industry not found
            const defaultData = {
                trends: [
                    "Digital transformation across sectors",
                    "Sustainability and ESG focus"
                ],
                keyMetrics: ["Revenue growth", "Profit margins", "Market share"],
                valuationMultiples: {
                    "revenue": 5,
                    "ebitda": 12,
                    "user": 100
                },
                comparables: [
                    {
                        companyName: "General Startup Inc",
                        description: "Innovative business model in emerging market",
                        valuation: {
                            amount: 7500000,
                            currency: "USD",
                            date: "2023-05-15"
                        }
                    }
                ]
            };

            return Effect.succeed(industryData[industry.toLowerCase()] || defaultData);
        }
    }),
    dependencies: []
}) { }

/**
 * Service for financial modeling
 */
export interface FinancialModelingToolApi {
    readonly _tag: "FinancialModelingTool"
    readonly getInvestmentStageRequirements: (stage: string) => Effect.Effect<{
        expectations: string[];
        typicalRange: { min: number; max: number; currency: string };
        equity: { min: number; max: number };
        metrics: string[];
    }, never>
}

/**
 * Implementation of the FinancialModelingTool service using Effect.Service pattern
 */
export class FinancialModelingTool extends Effect.Service<FinancialModelingToolApi>()("FinancialModelingTool", {
    effect: Effect.succeed({
        _tag: "FinancialModelingTool" as const,
        getInvestmentStageRequirements: (stage: string) => {
            // Mock implementation - replace with real financial modeling
            const stageData: Record<string, any> = {
                "seed": {
                    expectations: [
                        "Proof of concept or MVP",
                        "Early market validation",
                        "Strong founding team",
                        "Clear problem-solution fit"
                    ],
                    typicalRange: { min: 500000, max: 2500000, currency: "USD" },
                    equity: { min: 10, max: 25 },
                    metrics: ["Early user traction", "Prototype completion", "Key team hires"]
                },
                "series a": {
                    expectations: [
                        "Product-market fit",
                        "Initial revenue traction",
                        "Clear customer acquisition strategy",
                        "Scalable business model"
                    ],
                    typicalRange: { min: 2000000, max: 15000000, currency: "USD" },
                    equity: { min: 15, max: 30 },
                    metrics: ["Monthly recurring revenue", "Customer acquisition cost", "Retention rates"]
                },
                "series b": {
                    expectations: [
                        "Proven business model",
                        "Significant revenue growth",
                        "Established market position",
                        "Clear path to profitability"
                    ],
                    typicalRange: { min: 10000000, max: 30000000, currency: "USD" },
                    equity: { min: 15, max: 25 },
                    metrics: ["Revenue growth rate", "Unit economics", "Market share", "Team expansion"]
                },
                "growth": {
                    expectations: [
                        "Established market leader",
                        "Significant revenue",
                        "International expansion potential",
                        "Multiple revenue streams"
                    ],
                    typicalRange: { min: 20000000, max: 100000000, currency: "USD" },
                    equity: { min: 10, max: 20 },
                    metrics: ["EBITDA", "Growth rate", "Market penetration", "Competitive moat"]
                }
            };

            // Default to seed if stage not specified or not found
            return Effect.succeed(stageData[stage?.toLowerCase()] || stageData["seed"]);
        }
    }),
    dependencies: []
}) { }

/**
 * Implementation of the VentureCapitalistChatPipeline service
 */
export class VentureCapitalistChatPipelineService extends Effect.Service<VentureCapitalistChatPipelineApi>()(
    "VentureCapitalistChatPipeline",
    {
        effect: Effect.gen(function* (_) {
            // Get dependencies
            const marketResearch = yield* _(MarketResearchTool);
            const financialModeling = yield* _(FinancialModelingTool);

            // Helper to analyze pitch
            const analyzePitch = (pitch: string, industry?: string, stage?: string): Effect.Effect<{
                strengths: string[];
                concerns: string[];
                suggestions: string[];
                valuationRange?: { min: number; max: number; currency: string };
            }, never> =>
                Effect.gen(function* () {
                    // TODO: Replace with actual Phoenix MCP server call
                    // For now, using mock responses
                    const possibleStrengths = [
                        "Strong founding team with relevant experience",
                        "Innovative technology with potential IP protection",
                        "Large addressable market opportunity",
                        "Clear revenue model",
                        "Early customer traction showing product-market fit",
                        "Scalable business model",
                        "Strong unit economics",
                        "Competitive advantage in the space"
                    ];

                    const possibleConcerns = [
                        "Limited track record of execution",
                        "Highly competitive market landscape",
                        "Regulatory challenges may impact growth",
                        "High customer acquisition costs",
                        "Unclear path to profitability",
                        "Technology risk in implementation",
                        "Potential for market disruption",
                        "Lack of clear exit opportunities"
                    ];

                    const possibleSuggestions = [
                        "Focus on key performance metrics to demonstrate traction",
                        "Develop strategic partnerships to accelerate growth",
                        "Consider alternative revenue streams to diversify income",
                        "Build a more comprehensive go-to-market strategy",
                        "Strengthen the team in key areas",
                        "Develop clearer unit economics model",
                        "Create milestones tied to future funding rounds",
                        "Focus on customer retention alongside acquisition"
                    ];

                    // Select random subset of each category
                    const getRandomSubset = (arr: string[], count: number): string[] => {
                        const shuffled = [...arr].sort(() => 0.5 - Math.random());
                        return shuffled.slice(0, count);
                    };

                    // Get industry insights for valuation
                    const industryInsights = yield* _(marketResearch.getIndustryInsights(industry || ""));
                    const stageRequirements = yield* _(financialModeling.getInvestmentStageRequirements(stage || "seed"));

                    // Create a valuation range based on industry and stage
                    const baseValuation = stageRequirements.typicalRange;

                    // Randomize the exact values within the typical range
                    const minAdjustment = Math.random() * 0.3 - 0.15; // -15% to +15%
                    const maxAdjustment = Math.random() * 0.3 - 0.05; // -5% to +25%

                    const valuationRange = {
                        min: Math.round(baseValuation.min * (1 + minAdjustment)),
                        max: Math.round(baseValuation.max * (1 + maxAdjustment)),
                        currency: baseValuation.currency
                    };

                    return {
                        strengths: getRandomSubset(possibleStrengths, 3 + Math.floor(Math.random() * 2)),
                        concerns: getRandomSubset(possibleConcerns, 2 + Math.floor(Math.random() * 2)),
                        suggestions: getRandomSubset(possibleSuggestions, 3),
                        valuationRange
                    };
                });

            // Method implementations
            const chat = (input: VentureCapitalistChatPipelineInput): Effect.Effect<VentureCapitalistChatResponse, VentureCapitalistChatPipelineError> =>
                Effect.gen(function* () {
                    yield* Effect.logInfo(`Generating venture capitalist response for industry: ${input.industry || "general"}`);

                    try {
                        // TODO: Replace with actual Phoenix MCP server call
                        // For now, using mock responses
                        const providedMetrics = input.metrics || [];

                        // Get industry insights
                        const industryData = yield* _(marketResearch.getIndustryInsights(input.industry || ""));

                        // Get investment stage requirements
                        const stageData = yield* _(financialModeling.getInvestmentStageRequirements(input.investmentStage || ""));

                        // Generate a response based on the message and context
                        let responseMessage = "";

                        // Check if the message appears to be a pitch
                        const isPitch = input.message.length > 100 &&
                            (input.message.toLowerCase().includes("startup") ||
                                input.message.toLowerCase().includes("business") ||
                                input.message.toLowerCase().includes("company") ||
                                input.message.toLowerCase().includes("venture") ||
                                input.message.toLowerCase().includes("funding"));

                        if (isPitch) {
                            // Analyze the pitch
                            const pitchAnalysis = yield* _(analyzePitch(input.message, input.industry, input.investmentStage));

                            // Generate response for a pitch
                            responseMessage = `Thank you for sharing your business concept. As a venture capitalist focused on ${input.industry || "various sectors"}, I look at opportunities through a specific lens. `;
                            responseMessage += `Your venture appears to be at the ${input.investmentStage || "early"} stage, where we typically look for ${stageData.expectations.join(", ")}. `;
                            responseMessage += `I've analyzed your proposal and identified several key points worth discussing further.`;

                            // Include the analysis and comparables
                            return {
                                message: responseMessage,
                                analysis: {
                                    strengths: pitchAnalysis.strengths,
                                    concerns: pitchAnalysis.concerns,
                                    suggestions: pitchAnalysis.suggestions,
                                    valuationRange: pitchAnalysis.valuationRange
                                },
                                comparables: industryData.comparables
                            };
                        } else {
                            // General VC advice or perspective
                            responseMessage = `From a venture capital perspective focused on ${input.industry || "multiple industries"}, `;

                            if (input.message.toLowerCase().includes("valuation")) {
                                responseMessage += `valuation is both an art and a science. In ${input.industry || "this sector"}, we typically see valuations of ${stageData.typicalRange.min / 1000000}-${stageData.typicalRange.max / 1000000}M for ${input.investmentStage || "early stage"} companies. `;
                                responseMessage += `Key metrics that drive valuation include ${industryData.keyMetrics.join(", ")}. `;
                                responseMessage += `Current trends affecting valuations include ${industryData.trends.join(", ")}.`;
                            } else if (input.message.toLowerCase().includes("metrics") || input.message.toLowerCase().includes("kpi")) {
                                responseMessage += `investors at the ${input.investmentStage || "early"} stage typically focus on ${industryData.keyMetrics.join(", ")}. `;
                                responseMessage += `These metrics provide insight into the company's growth trajectory, unit economics, and market potential.`;
                            } else if (input.message.toLowerCase().includes("trend")) {
                                responseMessage += `we're seeing several interesting trends in the market: ${industryData.trends.join(", ")}. `;
                                responseMessage += `Companies that position themselves to capitalize on these trends often attract more investor interest.`;
                            } else {
                                responseMessage += `I'd consider several factors: market opportunity, team capabilities, traction, and competitive advantage. `;
                                responseMessage += `For ${input.investmentStage || "early stage"} companies in ${input.industry || "this space"}, we typically look for ${stageData.expectations.slice(0, 2).join(" and ")}. `;
                                responseMessage += `The most successful ventures demonstrate strong ${industryData.keyMetrics[0]} and a clear path to scaling.`;
                            }

                            // Create a simplified analysis
                            return {
                                message: responseMessage
                            };
                        }
                    } catch (error) {
                        return yield* Effect.fail(
                            new VentureCapitalistChatPipelineError({
                                message: `Failed to generate venture capitalist response: ${error instanceof Error ? error.message : String(error)}`,
                                cause: error
                            })
                        );
                    }
                });

            const evaluatePitch = (
                pitchText: string,
                options?: Partial<Omit<VentureCapitalistChatPipelineInput, "message">>
            ): Effect.Effect<VentureCapitalistChatResponse, VentureCapitalistChatPipelineError> =>
                Effect.gen(function* () {
                    yield* Effect.logInfo(`Evaluating business pitch for industry: ${options?.industry || "general"}`);

                    try {
                        // TODO: Replace with actual Phoenix MCP server call
                        // For now, using mock responses
                        const pitchAnalysis = yield* _(analyzePitch(
                            pitchText,
                            options?.industry,
                            options?.investmentStage
                        ));

                        // Get industry insights
                        const industryData = yield* _(marketResearch.getIndustryInsights(options?.industry || ""));

                        // Get investment stage requirements
                        const stageData = yield* _(financialModeling.getInvestmentStageRequirements(options?.investmentStage || "seed"));

                        // Craft a comprehensive response
                        const responseMessage = `I've reviewed your business pitch through a venture capital lens. ` +
                            `For a ${options?.investmentStage || "seed"} stage company in ${options?.industry || "this industry"}, ` +
                            `we typically evaluate against key criteria like ${stageData.expectations.slice(0, 2).join(" and ")}. ` +
                            `Your pitch demonstrates several interesting aspects that warrant further discussion.`;

                        // Return detailed analysis
                        return {
                            message: responseMessage,
                            analysis: {
                                strengths: pitchAnalysis.strengths,
                                concerns: pitchAnalysis.concerns,
                                suggestions: pitchAnalysis.suggestions,
                                valuationRange: pitchAnalysis.valuationRange
                            },
                            comparables: industryData.comparables
                        };
                    } catch (error) {
                        return yield* Effect.fail(
                            new VentureCapitalistChatPipelineError({
                                message: `Failed to evaluate pitch: ${error instanceof Error ? error.message : String(error)}`,
                                cause: error
                            })
                        );
                    }
                });

            // Return implementation of the API
            return {
                chat,
                evaluatePitch
            };
        }),

        // List dependencies
        dependencies: [MarketResearchTool, FinancialModelingTool]
    }
) { }

/**
 * Layer for the VentureCapitalistChatPipeline service
 */
export const VentureCapitalistChatPipelineLayer = VentureCapitalistChatPipelineService;