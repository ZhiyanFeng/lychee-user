import axios from 'axios';

/**
 * Pulls a human-readable message out of anything `apiService`/axios might
 * throw — a backend `ApiResponse.message`, a plain network/axios error, or
 * an already-plain `Error` — falling back to `fallback` if nothing usable
 * is found. Shared by `src/api/media.ts` and `src/api/rfq.ts` so both
 * surface consistent error text to the wizard's per-step error banners.
 */
export function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const backendMessage = (error.response?.data as { message?: string } | undefined)?.message;
    if (backendMessage) return backendMessage;
    if (error.message) return error.message;
  } else if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
