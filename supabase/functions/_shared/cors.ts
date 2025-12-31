// Allowed origins for CORS - add your production domains here
const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'https://*.lovable.dev',
  'https://*.lovableproject.com',
  'https://lxuqfgbukrrickanmmic.supabase.co',
];

// Development origins (only active in non-production)
const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8080',
];

/**
 * Check if an origin matches an allowed pattern (supports wildcard subdomains)
 */
function matchesOrigin(origin: string, pattern: string): boolean {
  if (pattern.includes('*')) {
    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars except *
      .replace(/\*/g, '[a-zA-Z0-9-]+'); // Replace * with valid subdomain pattern
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(origin);
  }
  return origin === pattern;
}

/**
 * Get CORS headers with validated origin
 */
export function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  const allAllowedOrigins = [...ALLOWED_ORIGINS, ...DEV_ORIGINS];
  
  let allowedOrigin = ALLOWED_ORIGINS[0]; // Default to first production origin
  
  if (requestOrigin) {
    const isAllowed = allAllowedOrigins.some(pattern => matchesOrigin(requestOrigin, pattern));
    if (isAllowed) {
      allowedOrigin = requestOrigin;
    }
  }
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Legacy export for backward compatibility - uses first allowed origin
// DEPRECATED: Use getCorsHeaders(request.headers.get('origin')) instead
export const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};
