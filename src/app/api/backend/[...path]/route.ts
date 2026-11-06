type RouteContext = { params: Promise<{ path: string[] }> };

const FORWARDED_HEADERS = ['accept', 'authorization', 'content-type', 'if-modified-since', 'if-none-match', 'range'];
const RESPONSE_HEADERS = ['accept-ranges', 'cache-control', 'content-disposition', 'content-range', 'content-type', 'etag', 'last-modified'];

async function proxy(request: Request, context: RouteContext) {
  const base = (process.env.READAGORA_API_URL || '').replace(/\/$/, '');
  if (!base) return Response.json({ error: 'ReadAgora API is not configured.' }, { status: 503 });

  let upstreamUrl: URL;
  try {
    const configured = new URL(base);
    if (!['http:', 'https:'].includes(configured.protocol)) throw new Error('Unsupported API protocol.');
    const { path } = await context.params;
    upstreamUrl = new URL(path.map(encodeURIComponent).join('/'), `${configured.href.replace(/\/$/, '')}/`);
    upstreamUrl.search = new URL(request.url).search;
  } catch {
    return Response.json({ error: 'ReadAgora API path is invalid.' }, { status: 400 });
  }

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const method = request.method.toUpperCase();
    const response = await fetch(upstreamUrl, {
      method,
      headers,
      ...(method === 'GET' || method === 'HEAD' ? {} : { body: await request.arrayBuffer() }),
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(60_000),
    });
    const responseHeaders = new Headers();
    for (const name of RESPONSE_HEADERS) {
      const value = response.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    return Response.json(
      { error: timedOut ? 'The ReadAgora server took too long to respond. Please try again.' : 'The ReadAgora server could not be reached. Check your connection and try again.' },
      { status: timedOut ? 504 : 502 },
    );
  }
}

export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
