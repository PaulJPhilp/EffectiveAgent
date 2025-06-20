// [DEPRECATED] All exports have been moved to input.service.ts
// This file will be deleted after migration.

import { EffectiveError } from "@/errors.js";


export class InputServiceError extends EffectiveError {
  constructor(params: { description: string; method: string; cause?: unknown }) {
    super({
      ...params,
      module: "InputService",
    });
  }
}

export class InvalidMessageError extends InputServiceError {
  constructor(params: { description: string; method: string; cause?: unknown }) {
    super(params);
  }

  static missingRole(method: string): InvalidMessageError {
    return new InvalidMessageError({
      description: "Message must have a valid role defined",
      method
    });
  }

  static missingParts(method: string): InvalidMessageError {
    return new InvalidMessageError({
      description: "Message must have at least one part defined",
      method
    });
  }

  static invalidFormat(method: string, details?: string): InvalidMessageError {
    return new InvalidMessageError({
      description: `Invalid message format${details ? ': ' + details : ''}`,
      method
    });
  }
}

export class InvalidInputError extends InputServiceError {
  constructor(params: { description: string; method: string; cause?: unknown }) {
    super(params);
  }

  static emptyInput(method: string): InvalidInputError {
    return new InvalidInputError({
      description: "Input cannot be empty or undefined",
      method
    });
  }

  static invalidType(method: string, expectedType: string): InvalidInputError {
    return new InvalidInputError({
      description: `Invalid input type, expected ${expectedType}`,
      method
    });
  }

  static noTextContent(method: string): InvalidInputError {
    return new InvalidInputError({
      description: "No valid text content found in messages",
      method
    });
  }
}

export class NoAudioFileError extends InputServiceError {
  constructor() {
    super({
      description: "No audio file found in messages",
      method: "extractAudioForTranscription"
    });
  }
}
