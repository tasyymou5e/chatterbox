// Edge function: create-test-family
// Creates test families for development and testing purposes
// Uses JWT Signing Keys for fast local token verification

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getCorsHeaders } from '../_shared/cors.ts'
import { cleanupLimiter, RateLimiter } from '../_shared/rate-limiter.ts'
import { 
  validateAdminJWT, 
  getServiceClient, 
  createUnauthorizedResponse,
  createForbiddenResponse
} from '../_shared/auth-validator.ts'

// Password validation
class PasswordValidator {
  static validate(password: string) {
    const requirements = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      noCommonPatterns: true,
      notCompromised: true
    };

    const isValid = requirements.minLength && requirements.hasUppercase && 
                    requirements.hasLowercase && requirements.hasNumbers && 
                    requirements.hasSpecialChars;

    return { isValid, score: isValid ? 5 : 2, feedback: [], requirements };
  }
}

// Generate a strong password
function generateStrongPassword(): string {
  const timestamp = Date.now().toString().slice(-6);
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*'];
  const specialChar = specialChars[Math.floor(Math.random() * specialChars.length)];
  return `TempPass${timestamp}${randomChars}${specialChar}`;
}

interface Parent {
  firstName: string;
  lastName: string;
  email: string;
}

interface Child {
  firstName: string;
  lastName: string;
  email: string;
}

interface CreateFamilyRequest {
  displayName: string;
  parent1: Parent;
  parent2: Parent | null;
  children: Child[];
  createdBy: string;
  cleanupFirst?: boolean;
  forceUniqueEmails?: boolean;
  emailSuffix?: string;
  customPassword?: string;
}

// Helper function to generate unique email
function generateUniqueEmail(baseEmail: string, suffix?: string): string {
  const [localPart, domain] = baseEmail.split('@');
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  const uniqueSuffix = suffix || `test.${timestamp}.${randomSuffix}`;
  return `${localPart}.${uniqueSuffix}@${domain}`;
}

// Helper function to check if email exists
async function checkEmailExists(supabase: any, email: string): Promise<boolean> {
  try {
    const { data: users } = await supabase.auth.admin.listUsers();
    return users?.users?.some((user: any) => user.email === email) || false;
  } catch (error) {
    console.error('Error checking email existence:', error);
    return false;
  }
}

// Helper function to get unique email with retry logic
async function getUniqueEmail(supabase: any, baseEmail: string, forceUnique: boolean, customSuffix?: string): Promise<string> {
  if (!forceUnique) {
    return baseEmail;
  }
  
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts) {
    const candidateEmail = attempts === 0 ? baseEmail : generateUniqueEmail(baseEmail, customSuffix);
    const exists = await checkEmailExists(supabase, candidateEmail);
    
    if (!exists) {
      return candidateEmail;
    }
    
    attempts++;
  }
  
  return generateUniqueEmail(baseEmail, customSuffix);
}

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();
  
  const log = (phase: string, message: string, data?: any) => {
    const elapsed = Date.now() - startTime;
    console.log(`[${requestId}] [${elapsed}ms] [${phase}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  };
  
  const logError = (phase: string, message: string, error: any) => {
    const elapsed = Date.now() - startTime;
    console.error(`[${requestId}] [${elapsed}ms] [${phase}] ERROR: ${message}`, {
      error: error?.message || String(error),
      code: error?.code,
      details: error?.details
    });
  };

  log('INIT', 'Request received', { method: req.method });

  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Apply rate limiting
  const rateCheck = cleanupLimiter.check(req);
  if (!rateCheck.allowed) {
    log('RATE_LIMIT', 'Rate limit exceeded');
    return RateLimiter.createRateLimitResponse(rateCheck.resetTime);
  }

  try {
    // Validate admin JWT using getClaims() for fast local verification
    log('AUTH', 'Validating admin JWT');
    const auth = await validateAdminJWT(req);
    
    if (!auth.success) {
      logError('AUTH', 'Authentication failed', auth.error);
      return createUnauthorizedResponse(auth.error || 'Unauthorized', corsHeaders);
    }
    
    if (!auth.isAdmin) {
      logError('AUTH', 'Admin access required', { userId: auth.userId });
      return createForbiddenResponse('Admin access required', corsHeaders);
    }

    log('AUTH', 'Admin authentication successful', { userId: auth.userId });

    const supabase = getServiceClient();

    log('INIT', 'Parsing request body');
    const { 
      displayName, 
      parent1, 
      parent2, 
      children, 
      createdBy,
      cleanupFirst = false,
      forceUniqueEmails = true,
      emailSuffix,
      customPassword
    }: CreateFamilyRequest = await req.json();
    
    if (!displayName || !parent1 || !createdBy) {
      logError('INIT', 'Missing required fields', { displayName: !!displayName, parent1: !!parent1, createdBy: !!createdBy });
      throw new Error('Missing required fields: displayName, parent1, or createdBy');
    }

    log('INIT', 'Request parsed successfully', {
      displayName,
      parent1Email: parent1.email,
      parent2Email: parent2?.email || null,
      childrenCount: children.length,
      cleanupFirst,
      forceUniqueEmails
    });

    let cleanupResults = null;

    // Cleanup existing test data if requested
    if (cleanupFirst) {
      log('CLEANUP', 'Starting cleanup of existing test data');
      try {
        const { data: cleanupData, error: cleanupError } = await supabase.rpc('cleanup_test_families');
        
        if (cleanupError) {
          logError('CLEANUP', 'RPC cleanup_test_families failed', cleanupError);
          throw new Error(`Cleanup failed: ${cleanupError.message}`);
        }
        
        if (cleanupData && cleanupData.length > 0) {
          cleanupResults = {
            familiesDeleted: cleanupData[0].families_deleted,
            usersDeleted: cleanupData[0].users_deleted
          };
          log('CLEANUP', 'Database cleanup completed', cleanupResults);

          const cleanupDetails = cleanupData[0].cleanup_details;
          const userIds = cleanupDetails.test_user_ids || [];
          
          log('CLEANUP', `Deleting ${userIds.length} auth users`);
          for (const userId of userIds) {
            try {
              await supabase.auth.admin.deleteUser(userId);
              log('CLEANUP', `Deleted auth user: ${userId}`);
            } catch (authError) {
              logError('CLEANUP', `Failed to delete auth user ${userId}`, authError);
            }
          }
        }
      } catch (cleanupError) {
        logError('CLEANUP', 'Cleanup process failed', cleanupError);
        throw new Error(`Cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : 'Unknown cleanup error'}`);
      }
    }

    // Generate family code
    log('FAMILY_CODE', 'Generating family code');
    const { data: familyCodeData, error: familyCodeError } = await supabase.rpc('generate_family_code');

    if (familyCodeError) {
      logError('FAMILY_CODE', 'Failed to generate family code', familyCodeError);
      throw new Error('Failed to generate family code');
    }

    const familyCode = familyCodeData;
    const internalName = `${displayName} (${familyCode})`;
    log('FAMILY_CODE', 'Family code generated', { familyCode, internalName });

    // Create family record
    log('FAMILY_CREATE', 'Creating family record');
    const { data: familyData, error: familyError } = await supabase
      .from('families')
      .insert({
        display_name: displayName,
        family_code: familyCode,
        name: internalName,
        created_by: createdBy,
        metadata: {
          is_test_family: true,
          created_via_admin: true,
          created_at: new Date().toISOString(),
          admin_user_id: createdBy
        }
      })
      .select()
      .single();

    if (familyError) {
      logError('FAMILY_CREATE', 'Failed to create family record', familyError);
      throw new Error('Failed to create family record');
    }

    log('FAMILY_CREATE', 'Family record created', { familyId: familyData.id, familyCode: familyData.family_code });

    // Prepare all family members
    const familyMembers: Array<{
      firstName: string;
      lastName: string;
      email: string;
      role: 'parent' | 'child';
    }> = [];

    familyMembers.push({
      firstName: parent1.firstName,
      lastName: parent1.lastName,
      email: parent1.email,
      role: 'parent'
    });

    if (parent2) {
      familyMembers.push({
        firstName: parent2.firstName,
        lastName: parent2.lastName,
        email: parent2.email,
        role: 'parent'
      });
    }

    children.forEach(child => {
      familyMembers.push({
        firstName: child.firstName,
        lastName: child.lastName,
        email: child.email,
        role: 'child'
      });
    });

    log('MEMBER_PREP', 'Family members prepared', { 
      totalMembers: familyMembers.length,
      parents: familyMembers.filter(m => m.role === 'parent').length,
      children: familyMembers.filter(m => m.role === 'child').length
    });

    // Generate password
    let tempPassword = customPassword;
    if (!tempPassword) {
      tempPassword = generateStrongPassword();
      const validation = PasswordValidator.validate(tempPassword);
      if (!validation.isValid) {
        throw new Error('Failed to generate valid password');
      }
    }

    const createdMembers = [];
    const failedMembers = [];

    for (let i = 0; i < familyMembers.length; i++) {
      const member = familyMembers[i];
      
      log('MEMBER_CREATE', `Processing member ${i + 1}/${familyMembers.length}`, {
        role: member.role,
        email: member.email,
        name: `${member.firstName} ${member.lastName}`
      });
      
      try {
        const finalEmail = await getUniqueEmail(supabase, member.email, forceUniqueEmails, emailSuffix);
        
        if (finalEmail !== member.email) {
          log('EMAIL', `Email transformed: ${member.email} -> ${finalEmail}`);
        }
        
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: finalEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            first_name: member.firstName,
            last_name: member.lastName,
            is_test_user: true,
            original_email: member.email !== finalEmail ? member.email : undefined
          }
        });

        if (authError) {
          logError('AUTH_CREATE', `Failed to create auth user ${finalEmail}`, authError);
          failedMembers.push({
            name: `${member.firstName} ${member.lastName}`,
            email: finalEmail,
            role: member.role,
            success: false,
            error: `Auth creation failed: ${authError.message}`
          });
          continue;
        }

        log('AUTH_CREATE', `Auth user created successfully`, { userId: authData.user.id, email: finalEmail });

        // Handle role assignment
        if (member.role === 'child') {
          const { error: deleteRoleError } = await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', authData.user.id)
            .eq('role', 'parent');

          const { error: insertRoleError } = await supabase
            .from('user_roles')
            .insert({ user_id: authData.user.id, role: 'child' });

          if (insertRoleError) {
            logError('ROLE_ASSIGN', `Failed to assign child role`, insertRoleError);
          }
        }

        // Add to family_members table
        const { error: familyMemberError } = await supabase
          .from('family_members')
          .insert({
            family_id: familyData.id,
            user_id: authData.user.id,
            role: member.role,
            invited_by: createdBy
          });

        if (familyMemberError) {
          logError('FAMILY_MEMBER', `Failed to add to family_members`, familyMemberError);
        }

        // Create child_accounts record for children
        if (member.role === 'child') {
          const { error: childAccountError } = await supabase
            .from('child_accounts')
            .insert({
              family_id: familyData.id,
              created_by: createdBy,
              user_id: authData.user.id,
              first_name: member.firstName,
              last_name: member.lastName,
              generated_email: finalEmail,
              family_code: familyCode,
              status: 'completed',
              completed_at: new Date().toISOString(),
              metadata: {
                created_via: 'test_family_creation',
                is_test_account: true
              }
            });

          if (childAccountError) {
            logError('CHILD_ACCOUNT', `Failed to create child_account record`, childAccountError);
          }
        }

        createdMembers.push({
          name: `${member.firstName} ${member.lastName}`,
          email: finalEmail,
          role: member.role,
          tempPassword,
          success: true
        });

      } catch (error) {
        logError('MEMBER_CREATE', `Failed to create member`, error);
        failedMembers.push({
          name: `${member.firstName} ${member.lastName}`,
          email: member.email,
          role: member.role,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    log('COMPLETE', 'Test family creation completed', {
      familyId: familyData.id,
      membersCreated: createdMembers.length,
      membersFailed: failedMembers.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        familyCode: familyData.family_code,
        familyId: familyData.id,
        displayName: displayName,
        internalName: internalName,
        membersCreated: createdMembers.length,
        members: [...createdMembers, ...failedMembers],
        tempPassword,
        cleanupResults,
        requestId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    logError('ERROR', 'Test family creation failed', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        requestId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})