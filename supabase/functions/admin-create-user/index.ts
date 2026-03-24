import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getCorsHeaders } from '../_shared/cors.ts';
import { validateJWT, getServiceClient, createUnauthorizedResponse } from '../_shared/auth-validator.ts';

interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  customPassword?: string;
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
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => chars.charCodeAt(byte % chars.length)).join('');
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase service client for admin operations
    const supabase = getServiceClient();

    // Validate JWT using getClaims() - local verification with asymmetric keys
    const auth = await validateJWT(req);
    if (!auth.success || !auth.userId) {
      return createUnauthorizedResponse(auth.error || 'Invalid authentication', corsHeaders);
    }

    const user = { id: auth.userId, email: auth.email };

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
    const { email, firstName, lastName, roles, customPassword }: CreateUserRequest = await req.json();

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

    // Use custom password or generate secure password
    const password = customPassword || generateSecurePassword();
    
    // Validate custom password if provided
    if (customPassword && customPassword.length < 8) {
      return new Response(JSON.stringify({ 
        error: 'Custom password must be at least 8 characters long.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create user via Supabase Auth Admin API
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        created_by_admin: true, // Prevent trigger from assigning default parent role
      }
    });

    if (createError) {
      console.error('User creation error:', createError);
      let errorMessage = 'Failed to create user';
      let errorCode = 'CREATION_FAILED';
      
      if (createError.message.includes('already registered')) {
        errorMessage = `A user with email "${email}" already exists. Please use a different email address.`;
        errorCode = 'EMAIL_EXISTS';
      } else if (createError.message.includes('password')) {
        errorMessage = 'Password does not meet security requirements. Please use a stronger password.';
        errorCode = 'WEAK_PASSWORD';
      } else if (createError.message.includes('email')) {
        errorMessage = 'Invalid email format provided.';
        errorCode = 'INVALID_EMAIL';
      }
      
      return new Response(JSON.stringify({ 
        error: errorMessage,
        code: errorCode,
        details: createError.message
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

    // Upsert profile (handle conflicts from trigger)
    // Note: email is stored in auth.users, not profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        user_id: newUser.user.id,
        first_name: firstName,
        last_name: lastName
      }, {
        onConflict: 'user_id'
      });

    if (profileError) {
      console.error('Profile upsert error:', profileError);
      // Don't fail the entire operation if profile upsert fails
    }

    // Verify the created_by_admin metadata was set
    console.log('User metadata after creation:', newUser.user.user_metadata);
    const createdByAdmin = newUser.user.user_metadata?.created_by_admin;
    if (!createdByAdmin) {
      console.warn('WARNING: created_by_admin metadata not found, manually cleaning up auto-assigned roles');
    }

    // Delete any conflicting roles first to prevent role conflicts
    const newAdminRoles = roles.filter(role => ['admin', 'read_only'].includes(role));
    const newFamilyRoles = roles.filter(role => ['parent', 'child'].includes(role));
    
    if (newAdminRoles.length > 0) {
      // Remove any family roles if assigning admin roles
      console.log('Removing family roles before assigning admin roles');
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', newUser.user.id)
        .in('role', ['parent', 'child']);
    }
    
    if (newFamilyRoles.length > 0) {
      // Remove any admin roles if assigning family roles
      console.log('Removing admin roles before assigning family roles');
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', newUser.user.id)
        .in('role', ['admin', 'read_only']);
    }

    // Also remove auto-assigned parent role if created_by_admin metadata wasn't set properly
    if (!createdByAdmin) {
      console.log('Fallback: Removing any auto-assigned parent role due to missing metadata');
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', newUser.user.id)
        .eq('role', 'parent');
    }

    // Assign roles with conflict handling
    const roleInserts = roles.map(role => ({
      user_id: newUser.user.id,
      role: role
    }));

    console.log('Assigning roles:', roles);
    const { error: rolesError } = await supabase
      .from('user_roles')
      .upsert(roleInserts, {
        onConflict: 'user_id, role'
      });

    if (rolesError) {
      console.error('Role assignment error:', rolesError);
      return new Response(JSON.stringify({ error: 'Failed to assign roles' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify roles were assigned correctly
    const { data: assignedRoles, error: verifyError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', newUser.user.id);

    if (verifyError) {
      console.error('Role verification error:', verifyError);
    } else {
      console.log('Successfully assigned roles:', assignedRoles?.map(r => r.role));
      
      // Double-check that requested roles match assigned roles
      const assignedRoleList = assignedRoles?.map(r => r.role) || [];
      const missingRoles = roles.filter(role => !assignedRoleList.includes(role));
      const extraRoles = assignedRoleList.filter(role => !roles.includes(role));
      
      if (missingRoles.length > 0) {
        console.error('Missing expected roles:', missingRoles);
      }
      if (extraRoles.length > 0) {
        console.warn('Unexpected extra roles found:', extraRoles);
      }
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
          password_generated: !customPassword,
          custom_password_used: !!customPassword
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
      // Password is intentionally NOT returned in the response for security.
      // Admin should use the "send welcome email" flow or password reset.
      passwordGenerated: true
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
