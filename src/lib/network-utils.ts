/**
 * Checks if an error is a network-level failure (not an auth/server error).
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === "Failed to fetch") return true;
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error && /network|ECONNREFUSED|ERR_NETWORK/i.test(error.message)) return true;
  return false;
}
