/**
 * Extract JSON content from a string that may contain markdown or other text
 */
export function extractJsonFromResponse(content: string) {
	// Try to find JSON content within code blocks
	const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
	if (codeBlockMatch) {
		return codeBlockMatch[1].trim()
	}

	// Try to find JSON content between curly braces
	const jsonMatch = content.match(/\{[\s\S]*\}/)
	if (jsonMatch) {
		return jsonMatch[0].trim()
	}

	throw new Error("No JSON content found in response")
}