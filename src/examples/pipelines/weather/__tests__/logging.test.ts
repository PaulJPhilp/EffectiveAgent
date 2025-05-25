import { describe, it, expect } from "vitest";
import { appendFileSync, readFileSync, existsSync, mkdirSync } from "fs";

describe("Direct file logging", () => {
	it("should write and read log message directly", () => {
		const logDir = "src/examples/pipelines/weather/logs";
		const logFileBase = "weather-test";
		const logPath = `${logDir}/${logFileBase}.log`;
		const logMessage = "Test log message for file output (direct)";
		// Ensure log directory exists
		if (!existsSync(logDir)) {
			mkdirSync(logDir, { recursive: true });
		}
		// Write log message directly
		appendFileSync(logPath, logMessage + "\n", "utf8");
		// Read and assert
		const content = readFileSync(logPath, "utf8");
		expect(content).toContain(logMessage);
	});
});