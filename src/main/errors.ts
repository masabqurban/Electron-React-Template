import type { ErrorCode } from '@shared/contract';

/** An error that is safe to show to the user, with a stable code. */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly issues?: string[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}
