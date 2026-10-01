/**
 * Base class for errors the app understands. Feature errors (e.g. AuthError) extend it with their own codes.
 * Messages must never contain tokens, codes or email addresses.
 */
export class AppError<Code extends string = string> extends Error {
  readonly code: Code;
  readonly underlying: unknown;

  constructor(code: Code, message: string, underlying?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.underlying = underlying;
  }
}

/** React Native's fetch rejects with a bare TypeError when the device is offline or the host is unreachable. */
function isFetchFailure(error: unknown): boolean {
  return (
    error instanceof TypeError && /network request failed|failed to fetch|network error/i.test(error.message)
  );
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof AppError) return error.code === 'Network';
  return isFetchFailure(error);
}
