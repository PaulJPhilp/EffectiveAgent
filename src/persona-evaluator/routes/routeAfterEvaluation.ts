export function routeAfterEvaluation(
	// biome-ignore lint/suspicious/noExplicitAny: Required for LangGraph compatibility
	state: Record<string, any>
): "elaboratePersona" | "createExecutiveSummaries" | "__end__" {
	console.log(`routeAfterEvaluation: evaluation=${JSON.stringify(state.evaluation)}`);

	// Get the current elaboration count
	const elaborationCount = state.elaborationCount || 0;

	// If we've reached the maximum number of elaboration attempts, move on
	if (elaborationCount >= 3) {
		console.log(`Maximum elaboration attempts (${elaborationCount}) reached, moving to createExecutiveSummaries`);
		return "createExecutiveSummaries";
	}

	if (state.evaluation?.answer === "yes") {
		console.log("Routing to createExecutiveSummaries");
		return "createExecutiveSummaries";
	}

	console.log(`Routing to elaboratePersona (attempt ${elaborationCount + 1})`);
	return "elaboratePersona";
}
