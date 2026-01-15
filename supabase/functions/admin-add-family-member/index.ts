import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    const { familyId, userId, role, userEmail, userName } = await req.json()

    if (!familyId || !userId || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: familyId, userId, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate role
    const validRoles = ['parent', 'child', 'therapist', 'teacher', 'grandparent', 'family_friend']
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role specified' }),
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

    // Verify target user exists
    const { data: targetUser, error: targetUserError } = await supabase
      .from('profiles')
      .select('user_id, email')
      .eq('user_id', userId)
      .single()

    if (targetUserError || !targetUser) {
      console.error('Target user not found:', targetUserError)
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is already a family member
    const { data: existingMember, error: memberCheckError } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_id', familyId)
      .eq('user_id', userId)
      .single()

    if (existingMember) {
      return new Response(
        JSON.stringify({ error: 'User is already a member of this family' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Add the user to the family
    const { data: newMember, error: insertError } = await supabase
      .from('family_members')
      .insert({
        family_id: familyId,
        user_id: userId,
        role: role,
        invited_by: user.id,
        connection_metadata: {
          added_by_admin: true,
          admin_user_id: user.id,
          admin_email: user.email,
          added_at: new Date().toISOString()
        }
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error adding family member:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to add family member: ' + insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log the admin action
    const { error: auditError } = await supabase
      .from('admin_audit_logs')
      .insert({
        admin_user_id: user.id,
        operation_type: 'family_member_added',
        target_table: 'family_members',
        target_id: newMember.id,
        new_values: {
          family_id: familyId,
          user_id: userId,
          role: role,
          target_user_email: userEmail,
          target_user_name: userName,
          family_name: family.display_name
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
        p_event_type: 'admin_family_member_added',
        p_severity: 'info',
        p_event_details: {
          family_id: familyId,
          family_name: family.display_name,
          target_user_id: userId,
          target_user_email: userEmail,
          assigned_role: role,
          success: true
        }
      })

    if (securityLogError) {
      console.error('Error logging security event:', securityLogError)
      // Don't fail the request for security logging errors
    }

    console.log(`Admin ${user.email} successfully added ${userEmail} to family ${family.display_name} as ${role}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        member: newMember,
        message: `Successfully added ${userEmail} to ${family.display_name} as ${role}` 
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