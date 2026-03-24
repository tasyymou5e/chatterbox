import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getCorsHeaders } from '../_shared/cors.ts'
import { cleanupLimiter, RateLimiter } from '../_shared/rate-limiter.ts'
import { 
  validateAdminJWT, 
  getServiceClient, 
  createUnauthorizedResponse,
  createForbiddenResponse
} from '../_shared/auth-validator.ts'
import { withWideEvent } from '../_shared/wide-event.ts'

interface DeleteUserRequest {
  userId: string;
  userEmail?: string;
}

interface DeleteUserResponse {
  success: boolean;
  deletedRecords: {
    userRoles: number;
    familyMembers: number;
    childAccounts: number;
    profiles: number;
    authUser: boolean;
  };
  error?: string;
}

serve(withWideEvent('admin-delete-user', async (req, wideEvent) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const rateCheck = cleanupLimiter.check(req);
  if (!rateCheck.allowed) {
    return RateLimiter.createRateLimitResponse(rateCheck.resetTime, corsHeaders);
  }

  try {
    const auth = await validateAdminJWT(req);
    
    if (!auth.success) {
      return createUnauthorizedResponse(auth.error || 'Unauthorized', corsHeaders);
    }
    
    if (!auth.isAdmin) {
      return createForbiddenResponse('Admin access required', corsHeaders);
    }

    const { userId, userEmail }: DeleteUserRequest = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    wideEvent.admin_user_id = auth.userId;
    wideEvent.target_user_id = userId;
    wideEvent.target_user_email = userEmail;

    const supabase = getServiceClient();
    const deletedRecords = {
      userRoles: 0,
      familyMembers: 0,
      childAccounts: 0,
      profiles: 0,
      authUser: false,
    };

    // 1. Delete user_roles
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .select('id');

    if (rolesError) wideEvent.roles_delete_error = rolesError.message;
    else deletedRecords.userRoles = rolesData?.length || 0;

    // 2. Delete family_members
    const { data: membersData, error: membersError } = await supabase
      .from('family_members')
      .delete()
      .eq('user_id', userId)
      .select('id');

    if (membersError) wideEvent.members_delete_error = membersError.message;
    else deletedRecords.familyMembers = membersData?.length || 0;

    // 3. Delete child_accounts
    const { data: childData, error: childError } = await supabase
      .from('child_accounts')
      .delete()
      .eq('user_id', userId)
      .select('id');

    if (childError) wideEvent.child_delete_error = childError.message;
    else deletedRecords.childAccounts = childData?.length || 0;

    // 4. Delete profiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId)
      .select('id');

    if (profileError) wideEvent.profile_delete_error = profileError.message;
    else deletedRecords.profiles = profileData?.length || 0;

    // 5. Delete auth user
    try {
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) {
        wideEvent.auth_delete_error = authError.message;
      } else {
        deletedRecords.authUser = true;
      }
    } catch (authErr) {
      wideEvent.auth_delete_error = authErr instanceof Error ? authErr.message : String(authErr);
    }

    // 6. Audit log
    try {
      await supabase.from('admin_audit_logs').insert({
        admin_user_id: auth.userId!,
        operation_type: 'delete_user',
        target_id: userId,
        target_table: 'auth.users',
        metadata: { userEmail, deletedRecords },
      });
    } catch (auditErr) {
      wideEvent.audit_log_error = auditErr instanceof Error ? auditErr.message : String(auditErr);
    }

    const response: DeleteUserResponse = {
      success: true,
      deletedRecords,
    };

    wideEvent.deleted_records = deletedRecords;

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    wideEvent.error = error instanceof Error ? error.message : String(error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        deletedRecords: { userRoles: 0, familyMembers: 0, childAccounts: 0, profiles: 0, authUser: false },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}));