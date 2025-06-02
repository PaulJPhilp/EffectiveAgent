import { appendFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface LogToFileOptions {
  /** The directory where log files will be stored */
  logDir?: string;
  /** The base name for the log file (without extension) */
  logFileBase?: string;
  /** Whether to include timestamps in log entries */
  includeTimestamp?: boolean;
}

/**
 * Logs a message to a file with optional data
 * @param message The message to log
 * @param data Optional data to include in the log entry
 * @param options Configuration options for logging
 */
export const logToFile = (
  message: string, 
  data?: unknown, 
  options: LogToFileOptions = {}
): void => {
  try {
    // Set default options
    const {
      logDir = join(__dirname, "../../logs"),
      logFileBase = "weather",
      includeTimestamp = true
    } = options;

    // Ensure log directory exists
    if (!existsSync(logDir)) {
      console.log(`[logToFile] Creating log directory: ${logDir}`);
      mkdirSync(logDir, { recursive: true });
    }

    // Create log entry
    const timestamp = new Date().toISOString();
    let entry = "";
    
    if (includeTimestamp) {
      entry += `[${timestamp}] `;
    }
    
    entry += message;
    
    if (data !== undefined) {
      try {
        const dataStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        entry += `\n${dataStr}\n`;
      } catch (error) {
        entry += `\n[Non-serializable data]\n`;
      }
    }
    
    entry += "\n";

    // Write to log file
    const logPath = `${logDir}/${logFileBase}.log`;
    appendFileSync(logPath, entry, { encoding: "utf8" });
    console.log(`[logToFile] Logged to ${logPath}`);
    
  } catch (error) {
    console.error("[logToFile] Error writing to log file:", error);
    throw error;
  }
};

/**
 * Creates a pre-configured logger instance
 * @param options Default options for this logger instance
 * @returns A function with the same signature as logToFile but with pre-filled options
 */
export const createLogger = (options: LogToFileOptions = {}) => {
  return (message: string, data?: unknown) => 
    logToFile(message, data, options);
};