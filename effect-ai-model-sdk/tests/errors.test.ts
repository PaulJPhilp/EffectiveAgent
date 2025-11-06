import { describe, it, expect } from "vitest";
import { AiSdkOperationError, AiSdkConfigError } from "../src/errors.js";

describe("Error Types", () => {
  it("should create AiSdkOperationError", () => {
    const error = new AiSdkOperationError({
      message: "Test error",
      operation: "test",
    });

    expect(error.message).toBe("Test error");
    expect(error.operation).toBe("test");
    expect(error._tag).toBe("AiSdkOperationError");
  });

  it("should create AiSdkConfigError", () => {
    const error = new AiSdkConfigError({
      message: "Config error",
      configKey: "apiKey",
    });

    expect(error.message).toBe("Config error");
    expect(error.configKey).toBe("apiKey");
    expect(error._tag).toBe("AiSdkConfigError");
  });
});
