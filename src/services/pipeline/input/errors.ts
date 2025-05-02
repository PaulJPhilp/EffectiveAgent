import { EffectiveError } from "@/errors.js";

/**
 * Error thrown when no audio file is found in the input
 */
export class NoAudioFileError extends EffectiveError {
  constructor() {
    super({
      description: "No audio file found in input",
      module: "InputService",
      method: "extractAudioForTranscription"
    });
  }
}
