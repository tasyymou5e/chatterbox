import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { getCorsHeaders } from '../_shared/cors.ts'
import { adminActionLimiter, passwordResetLimiter } from '../_shared/rate-limiter.ts'
import { PasswordValidator } from '../_shared/password-validator.ts'
import { validateJWT, getServiceClient, createUnauthorizedResponse } from '../_shared/auth-validator.ts'

console.log('Admin update user function initialized')

Deno.serve(async (req) => {
  // Get origin-specific CORS headers for security
  const origin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin)
  
  // Log request for debugging (no sensitive data)
  console.log('Request received:', {
    method: req.method,
    origin: origin,
    url: req.url
  })

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: { ...corsHeaders, 'Vary': 'Origin' } 
    })
  }

  // Apply rate limiting for admin actions
  const adminRateCheck = adminActionLimiter.check(req);
  if (!adminRateCheck.allowed) {
    console.warn('Admin action rate limit exceeded');
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
      { 
        status: 429, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((adminRateCheck.resetTime - Date.now()) / 1000)),
          'Vary': 'Origin'
        } 
      }
    );
  }

  // Apply stricter rate limiting for password resets specifically
  const passwordRateCheck = passwordResetLimiter.check(req);
  if (!passwordRateCheck.allowed) {
    console.warn('Password reset rate limit exceeded');
    return new Response(
      JSON.stringify({ error: 'Too many password reset attempts. Please try again later.' }),
      { 
        status: 429, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((passwordRateCheck.resetTime - Date.now()) / 1000)),
          'Vary': 'Origin'
        } 
      }
    );
  }

  try {
    // Validate JWT using getClaims() - local verification with asymmetric keys
    const auth = await validateJWT(req);
    if (!auth.success || !auth.userId) {
      console.error('JWT validation failed:', auth.error)
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Vary': 'Origin' } }
      )
    }

    const currentUser = { id: auth.userId, email: auth.email };

    // Get service client for admin operations
    const supabase = getServiceClient();

    // Verify admin role using security definer function
    const { data: isAdmin, error: roleError } = await supabase
      .rpc('check_admin_role_secure', { p_user_id: currentUser.id })

    if (roleError) {
      console.error('Error checking admin role:', roleError)
      return new Response(
        JSON.stringify({ error: 'Authentication error. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Vary': 'Origin' } }
      )
    }

    if (!isAdmin) {
      console.error('Access denied - user is not admin:', currentUser.email)
      return new Response(
        JSON.stringify({ error: 'Access denied. Admin role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Vary': 'Origin' } }
      )
    }

    // Parse request body
    const { userId, newPassword, forcePasswordChange = false } = await req.json()

    if (!userId || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, newPassword' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Vary': 'Origin' } }
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
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Vary': 'Origin' } }
      )
    }

    // Use the already-created service client for admin operations
    const adminClient = supabase;

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
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Vary': 'Origin' } }
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Vary': 'Origin' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Unexpected error in admin-update-user:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Vary': 'Origin' } }
    )
  }
})