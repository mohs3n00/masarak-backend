export class InsufficientCreditsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientCreditsError';
  }
}

export class ContextTooLargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContextTooLargeError';
  }
}
