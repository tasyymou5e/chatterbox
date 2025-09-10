import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'
import { corsHeaders } from '../_shared/cors.ts'
import { adminActionLimiter, passwordResetLimiter, RateLimiter } from '../_shared/rate-limiter.ts'
import { PasswordValidator } from '../_shared/password-validator.ts'

console.log('Admin update user function initialized')

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Apply rate limiting for admin actions
  const adminRateCheck = adminActionLimiter.check(req);
  if (!adminRateCheck.allowed) {
    console.warn('Admin action rate limit exceeded');
    return RateLimiter.createRateLimitResponse(adminRateCheck.resetTime);
  }

  // Apply stricter rate limiting for password resets specifically
  const passwordRateCheck = passwordResetLimiter.check(req);
  if (!passwordRateCheck.allowed) {
    console.warn('Password reset rate limit exceeded');
    return RateLimiter.createRateLimitResponse(passwordRateCheck.resetTime);
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('Missing authorization header')
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with anon key for user verification
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    })

    // Set the auth token for the current user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !currentUser) {
      console.error('Invalid user token:', userError)
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin role using security definer function
    const { data: isAdmin, error: roleError } = await supabase
      .rpc('check_admin_role_secure', { p_user_id: currentUser.id })

    if (roleError) {
      console.error('Error checking admin role:', roleError)
      return new Response(
        JSON.stringify({ error: 'Authentication error. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isAdmin) {
      console.error('Access denied - user is not admin:', currentUser.email)
      return new Response(
        JSON.stringify({ error: 'Access denied. Admin role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { userId, newPassword, forcePasswordChange = false } = await req.json()

    if (!userId || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, newPassword' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enhanced password validation
    const passwordValidation = PasswordValidator.validate(newPassword);
    if (!passwordValidation.isValid) {
      return new Response(
        JSON.stringify({ 
          error: 'Password does not meet security requirements',
          details: passwordValidation.feedback,
          strength: PasswordValidator.getStrengthDescription(passwordValidation.score),
          suggestions: PasswordValidator.generateSuggestions()
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client with service role key
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    })

    console.log('Attempting to update password for user:', userId)

    // Update user password using admin API
    const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      {
        password: newPassword,
        user_metadata: {
          password_reset_required: forcePasswordChange
        }
      }
    )

    if (updateError) {
      console.error('Failed to update user password:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update password: ' + updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Successfully updated password for user:', userId)

    // Log the password reset activity
    try {
      await supabase
        .from('user_activity_logs')
        .insert({
          user_id: userId,
          activity_type: 'admin_password_reset',
          success: true,
          metadata: {
            reset_by_admin: currentUser.id,
            reset_by_email: currentUser.email,
            timestamp: new Date().toISOString(),
            force_password_change: forcePasswordChange
          }
        })

      console.log('Activity logged successfully')
    } catch (logError) {
      console.error('Failed to log activity:', logError)
      // Don't fail the request if logging fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password updated successfully',
        user: {
          id: updatedUser.user.id,
          email: updatedUser.user.email
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Unexpected error in admin-update-user:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})