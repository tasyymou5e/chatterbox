import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getCorsHeaders } from '../_shared/cors.ts'
import { cleanupLimiter, RateLimiter } from '../_shared/rate-limiter.ts'
import { 
  validateAdminJWT, 
  getServiceClient, 
  createUnauthorizedResponse,
  createForbiddenResponse
} from '../_shared/auth-validator.ts'

interface DeleteFamilyRequest {
  familyId: string;
}

interface DeleteFamilyResponse {
  success: boolean;
  familyDeleted: boolean;
  usersDeleted: number;
  authUsersDeleted: number;
  error?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Apply rate limiting for destructive operations
  const rateCheck = cleanupLimiter.check(req);
  if (!rateCheck.allowed) {
    console.warn('Rate limit exceeded for delete-family-comprehensive');
    return RateLimiter.createRateLimitResponse(rateCheck.resetTime);
  }

  try {
    // Validate admin JWT using getClaims() for fast local verification
    const auth = await validateAdminJWT(req);
    
    if (!auth.success) {
      console.error('Authentication failed:', auth.error);
      return createUnauthorizedResponse(auth.error || 'Unauthorized', corsHeaders);
    }
    
    if (!auth.isAdmin) {
      console.error('Admin access required for family deletion');
      return createForbiddenResponse('Admin access required', corsHeaders);
    }

    const supabase = getServiceClient();
    const { familyId }: DeleteFamilyRequest = await req.json();

    if (!familyId) {
      throw new Error('Family ID is required');
    }

    console.log(`Starting comprehensive deletion for family: ${familyId}`);

    // Get all family member user IDs before deletion
    const { data: members, error: membersError } = await supabase
      .from('family_members')
      .select('user_id')
      .eq('family_id', familyId);

    if (membersError) {
      console.error('Error fetching family members:', membersError);
      throw new Error(`Failed to fetch family members: ${membersError.message}`);
    }

    const userIds = members?.map(member => member.user_id) || [];
    console.log(`Found ${userIds.length} users to delete:`, userIds);

    // Delete family members first (foreign key constraint)
    const { error: membersDeleteError } = await supabase
      .from('family_members')
      .delete()
      .eq('family_id', familyId);

    if (membersDeleteError) {
      console.error('Error deleting family members:', membersDeleteError);
      throw new Error(`Failed to delete family members: ${membersDeleteError.message}`);
    }

    // Delete child accounts
    const { error: childAccountsError } = await supabase
      .from('child_accounts')
      .delete()
      .eq('family_id', familyId);

    if (childAccountsError) {
      console.error('Error deleting child accounts:', childAccountsError);
    }

    // Delete the family
    const { error: familyError } = await supabase
      .from('families')
      .delete()
      .eq('id', familyId);

    if (familyError) {
      console.error('Error deleting family:', familyError);
      throw new Error(`Failed to delete family: ${familyError.message}`);
    }

    // Delete user roles
    if (userIds.length > 0) {
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .in('user_id', userIds);

      if (rolesError) {
        console.error('Error deleting user roles:', rolesError);
      }
    }

    // Delete auth users
    let authUsersDeleted = 0;
    for (const userId of userIds) {
      try {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
        if (deleteError) {
          console.error(`Failed to delete auth user ${userId}:`, deleteError);
        } else {
          authUsersDeleted++;
          console.log(`Successfully deleted auth user: ${userId}`);
        }
      } catch (authError) {
        console.error(`Error deleting auth user ${userId}:`, authError);
      }
    }

    const response: DeleteFamilyResponse = {
      success: true,
      familyDeleted: true,
      usersDeleted: userIds.length,
      authUsersDeleted: authUsersDeleted
    };

    console.log('Comprehensive family deletion completed:', response);

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in delete-family-comprehensive function:', error);
    
    const response: DeleteFamilyResponse = {
      success: false,
      familyDeleted: false,
      usersDeleted: 0,
      authUsersDeleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    
    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})