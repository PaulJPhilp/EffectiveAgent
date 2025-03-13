/**
 * Entry point for the normalizing agent module
 * 
 * This module handles the processing of raw PDF and text files into normalized profiles.
 * It includes functionality for parsing, merging, and normalizing profile data.
 */

// Export core functionality
export * from './agent.js'
export * from './analyzeProfiles.js'
export * from './clusterProfiles.js'
export * from './mergeProfile.js'
export * from './normalizeProfile.js'
export * from './parseProfile.js'
export * from './renameNormalizedFiles.js'
export * from './tools.js'

// Export utilities and types
export * from './config.js'
export * from './types.js'
export * from './utils.js'

// Export prompts
export * from './prompts/index.js'

