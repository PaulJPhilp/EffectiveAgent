/**
 * Helper functions for the Transcription Service.
 */
export function isValidAudioBuffer(data: unknown): data is ArrayBuffer {
  return data instanceof ArrayBuffer && data.byteLength > 0;
}
