/**
 * Checks if an error is a network-level failure (not an auth/server error).
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === "Failed to fetch") return true;
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error && /network|ECONNREFUSED|ERR_NETWORK/i.test(error.message)) return true;
  return false;
}

/**
 * Lightweight reachability check against the Supabase REST endpoint.
 * Returns true if backend responds within timeout.
 */
export async function checkBackendReachable(timeoutMs = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`;
    const res = await fetch(url, {
      method: "HEAD",
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      signal: controller.signal,
    });
    clearTimeout(id);
    return res.ok || res.status === 400; // 400 means it responded
  } catch {
    return false;
  }
}
