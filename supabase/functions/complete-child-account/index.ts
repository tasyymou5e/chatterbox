import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getCorsHeaders } from '../_shared/cors.ts'
import { RateLimiter } from '../_shared/rate-limiter.ts'
import { getServiceClient } from '../_shared/auth-validator.ts'
import { sendEmailNonBlocking } from '../_shared/email-sender.ts'
import { childAccountCompletedTemplate, childAccountFailedTemplate } from '../_shared/email-templates.ts'

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
 * - Parent email notifications on success/failure
 */

interface CompleteChildAccountRequest {
  familyCode: string;
  password: string;
  verificationPin?: string;
}

interface ParentInfo {
  parentEmail: string | null;
  parentName: string;
  familyName: string;
}

// Strict rate limiter for account completion attempts
const completionLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minute window
  maxRequests: 5, // Max 5 attempts per 15 minutes per IP
});

/**
 * Get parent information for notifications
 */
async function getParentInfo(
  supabase: ReturnType<typeof getServiceClient>, 
  createdBy: string, 
  familyId: string
): Promise<ParentInfo> {
  try {
    // Get parent's auth user data
    const { data: parentAuth } = await supabase.auth.admin.getUserById(createdBy);
    
    // Get family name
    const { data: family } = await supabase
      .from('families')
      .select('name, display_name')
      .eq('id', familyId)
      .single();

    return {
      parentEmail: parentAuth?.user?.email || null,
      parentName: parentAuth?.user?.user_metadata?.first_name || 'Parent',
      familyName: family?.display_name || family?.name || 'Your Family'
    };
  } catch (error) {
    console.warn('[getParentInfo] Failed to get parent info:', error);
    return {
      parentEmail: null,
      parentName: 'Parent',
      familyName: 'Your Family'
    };
  }
}

/**
 * Send success notification to parent
 */
async function notifyParentSuccess(
  supabase: ReturnType<typeof getServiceClient>,
  createdBy: string,
  familyId: string,
  childFirstName: string,
  childLastName: string
): Promise<void> {
  const parentInfo = await getParentInfo(supabase, createdBy, familyId);
  
  if (!parentInfo.parentEmail) {
    console.log('[notifyParentSuccess] No parent email available');
    return;
  }

  await sendEmailNonBlocking({
    to: parentInfo.parentEmail,
    subject: `✓ ${childFirstName} has completed their account setup`,
    html: childAccountCompletedTemplate({
      parentName: parentInfo.parentName,
      childName: `${childFirstName} ${childLastName}`,
      familyName: parentInfo.familyName,
      completedAt: new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    })
  });
  
  console.log('[notifyParentSuccess] Sent success notification to parent');
}

/**
 * Send failure/lockout notification to parent
 */
async function notifyParentFailure(
  supabase: ReturnType<typeof getServiceClient>,
  createdBy: string,
  familyId: string,
  childFirstName: string,
  childLastName: string,
  failureReason: string,
  isLocked: boolean = false,
  lockMinutes: number = 0
): Promise<void> {
  const parentInfo = await getParentInfo(supabase, createdBy, familyId);
  
  if (!parentInfo.parentEmail) {
    console.log('[notifyParentFailure] No parent email available');
    return;
  }

  const subject = isLocked 
    ? `🔒 Security Alert: ${childFirstName}'s account is temporarily locked`
    : `⚠️ Failed account setup attempt for ${childFirstName}`;

  await sendEmailNonBlocking({
    to: parentInfo.parentEmail,
    subject,
    html: childAccountFailedTemplate({
      parentName: parentInfo.parentName,
      childName: `${childFirstName} ${childLastName}`,
      familyName: parentInfo.familyName,
      failureReason,
      isLocked,
      lockMinutes
    })
  });
  
  console.log('[notifyParentFailure] Sent failure notification to parent');
}

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

      // Note: We can't notify parent here because we don't know which account
      // was targeted (invalid family code = no account match)

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
      
      // Get account details for notification
      const { data: lockedAccount } = await supabase
        .from('child_accounts')
        .select('first_name, last_name, family_id, created_by')
        .eq('id', account.id)
        .single();
      
      if (lockedAccount) {
        // Send lockout notification to parent (non-blocking)
        notifyParentFailure(
          supabase,
          lockedAccount.created_by,
          lockedAccount.family_id,
          lockedAccount.first_name,
          lockedAccount.last_name,
          'Too many failed verification attempts',
          true,
          minutes
        );
      }
      
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
      .select('generated_email, first_name, last_name, family_id, created_by')
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
      
      // Notify parent of failure (non-blocking)
      notifyParentFailure(
        supabase,
        accountData.created_by,
        accountData.family_id,
        accountData.first_name,
        accountData.last_name,
        'Account creation failed. Please contact support.'
      );
      
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

    // Send success notification to parent (non-blocking)
    notifyParentSuccess(
      supabase,
      accountData.created_by,
      accountData.family_id,
      accountData.first_name,
      accountData.last_name
    );

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
