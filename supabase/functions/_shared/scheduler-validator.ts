/**
 * Validates the X-Scheduler-Secret header for cron-triggered Edge Functions.
 * 
 * All cron-triggered functions must call this to ensure they're only
 * accessible by the internal system scheduler, not public callers.
 * 
 * Usage:
 * ```ts
 * import { validateSchedulerSecret, createSchedulerUnauthorizedResponse } from '../_shared/scheduler-validator.ts';
 * 
 * if (!validateSchedulerSecret(req)) {
 *   return createSchedulerUnauthorizedResponse(corsHeaders);
 * }
 * ```
 */

export function validateSchedulerSecret(req: Request): boolean {
  const secret = req.headers.get('X-Scheduler-Secret');
  const expectedSecret = Deno.env.get('SCHEDULER_SECRET');

  if (!expectedSecret) {
    // If no secret is configured, reject all requests (fail-closed)
    console.error('SCHEDULER_SECRET not configured — rejecting scheduler request');
    return false;
  }

  return secret === expectedSecret;
}

export function createSchedulerUnauthorizedResponse(
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ error: 'Unauthorized: invalid or missing scheduler secret' }),
    {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}
