import { LogLevel, Effect } from "effect";
import type { LoggingServiceError } from "./service.js";
import type { JsonObject } from "@/types.js";

/**
 * Logger interface for pluggable loggers (file, console, remote, etc).
 * Each logger implementation should handle its own log level filtering.
 */
