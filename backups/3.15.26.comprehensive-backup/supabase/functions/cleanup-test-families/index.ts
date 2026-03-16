import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getCorsHeaders } from '../_shared/cors.ts'
import { cleanupLimiter, RateLimiter } from '../_shared/rate-limiter.ts'
import { 
  validateAdminJWT, 
  getServiceClient, 
  createUnauthorizedResponse,
  createForbiddenResponse
} from '../_shared/auth-validator.ts'

interface CleanupResponse {
  success: boolean;
  familiesDeleted: number;
  usersDeleted: number;
  authUsersDeleted: number;
  childAccountsDeleted: number;
  details?: unknown;
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
    console.warn('Rate limit exceeded for cleanup-test-families');
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
      console.error('Admin access required for cleanup operations');
      return createForbiddenResponse('Admin access required', corsHeaders);
    }

    const supabase = getServiceClient();

    console.log('Starting cleanup of test families...');

    // Call the database cleanup function
    const { data: cleanupData, error: cleanupError } = await supabase.rpc('cleanup_test_families');
    
    if (cleanupError) {
      console.error('Database cleanup error:', cleanupError);
      throw new Error(`Database cleanup failed: ${cleanupError.message}`);
    }

    let authUsersDeleted = 0;
    let childAccountsDeleted = 0;
    let cleanupDetails = null;

    if (cleanupData && cleanupData.length > 0) {
      const result = cleanupData[0];
      cleanupDetails = result.cleanup_details;
      childAccountsDeleted = cleanupDetails?.child_accounts_deleted || 0;
      
      console.log('Database cleanup completed:', {
        familiesDeleted: result.families_deleted,
        usersDeleted: result.users_deleted,
        childAccountsDeleted: childAccountsDeleted
      });

      // Delete auth users (database function can't do this directly)
      const userIds = cleanupDetails.test_user_ids || [];
      
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

      const response: CleanupResponse = {
        success: true,
        familiesDeleted: result.families_deleted || 0,
        usersDeleted: result.users_deleted || 0,
        authUsersDeleted: authUsersDeleted,
        childAccountsDeleted: childAccountsDeleted,
        details: {
          timestamp: new Date().toISOString(),
          cleanupDetails: cleanupDetails
        }
      };

      console.log('Cleanup operation completed successfully:', response);

      return new Response(
        JSON.stringify(response),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      // No test families to cleanup
      const response: CleanupResponse = {
        success: true,
        familiesDeleted: 0,
        usersDeleted: 0,
        authUsersDeleted: 0,
        childAccountsDeleted: 0,
        details: {
          message: 'No test families found to cleanup',
          timestamp: new Date().toISOString()
        }
      };

      console.log('No test families found to cleanup');

      return new Response(
        JSON.stringify(response),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

  } catch (error) {
    console.error('Error in cleanup-test-families function:', error);
    
    const response: CleanupResponse = {
      success: false,
      familiesDeleted: 0,
      usersDeleted: 0,
      authUsersDeleted: 0,
      childAccountsDeleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    
    return new Response(
      JSON.stringify(response),
      {
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})