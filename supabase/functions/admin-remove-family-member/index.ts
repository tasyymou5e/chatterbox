import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { getCorsHeaders } from '../_shared/cors.ts'
import { adminActionLimiter, RateLimiter } from '../_shared/rate-limiter.ts'

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Apply rate limiting
  const rateCheck = adminActionLimiter.check(req);
  if (!rateCheck.allowed) {
    console.warn('Rate limit exceeded for admin-remove-family-member');
    return RateLimiter.createRateLimitResponse(rateCheck.resetTime);
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the current user from the JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify JWT and get user
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin role using security definer function
    const { data: isAdmin, error: roleError } = await supabase
      .rpc('check_admin_role_secure', { p_user_id: user.id })

    if (roleError) {
      console.error('Error checking admin role:', roleError)
      return new Response(
        JSON.stringify({ error: 'Authentication error. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isAdmin) {
      console.error('Access denied - user is not admin:', user.email)
      return new Response(
        JSON.stringify({ error: 'Access denied. Admin role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { familyId, userId, userEmail, userName } = await req.json()

    if (!familyId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: familyId, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify family exists
    const { data: family, error: familyError } = await supabase
      .from('families')
      .select('id, display_name, created_by')
      .eq('id', familyId)
      .single()

    if (familyError || !family) {
      console.error('Family not found:', familyError)
      return new Response(
        JSON.stringify({ error: 'Family not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the family member record before deletion
    const { data: memberToRemove, error: memberError } = await supabase
      .from('family_members')
      .select('id, role, joined_at, connection_metadata')
      .eq('family_id', familyId)
      .eq('user_id', userId)
      .single()

    if (memberError || !memberToRemove) {
      console.error('Family member not found:', memberError)
      return new Response(
        JSON.stringify({ error: 'Family member not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prevent removal of family creator unless it's by another admin
    if (userId === family.created_by && user.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Cannot remove family creator. Family creators can only be removed by themselves.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Remove the family member
    const { error: deleteError } = await supabase
      .from('family_members')
      .delete()
      .eq('family_id', familyId)
      .eq('user_id', userId)

    if (deleteError) {
      console.error('Error removing family member:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to remove family member: ' + deleteError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log the admin action
    const { error: auditError } = await supabase
      .from('admin_audit_logs')
      .insert({
        admin_user_id: user.id,
        operation_type: 'family_member_removed',
        target_table: 'family_members',
        target_id: memberToRemove.id,
        old_values: {
          family_id: familyId,
          user_id: userId,
          role: memberToRemove.role,
          target_user_email: userEmail,
          target_user_name: userName,
          family_name: family.display_name,
          member_since: memberToRemove.joined_at
        },
        metadata: {
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown'
        }
      })

    if (auditError) {
      console.error('Error logging audit trail:', auditError)
      // Don't fail the request for audit logging errors
    }

    // Log security event for monitoring
    const { error: securityLogError } = await supabase
      .rpc('log_security_event', {
        p_user_id: user.id,
        p_event_type: 'admin_family_member_removed',
        p_severity: 'info',
        p_event_details: {
          family_id: familyId,
          family_name: family.display_name,
          target_user_id: userId,
          target_user_email: userEmail,
          removed_role: memberToRemove.role,
          success: true
        }
      })

    if (securityLogError) {
      console.error('Error logging security event:', securityLogError)
      // Don't fail the request for security logging errors
    }

    console.log(`Admin ${user.email} successfully removed ${userEmail} from family ${family.display_name}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Successfully removed ${userEmail} from ${family.display_name}` 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Function error:', message)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
