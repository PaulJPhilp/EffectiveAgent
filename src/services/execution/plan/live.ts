import { AiPlan } from "@effect/ai"
import { OpenAiCompletions } from "@effect/ai-openai"
import { Schedule } from "effect"
import { Effect } from "effect"
import { NetworkError, ProviderOutage } from "./errors.js"

const DadJokePlan = AiPlan.fromModel(OpenAiCompletions.model("gpt-4o"), {
	attempts: 3,
	schedule: Schedule.exponential("100 millis", 1.5),
	while: (error: NetworkError | ProviderOutage) =>
		error._tag === "NetworkError"
})

const main = Effect.gen(function* () {
	const plan = yield* DadJokePlan
	const response = yield* plan.provide(generateDadJoke)
})

const DadJokePlan = AiPlan.fromModel(OpenAiCompletions.model("gpt-4o"), {
	attempts: 3,
	schedule: Schedule.exponential("100 millis", 1.5),
	while: (error: NetworkError | ProviderOutage) =>
		error._tag === "NetworkError"
}).pipe(
	AiPlan.withFallback({
		model: AnthropicCompletions.model("claude-3-7-sonnet-latest"),
		attempts: 2,
		schedule: Schedule.exponential("100 millis", 1.5),
		while: (error: NetworkError | ProviderOutage) =>
			error._tag === "ProviderOutage"
	})
)