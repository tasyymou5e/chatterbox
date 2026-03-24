import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getCorsHeaders } from '../_shared/cors.ts';
import { adminActionLimiter, RateLimiter } from '../_shared/rate-limiter.ts';
import {
  validateAdminJWT,
  getServiceClient,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from '../_shared/auth-validator.ts';
import { withWideEvent } from '../_shared/wide-event.ts';

interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  customPassword?: string;
}

const VALID_ROLES = ['admin', 'parent', 'child', 'read_only'] as const;

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => chars[byte % chars.length]).join('');
}

function validateCreateUserInput(body: CreateUserRequest): string | null {
  const { email, firstName, lastName, roles, customPassword } = body;

  if (!email || !firstName || !lastName || !roles || roles.length === 0) {
    return 'Missing required fields: email, firstName, lastName, roles';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Invalid email format';
  }

  const invalidRoles = roles.filter(role => !VALID_ROLES.includes(role as typeof VALID_ROLES[number]));
  if (invalidRoles.length > 0) {
    return `Invalid roles: ${invalidRoles.join(', ')}`;
  }

  const adminRoles = roles.filter(role => ['admin', 'read_only'].includes(role));
  const familyRoles = roles.filter(role => ['parent', 'child'].includes(role));

  if (adminRoles.length > 0 && familyRoles.length > 0) {
    return 'Role conflict: Users cannot have both admin roles and family roles.';
  }
  if (adminRoles.length > 1) {
    return 'Role conflict: Users can only have one admin role.';
  }
  if (familyRoles.length > 1) {
    return 'Role conflict: Users can only have one family role.';
  }

  if (customPassword && customPassword.length < 8) {
    return 'Custom password must be at least 8 characters long.';
  }

  return null;
}

serve(withWideEvent('admin-create-user', async (req, wideEvent) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limit using shared limiter
  const rateCheck = adminActionLimiter.check(req);
  if (!rateCheck.allowed) {
    return RateLimiter.createRateLimitResponse(rateCheck.resetTime, corsHeaders);
  }

  // Auth: use shared validateAdminJWT (validates JWT + checks admin role in one call)
  const auth = await validateAdminJWT(req);
  if (!auth.success) {
    return createUnauthorizedResponse(auth.error || 'Invalid authentication', corsHeaders);
  }
  if (!auth.isAdmin) {
    return createForbiddenResponse('Admin access required', corsHeaders);
  }

  wideEvent.admin_user_id = auth.userId;

  const supabase = getServiceClient();
  const body: CreateUserRequest = await req.json();

  // Validate input
  const validationError = validateCreateUserInput(body);
  if (validationError) {
    return new Response(JSON.stringify({ error: validationError }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { email, firstName, lastName, roles, customPassword } = body;
  const password = customPassword || generateSecurePassword();

  wideEvent.target_email = email;
  wideEvent.assigned_roles = roles;

  // Create user via Supabase Auth Admin API
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      created_by_admin: true,
    },
  });

  if (createError) {
    let errorMessage = 'Failed to create user';
    let errorCode = 'CREATION_FAILED';

    if (createError.message.includes('already registered')) {
      errorMessage = `A user with email "${email}" already exists.`;
      errorCode = 'EMAIL_EXISTS';
    } else if (createError.message.includes('password')) {
      errorMessage = 'Password does not meet security requirements.';
      errorCode = 'WEAK_PASSWORD';
    } else if (createError.message.includes('email')) {
      errorMessage = 'Invalid email format provided.';
      errorCode = 'INVALID_EMAIL';
    }

    wideEvent.error = { code: errorCode, message: createError.message };
    return new Response(
      JSON.stringify({ error: errorMessage, code: errorCode, details: createError.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!newUser.user) {
    return new Response(JSON.stringify({ error: 'User creation failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  wideEvent.created_user_id = newUser.user.id;

  // Upsert profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ user_id: newUser.user.id, first_name: firstName, last_name: lastName }, { onConflict: 'user_id' });

  if (profileError) {
    wideEvent.profile_upsert_error = profileError.message;
  }

  // Clean up conflicting roles before assignment
  const isAdminRole = roles.some(r => ['admin', 'read_only'].includes(r));
  const isFamilyRole = roles.some(r => ['parent', 'child'].includes(r));

  if (isAdminRole) {
    await supabase.from('user_roles').delete().eq('user_id', newUser.user.id).in('role', ['parent', 'child']);
  }
  if (isFamilyRole) {
    await supabase.from('user_roles').delete().eq('user_id', newUser.user.id).in('role', ['admin', 'read_only']);
  }

  // Also clean up auto-assigned parent role from trigger
  if (!newUser.user.user_metadata?.created_by_admin) {
    await supabase.from('user_roles').delete().eq('user_id', newUser.user.id).eq('role', 'parent');
  }

  // Assign roles with conflict handling
  const roleInserts = roles.map(role => ({ user_id: newUser.user.id, role }));
  const { error: rolesError } = await supabase
    .from('user_roles')
    .upsert(roleInserts, { onConflict: 'user_id, role' });

  if (rolesError) {
    wideEvent.role_assignment_error = rolesError.message;
    return new Response(JSON.stringify({ error: 'Failed to assign roles' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify roles
  const { data: assignedRoles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', newUser.user.id);

  wideEvent.verified_roles = assignedRoles?.map(r => r.role);

  // Log admin activity
  await supabase.from('admin_audit_logs').insert({
    admin_user_id: auth.userId!,
    operation_type: 'user_creation',
    target_table: 'profiles',
    target_id: newUser.user.id,
    new_values: { email, first_name: firstName, last_name: lastName, roles },
    metadata: { created_via: 'admin_portal', password_generated: !customPassword },
  });

  // Log security event
  await supabase.rpc('log_security_event', {
    p_user_id: auth.userId!,
    p_event_type: 'admin_user_created',
    p_severity: 'medium',
    p_event_details: {
      created_user_id: newUser.user.id,
      created_user_email: email,
      assigned_roles: roles,
      admin_user_id: auth.userId,
    },
  });

  return new Response(
    JSON.stringify({
      success: true,
      user: { id: newUser.user.id, email, first_name: firstName, last_name: lastName, roles },
      passwordGenerated: true,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}));
