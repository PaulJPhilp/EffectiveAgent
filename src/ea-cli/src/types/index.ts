// CLI-specific types and interfaces

export interface WorkspaceConfig {
  readonly name: string
  readonly packageManager: "npm" | "pnpm" | "bun"
  readonly version: string
}

export interface AgentPackageConfig {
  readonly name: string
  readonly description?: string
  readonly version: string
}

export interface ResourceConfig {
  readonly type: "model" | "provider" | "rule" | "toolkit"
  readonly name: string
  readonly config: Record<string, unknown>
}

// Framework API types (as defined in PRD)
export type AgentEvent =
  | { type: "llm_start"; data: unknown }
  | { type: "tool_call"; data: unknown }
  | { type: "final_answer"; data: unknown }

export type ServerEvent =
  | { type: "server_starting"; data: unknown }
  | { type: "server_ready"; data: unknown }

export type ValidationResult =
  | { success: true }
  | { success: false; errors: string[] }

export interface FrameworkError {
  readonly code: string
  readonly message: string
}
