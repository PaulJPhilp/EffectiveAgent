import { Annotation } from "@langchain/langgraph";
import type { RunConfig, FullPersona, ElaboratedPersona, Evaluation } from "./types.js";

export const EvaluationStateAnnotation = Annotation.Root({
	runInfo: Annotation<RunConfig>,
	inputPersona: Annotation<Partial<FullPersona>>,
	elaboratedPersona: Annotation<Partial<ElaboratedPersona>>,
	elaborationCount: Annotation<number>,
	evaluation: Annotation<Evaluation>,
	executiveSummary: Annotation<string>,
	fullProfile: Annotation<string>,
	summaryReport: Annotation<string>,
	error: Annotation<string>,
	errorCount: Annotation<number>,
	status: Annotation<string[]>({
		default: () => [],
		reducer: (a, b) => { a.push(b[0]); return a; },
	}),
	completedSteps: Annotation<string[]>({
		default: () => [],
		reducer: (a, b) => { a.push(b[0]); return a; }
	}),
	logs: Annotation<string[]>({
		default: () => [],
		reducer: (a, b) => { a.push(b[0]); return a; }
	}),
	recommendations: Annotation<string[]>({
		default: () => [],
		reducer: (a, b) => { a.push(b[0]); return a; }
	}),
});