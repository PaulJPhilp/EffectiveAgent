# Transcription Service Agent

The TranscriptionService has been refactored to use the AgentRuntime architecture, providing enhanced state management, activity tracking, and monitoring capabilities for audio transcription operations.

## Overview

The TranscriptionService is now implemented as an Agent that:
- Uses `AgentRuntime` for state management and activity processing
- Tracks transcription history and statistics
- Provides real-time monitoring of audio transcription operations
- Uses Effect's built-in logging instead of LoggingService
- Maintains backward compatibility with the existing API

## Architecture Changes

### Agent State
The service now maintains state via `TranscriptionAgentState`:
```typescript
interface TranscriptionAgentState {
    readonly transcriptionCount: number
    readonly lastTranscription: Option.Option<TranscriptionResult>
    readonly lastUpdate: Option.Option<number>
    readonly transcriptionHistory: ReadonlyArray<{
        readonly timestamp: number
        readonly modelId: string
        readonly audioSize: number
        readonly transcriptionLength: number
        readonly duration?: number
        readonly language?: string
        readonly success: boolean
    }>
}
```

### Activity Tracking
All transcription operations are tracked as activities:
- `TRANSCRIBE_AUDIO` commands for transcription requests
- `STATE_CHANGE` activities for state updates
- Activity metadata includes timing, audio size, and success metrics

### New API Methods
Additional methods for agent management:
- `getAgentState()` - Returns current agent state for monitoring
- `getRuntime()` - Returns the AgentRuntime instance for advanced operations
- `terminate()` - Properly terminates the agent

## Usage

### Basic Audio Transcription
The primary `transcribe()` method remains functional but with enhanced options:
```typescript
const transcriptionService = yield* TranscriptionService;
const result = yield* transcriptionService.transcribe({
    modelId: "whisper-1",
    audioData: audioBuffer, // Uint8Array or base64 string
    audioFormat: "mp3",
    span: currentSpan,
    parameters: {
        language: "en-US",
        timestamps: true,
        diarization: false
    }
});
```

### State Monitoring
Access current agent state:
```typescript
const state = yield* transcriptionService.getAgentState();
console.log(`Processed ${state.transcriptionCount} audio files`);
console.log(`Last transcription: ${Option.getOrElse(state.lastTranscription, () => "none")}`);
```

### Activity Tracking
Get the runtime for advanced monitoring:
```typescript
const runtime = transcriptionService.getRuntime();
const runtimeState = yield* runtime.getState();
console.log(`Agent status: ${runtimeState.status}`);
```

## Supported Audio Formats

The service supports multiple audio formats:
- MP3
- MP4
- WAV
- FLAC
- OGG
- M4A
- WEBM

## Benefits

1. **State Management**: Automatic tracking of transcription history and statistics
2. **Activity Logging**: All operations logged as structured activities
3. **Monitoring**: Real-time visibility into service performance and audio processing
4. **Debugging**: Enhanced debugging capabilities through activity tracking
5. **Scalability**: Built-in support for concurrent transcription operations
6. **Effect Integration**: Uses Effect's built-in logging and error handling
7. **Audio Analytics**: Tracks audio size, duration, detected language, and transcription length

## Migration Notes

- The `transcribe()` method now requires a `TranscriptionOptions` object instead of just `ArrayBuffer`
- New monitoring capabilities available through `getAgentState()`
- Agent should be terminated when no longer needed using `terminate()`
- Tests may need updating to account for AgentRuntime dependencies

## Dependencies

- `AgentRuntimeService` - For agent lifecycle management
- `ModelService` - For model metadata and provider mapping
- `ProviderService` - For AI provider client access
- Effect's built-in logging system (no external LoggingService needed) 