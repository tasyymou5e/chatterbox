import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getCorsHeaders } from '../_shared/cors.ts'
import { RateLimiter } from '../_shared/rate-limiter.ts'
import { getServiceClient } from '../_shared/auth-validator.ts'

/**
 * SECURE Child Account Completion Edge Function
 * 
 * This function handles child account completion WITHOUT exposing the generated_email
 * to the client. The email is retrieved server-side only.
 * 
 * Security Features:
 * - Rate limiting (5 attempts per 15 minutes per IP)
 * - PIN verification support
 * - Lockout after 5 failed attempts
 * - Security event logging
 * - No generated_email exposure to client
 */

interface CompleteChildAccountRequest {
  familyCode: string;
  password: string;
  verificationPin?: string;
}

// Strict rate limiter for account completion attempts
const completionLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minute window
  maxRequests: 5, // Max 5 attempts per 15 minutes per IP
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Apply rate limiting
  const rateCheck = completionLimiter.check(req);
  if (!rateCheck.allowed) {
    console.warn('Rate limit exceeded for complete-child-account');
    return RateLimiter.createRateLimitResponse(rateCheck.resetTime, corsHeaders);
  }

  try {
    const { familyCode, password, verificationPin }: CompleteChildAccountRequest = await req.json();
    
    // Validate required fields
    if (!familyCode || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: familyCode and password'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Password must be at least 8 characters long'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Step 1: Use secure RPC to lookup account (never returns generated_email to us)
    const { data: accountLookup, error: lookupError } = await supabase
      .rpc('get_pending_child_account_for_completion', {
        p_family_code: familyCode,
        p_verification_pin: verificationPin || null
      });

    if (lookupError) {
      console.error('Account lookup error:', lookupError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to lookup account'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Check if account was found
    if (!accountLookup || accountLookup.length === 0) {
      // Log failed attempt
      await supabase
        .from('security_events')
        .insert({
          event_type: 'child_account_completion_failed',
          severity: 'medium',
          metadata: {
            family_code: familyCode,
            reason: 'account_not_found_or_invalid_pin'
          }
        });

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid account code or verification PIN. Please check and try again.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const account = accountLookup[0];

    // Check if account is locked
    if (account.is_locked) {
      const minutes = Math.ceil(account.lock_remaining_seconds / 60);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Too many failed attempts. Please try again in ${minutes} minutes.`,
          isLocked: true,
          lockRemainingSeconds: account.lock_remaining_seconds
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // Step 2: Use secure RPC to complete account and get generated_email server-side only
    const { data: completionResult, error: completionError } = await supabase
      .rpc('complete_child_account_secure', {
        p_account_id: account.id,
        p_user_id: null, // Will be set after auth user creation
        p_verification_pin: verificationPin || null
      });

    // First just get the email for auth user creation
    const { data: accountData } = await supabase
      .from('child_accounts')
      .select('generated_email, first_name, last_name, family_id')
      .eq('id', account.id)
      .single();

    if (!accountData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Account data not found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Step 3: Create auth user with the generated email (server-side only)
    console.log('Creating auth user for child account:', account.id);
    
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: accountData.generated_email,
      password: password.trim(),
      email_confirm: true,
      user_metadata: {
        first_name: accountData.first_name,
        last_name: accountData.last_name,
        account_type: 'child',
        family_id: accountData.family_id
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      
      // Check for duplicate email
      if (authError.message?.includes('already been registered')) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'This account has already been set up. Please try signing in instead.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to create user account. Please try again.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Step 4: Complete the child account record
    const { error: updateError } = await supabase
      .from('child_accounts')
      .update({
        user_id: authUser.user.id,
        status: 'completed',
        completed_at: new Date().toISOString(),
        pin_attempts: 0,
        locked_until: null
      })
      .eq('id', account.id);

    if (updateError) {
      console.error('Error completing child account:', updateError);
      // Don't fail - auth user was created successfully
    }

    // Step 5: Create profile for the child
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: authUser.user.id,
        email: accountData.generated_email,
        first_name: accountData.first_name,
        last_name: accountData.last_name
      });

    if (profileError) {
      console.error('Error creating child profile:', profileError);
      // Don't fail - this can be handled later
    }

    // Step 6: Add child to family members
    const { error: memberError } = await supabase
      .from('family_members')
      .insert({
        family_id: accountData.family_id,
        user_id: authUser.user.id,
        role: 'child'
      });

    if (memberError) {
      console.error('Error adding child to family:', memberError);
    }

    // Step 7: Add child role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authUser.user.id,
        role: 'child'
      });

    if (roleError) {
      console.error('Error assigning child role:', roleError);
    }

    // Log successful completion
    await supabase
      .from('security_events')
      .insert({
        event_type: 'child_account_completed',
        severity: 'low',
        user_id: authUser.user.id,
        metadata: {
          account_id: account.id,
          family_id: accountData.family_id
        }
      });

    console.log('Child account completed successfully:', account.id);

    // Step 8: Sign in the user server-side to create session tokens
    // This way the generated_email NEVER leaves the server
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: accountData.generated_email,
      password: password.trim()
    });

    if (signInError || !signInData.session) {
      console.error('Error creating session:', signInError);
      // Account was created but session failed - user can sign in manually
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Account setup complete! Please sign in with your family code.',
          child: {
            firstName: accountData.first_name,
            lastName: accountData.last_name
          },
          session: null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Return success with session tokens - email NEVER exposed
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account setup complete!',
        child: {
          firstName: accountData.first_name,
          lastName: accountData.last_name
        },
        session: {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          expires_in: signInData.session.expires_in,
          expires_at: signInData.session.expires_at
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Error in complete-child-account function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});