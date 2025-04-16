import { Data } from "effect";

export class NetworkError extends Data.TaggedError("NetworkError") { }

export class ProviderOutage extends Data.TaggedError("ProviderOutage") { }