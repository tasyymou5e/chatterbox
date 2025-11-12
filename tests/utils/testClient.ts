import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = "https://lxuqfgbukrrickanmmic.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4dXFmZ2J1a3JyaWNrYW5tbWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzOTQyMTgsImV4cCI6MjA3MTk3MDIxOH0.OonibLO1o5uCtVX2EHeCLCWcBbF64oYGmE4IK1ZfcQE";

// Service role key should be set in environment variables for tests
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Create an anonymous Supabase client (no authentication)
 */
export function getAnonClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * Create a Supabase client with service role privileges
 * WARNING: This bypasses RLS - only use for test setup/cleanup
 */
export function getServiceRoleClient(): SupabaseClient<Database> {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not set in environment');
  }
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create an authenticated Supabase client for a specific user
 * This simulates a logged-in user and will respect RLS policies
 */
export function getClientForUser(accessToken: string): SupabaseClient<Database> {
  const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Set the session manually
  client.auth.setSession({
    access_token: accessToken,
    refresh_token: 'test-refresh-token',
  });
  
  return client;
}

/**
 * Sign in a test user and return authenticated client
 */
export async function signInTestUser(
  email: string,
  password: string
): Promise<{ client: SupabaseClient<Database>; userId: string; accessToken: string }> {
  const client = getAnonClient();
  
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error || !data.session) {
    throw new Error(`Failed to sign in test user: ${error?.message}`);
  }
  
  return {
    client: getClientForUser(data.session.access_token),
    userId: data.user.id,
    accessToken: data.session.access_token,
  };
}
