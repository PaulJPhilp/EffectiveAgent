import { Annotation } from "@langchain/langgraph";
import type { RunInfo, NormalizationStatus, ProfileData, NormalizationResult, NormalizationSummary } from "./types.js";

export const NormalizationStateAnnotation = Annotation.Root({
	runInfo: Annotation<RunInfo>(),
	status: Annotation<NormalizationStatus>(),
	profiles: Annotation<Array<Partial<ProfileData>>>(),
	normalizedProfiles: Annotation<Array<ProfileData>>(),
	normalizationResults: Annotation<Array<NormalizationResult>>(),
	summary: Annotation<NormalizationSummary>(),
	completedSteps: Annotation<string[]>(),
	error: Annotation<string>(),
	errorCount: Annotation<number>(),
	logs: Annotation<string[]>()
})

export interface NormalizationState {
	runInfo: RunInfo;
	status: NormalizationStatus;
	profiles: Array<Partial<ProfileData>>;
	normalizedProfiles: Array<ProfileData>;
	normalizationResults: Array<NormalizationResult>;
	summary: NormalizationSummary;
	completedSteps: string[];
	error: string;
	errorCount: number;
	logs: string[];
}