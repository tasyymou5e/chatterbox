import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

export interface AuthResult {
  success: boolean;
  userId?: string;
  email?: string;
  role?: string;
  error?: string;
}

export interface AdminAuthResult extends AuthResult {
  isAdmin?: boolean;
}

/**
 * Validate JWT using asymmetric signing keys (getClaims)
 * This is faster than getUser() as it doesn't require a network call to the auth server
 * 
 * @param req - The incoming request with Authorization header
 * @returns AuthResult with user information or error
 */
export async function validateJWT(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return { success: false, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  try {
    const { data, error } = await supabase.auth.getClaims(token);
    
    if (error || !data?.claims) {
      return { success: false, error: error?.message || 'Invalid token' };
    }

    return {
      success: true,
      userId: data.claims.sub as string,
      email: data.claims.email as string,
      role: data.claims.role as string,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Token validation failed' };
  }
}

/**
 * Validate JWT and verify admin role
 * Uses getClaims() for fast token verification, then checks admin role via RPC
 * 
 * @param req - The incoming request with Authorization header
 * @returns AdminAuthResult with admin status
 */
export async function validateAdminJWT(req: Request): Promise<AdminAuthResult> {
  const authResult = await validateJWT(req);
  
  if (!authResult.success || !authResult.userId) {
    return { ...authResult, isAdmin: false };
  }

  // Check admin role using service client
  const serviceClient = getServiceClient();
  const { data: isAdmin, error: roleError } = await serviceClient
    .rpc('check_admin_role_secure', { p_user_id: authResult.userId });

  if (roleError) {
    return { 
      success: false, 
      error: 'Failed to verify admin role',
      userId: authResult.userId,
      isAdmin: false 
    };
  }

  return {
    ...authResult,
    isAdmin: !!isAdmin,
  };
}

/**
 * Get a service role client for admin operations (bypasses RLS)
 * Use with caution - only for operations that require elevated privileges
 */
export function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

/**
 * Get a user-scoped client that respects RLS
 * Uses the provided auth header to scope queries to the authenticated user
 */
export function getUserClient(authHeader: string): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
}

/**
 * Create a standard unauthorized response
 */
export function createUnauthorizedResponse(
  error: string,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ error }),
    { 
      status: 401, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

/**
 * Create a standard forbidden response
 */
export function createForbiddenResponse(
  error: string,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({ error }),
    { 
      status: 403, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}
