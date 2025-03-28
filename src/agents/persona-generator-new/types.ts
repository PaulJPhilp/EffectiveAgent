import type { AgentState } from '../agent-service/types.js'

export interface Profile {
    id: string
    name: string
    bio: string
    interests: string[]
    skills: string[]
    traits: string[]
}

export interface PersonaInput {
    profiles: string[]
}

export interface PersonaOutput {
    clusters: any[] // Will be refined as we implement clustering
    personas: any[] // Will be refined as we implement persona generation
}

export interface PersonaDomainState {
    readonly profiles: Profile[]
    readonly clusters: any[]
    readonly personas: any[]
}

/**
 * State type for the persona generator agent
 */
export type PersonaGeneratorState = AgentState<PersonaInput, PersonaOutput, PersonaDomainState>