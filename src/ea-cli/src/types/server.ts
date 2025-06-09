/**
 * Type definitions for server events
 */

/** Valid server event types */
export type ServerEventType =
  | "SERVER_START"
  | "SERVER_READY"
  | "SERVER_STOP"
  | "CLIENT_CONNECT"
  | "CLIENT_DISCONNECT"
  | "REQUEST"
  | "RESPONSE"
  | "ERROR"
  | "INFO"
  | "HEARTBEAT"

/** Common client metadata */
export interface ClientMetadata {
  clientId: string
  agentRuntimeId?: string
}

/** Base event data interface */
export interface BaseEventData {
  message?: string
}

/** Event data for server events */
export interface ServerEventData extends BaseEventData {
  agentName?: string
  host?: string
  port?: number
  uptime?: number
  memory?: NodeJS.MemoryUsage
  activeConnections?: number
}

/** Client event data */
export interface ClientEventData extends BaseEventData, ClientMetadata {
  code?: number
  reason?: string
}

/** Server event with typed discriminated union */
export interface ServerEvent {
  type: ServerEventType
  timestamp: Date
  data: ServerEventData | ClientEventData
}

export type ServerStartEvent = ServerEvent & {
  type: "SERVER_START"
  data: {
    agentName: string
    host: string
    port: number
    message: string
  }
}

export type ServerReadyEvent = ServerEvent & {
  type: "SERVER_READY"
  data: {
    host: string
    port: number
    message: string
  }
}

export type ServerStopEvent = ServerEvent & {
  type: "SERVER_STOP"
  data: {
    reason: string
    message: string
  }
}

export type ClientConnectEvent = ServerEvent & {
  type: "CLIENT_CONNECT"
  data: ClientEventData
}

export type ClientDisconnectEvent = ServerEvent & {
  type: "CLIENT_DISCONNECT"
  data: ClientEventData
}

export type InfoEvent = ServerEvent & {
  type: "INFO"
  data: {
    message: string
  }
}

export type RequestEvent = ServerEvent & {
  type: "REQUEST"
  data: ClientEventData & {
    message: string
  }
}

export type ResponseEvent = ServerEvent & {
  type: "RESPONSE"
  data: ClientEventData & {
    message: string
  }
}

export type HeartbeatEvent = ServerEvent & {
  type: "HEARTBEAT"
  data: {
    uptime: number
    memory: NodeJS.MemoryUsage
    activeConnections: number
  }
}

export type ErrorEvent = ServerEvent & {
  type: "ERROR"
  data: {
    message: string
    code?: number
    cause?: unknown
  }
}

export type ServerEventUnion =
  | ServerStartEvent
  | ServerReadyEvent
  | ServerStopEvent
  | ClientConnectEvent
  | ClientDisconnectEvent
  | RequestEvent
  | ResponseEvent
  | InfoEvent
  | HeartbeatEvent
  | ErrorEvent
