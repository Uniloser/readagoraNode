const AUTH_REQUEST_TIMEOUT_MS = 60_000;
const AUTH_RETRY_DELAY_MS = 900;

/** Retry one transient backend failure for the web auth proxy. */
export async function fetchAuthUpstream(url: string, init: RequestInit): Promise<Response> {
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...init,
        cache: 'no-store',
        signal: AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS),
      });

      if (response.status < 500 || attempt === 1) return response;
      lastResponse = response;
    } catch (error) {
      if (attempt === 1) throw error;
    }

    await new Promise(resolve => setTimeout(resolve, AUTH_RETRY_DELAY_MS));
  }

  if (lastResponse) return lastResponse;
  throw new Error('The ReadAgora auth backend request failed.');
}
