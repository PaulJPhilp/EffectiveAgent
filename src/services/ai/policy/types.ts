/**
 * Auth record containing user identity information
 */
export interface AuthRecord {
  readonly userId: string;
  readonly tenantId?: string;
  readonly roles?: readonly string[];
  readonly [key: string]: unknown;
}

/**
 * Context for policy check requests
 */
export interface PolicyCheckContext {
  readonly auth: AuthRecord;
  readonly pipelineId?: string;
  readonly requestedModel: string;
  readonly operationType: string; // e.g., 'text:generate', 'image:create'
  readonly tags?: Readonly<Record<string, string | number | boolean>>;
}

/**
 * Result of a policy check
 */
export interface PolicyCheckResult {
  readonly allowed: boolean;
  readonly effectiveModel: string; // May be different from requested if policy enforces a model change
  readonly reason?: string; // Optional reason for policy decision, especially for denials
}

/**
 * Token usage details
 */
export interface TokenUsage {
  readonly promptTokens?: number;
  readonly completionTokens?: number;
  readonly totalTokens?: number;
}

/**
 * Context for recording policy usage outcomes
 */
export interface PolicyRecordContext {
  readonly auth: AuthRecord;
  readonly pipelineId?: string;
  readonly modelUsed: string;
  readonly operationType: string;
  readonly status: 'success' | 'failure';
  readonly latencyMs: number;
  readonly usage?: TokenUsage;
  readonly error?: { 
    code?: string; 
    message?: string; 
  };
  readonly tags?: Readonly<Record<string, string | number | boolean>>;
}
