/**
 * Wide event middleware for Deno edge functions.
 *
 * Wraps a handler in try/catch/finally, accumulates context,
 * and emits a single JSON log line at request completion.
 *
 * Usage:
 * ```ts
 * import { withWideEvent } from '../_shared/wide-event.ts';
 * serve(withWideEvent('my-function', async (req, wideEvent) => {
 *   wideEvent.user = { id: userId };
 *   return new Response(JSON.stringify({ ok: true }), { status: 200 });
 * }));
 * ```
 */

export interface WideEvent {
  [key: string]: unknown;
}

type HandlerFn = (
  req: Request,
  wideEvent: WideEvent,
) => Promise<Response> | Response;

export function withWideEvent(
  functionName: string,
  handler: HandlerFn,
): (req: Request) => Promise<Response> {
  // Capture environment once at startup
  const envContext: Record<string, unknown> = {
    service: functionName,
    runtime: 'deno',
    deno_version: typeof Deno !== 'undefined' ? Deno.version?.deno : 'unknown',
    region: typeof Deno !== 'undefined' ? (Deno.env?.get?.('DENO_REGION') ?? Deno.env?.get?.('AWS_REGION') ?? 'unknown') : 'unknown',
  };

  return async (req: Request): Promise<Response> => {
    const startTime = Date.now();
    const url = new URL(req.url);

    const wideEvent: WideEvent = {
      request_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      method: req.method,
      path: url.pathname,
      user_agent: req.headers.get('user-agent'),
      ...envContext,
    };

    let response: Response;

    try {
      response = await handler(req, wideEvent);
      wideEvent.status_code = response.status;
      wideEvent.outcome = response.status < 400 ? 'success' : 'error';
    } catch (error: unknown) {
      wideEvent.status_code = 500;
      wideEvent.outcome = 'error';
      if (error instanceof Error) {
        wideEvent.error = { type: error.name, message: error.message };
      } else {
        wideEvent.error = { type: 'Unknown', message: String(error) };
      }
      // Re-throw so the Deno runtime handles it, but we still log below
      response = new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    } finally {
      wideEvent.duration_ms = Date.now() - startTime;
      // Single canonical log line per request
      console.log(JSON.stringify(wideEvent));
    }

    return response;
  };
}
