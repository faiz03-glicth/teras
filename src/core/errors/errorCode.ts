/** Reads a string `code` from an unknown thrown value (native SDKs throw coded errors). */
export function errorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  return undefined;
}
