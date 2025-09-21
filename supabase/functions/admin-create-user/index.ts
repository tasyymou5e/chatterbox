import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

// Rate limiter for admin actions
const adminActionAttempts = new Map<string, { count: number; resetTime: number }>();
const ADMIN_RATE_LIMIT = 10; // max 10 user creations per hour per admin
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userAttempts = adminActionAttempts.get(userId);
  
  if (!userAttempts || now > userAttempts.resetTime) {
    adminActionAttempts.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (userAttempts.count >= ADMIN_RATE_LIMIT) {
    return false;
  }
  
  userAttempts.count++;
  return true;
}

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the user is authenticated and get their session
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: isAdmin, error: roleError } = await supabase
      .rpc('check_admin_role_secure', { p_user_id: user.id });

    if (roleError || !isAdmin) {
      console.error('Admin role check failed:', roleError);
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check rate limit
    if (!checkRateLimit(user.id)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { email, firstName, lastName, roles }: CreateUserRequest = await req.json();

    // Validate input
    if (!email || !firstName || !lastName || !roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate roles
    const validRoles = ['admin', 'parent', 'child', 'read_only'];
    const invalidRoles = roles.filter(role => !validRoles.includes(role));
    if (invalidRoles.length > 0) {
      return new Response(JSON.stringify({ error: `Invalid roles: ${invalidRoles.join(', ')}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check for role conflicts
    const adminRoles = roles.filter(role => ['admin', 'read_only'].includes(role));
    const familyRoles = roles.filter(role => ['parent', 'child'].includes(role));
    
    if (adminRoles.length > 0 && familyRoles.length > 0) {
      return new Response(JSON.stringify({ 
        error: 'Role conflict: Users cannot have both admin roles and family roles. Admin roles cannot join families.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (adminRoles.length > 1) {
      return new Response(JSON.stringify({ 
        error: 'Role conflict: Users can only have one admin role.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (familyRoles.length > 1) {
      return new Response(JSON.stringify({ 
        error: 'Role conflict: Users can only have one family role.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate secure password
    const password = generateSecurePassword();

    // Create user via Supabase Auth Admin API
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      }
    });

    if (createError) {
      console.error('User creation error:', createError);
      return new Response(JSON.stringify({ 
        error: createError.message.includes('already registered') 
          ? 'User with this email already exists' 
          : 'Failed to create user'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!newUser.user) {
      return new Response(JSON.stringify({ error: 'User creation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: newUser.user.id,
        first_name: firstName,
        last_name: lastName,
        email: email
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Don't fail the entire operation if profile creation fails
    }

    // Assign roles
    const roleInserts = roles.map(role => ({
      user_id: newUser.user.id,
      role: role
    }));

    const { error: rolesError } = await supabase
      .from('user_roles')
      .insert(roleInserts);

    if (rolesError) {
      console.error('Role assignment error:', rolesError);
      return new Response(JSON.stringify({ error: 'Failed to assign roles' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log admin activity
    await supabase
      .from('admin_audit_logs')
      .insert({
        admin_user_id: user.id,
        operation_type: 'user_creation',
        target_table: 'profiles',
        target_id: newUser.user.id,
        new_values: {
          email,
          first_name: firstName,
          last_name: lastName,
          roles
        },
        metadata: {
          created_via: 'admin_portal',
          password_generated: true
        }
      });

    // Log security event
    await supabase.rpc('log_security_event', {
      p_user_id: user.id,
      p_event_type: 'admin_user_created',
      p_severity: 'medium',
      p_event_details: {
        created_user_id: newUser.user.id,
        created_user_email: email,
        assigned_roles: roles,
        admin_user_id: user.id
      }
    });

    return new Response(JSON.stringify({ 
      success: true,
      user: {
        id: newUser.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        roles
      },
      password // Return password for admin to share with new user
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error in admin-create-user:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});