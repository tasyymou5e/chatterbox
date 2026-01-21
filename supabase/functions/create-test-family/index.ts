// Edge function: create-test-family
// Last deployment trigger: 2026-01-01T19:30:00Z
// Creates test families for development and testing purposes
// Enhanced with detailed phase logging and child_accounts integration

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Import password validator for secure password generation
interface PasswordValidationResult {
  isValid: boolean;
  score: number;
  feedback: string[];
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumbers: boolean;
    hasSpecialChars: boolean;
    noCommonPatterns: boolean;
    notCompromised: boolean;
  };
}

class PasswordValidator {
  static validate(password: string): PasswordValidationResult {
    const feedback: string[] = [];
    const requirements = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      noCommonPatterns: true, // Simple check for generated passwords
      notCompromised: true    // Simple check for generated passwords
    };

    const isValid = requirements.minLength && requirements.hasUppercase && 
                    requirements.hasLowercase && requirements.hasNumbers && 
                    requirements.hasSpecialChars;

    return {
      isValid,
      score: isValid ? 5 : 2,
      feedback,
      requirements
    };
  }
}

// Generate a strong password that meets validation requirements
function generateStrongPassword(): string {
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase(); // Uppercase letters
  const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*'];
  const specialChar = specialChars[Math.floor(Math.random() * specialChars.length)];
  
  // Format: TempPass + timestamp + uppercase letters + special char
  return `TempPass${timestamp}${randomChars}${specialChar}`;
}

import { getCorsHeaders } from '../_shared/cors.ts'

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
  createdBy: string; // Admin user ID passed from frontend
  cleanupFirst?: boolean; // Whether to cleanup existing test data first
  forceUniqueEmails?: boolean; // Whether to auto-generate unique emails for conflicts
  emailSuffix?: string; // Custom suffix for email generation
  customPassword?: string; // Custom password to use instead of auto-generated
}

interface CreateFamilyResponse {
  success: boolean;
  familyCode?: string;
  familyId?: string;
  displayName?: string;
  internalName?: string;
  membersCreated: number;
  members: Array<{
    name: string;
    email: string;
    role: string;
    tempPassword?: string;
    success: boolean;
    error?: string;
  }>;
  tempPassword?: string;
  cleanupResults?: {
    familiesDeleted: number;
    usersDeleted: number;
  };
  error?: string;
  requestId?: string; // For tracing
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
    return false; // Assume email doesn't exist if we can't check
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
  
  // Final attempt with timestamp
  return generateUniqueEmail(baseEmail, customSuffix);
}

serve(async (req) => {
  // Generate request ID for tracing
  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();
  
  // Structured logging helpers
  const log = (phase: string, message: string, data?: any) => {
    const elapsed = Date.now() - startTime;
    console.log(`[${requestId}] [${elapsed}ms] [${phase}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  };
  
  const logError = (phase: string, message: string, error: any) => {
    const elapsed = Date.now() - startTime;
    console.error(`[${requestId}] [${elapsed}ms] [${phase}] ERROR: ${message}`, {
      error: error?.message || String(error),
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack?.split('\n').slice(0, 3).join('\n')
    });
  };

  log('INIT', 'Request received', { method: req.method });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    log('INIT', 'CORS preflight request handled');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate required environment variables
    log('INIT', 'Validating environment variables');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      logError('INIT', 'Missing required environment variables', { 
        supabaseUrl: !!supabaseUrl, 
        serviceRoleKey: !!serviceRoleKey 
      });
      throw new Error('Missing required Supabase configuration');
    }

    log('INIT', 'Environment validated, creating Supabase client');
    const supabase = createClient(supabaseUrl, serviceRoleKey);

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
    
    // Validate required fields
    if (!displayName || !parent1 || !createdBy) {
      logError('INIT', 'Missing required fields', { 
        displayName: !!displayName, 
        parent1: !!parent1, 
        createdBy: !!createdBy 
      });
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

          // Delete auth users (cleanup function can't do this directly)
          const cleanupDetails = cleanupData[0].cleanup_details;
          const userIds = cleanupDetails.test_user_ids || [];
          
          log('CLEANUP', `Deleting ${userIds.length} auth users`);
          for (const userId of userIds) {
            try {
              await supabase.auth.admin.deleteUser(userId);
              log('CLEANUP', `Deleted auth user: ${userId}`);
            } catch (authError) {
              logError('CLEANUP', `Failed to delete auth user ${userId}`, authError);
              // Continue with other deletions
            }
          }
          log('CLEANUP', 'Auth user cleanup completed');
        } else {
          log('CLEANUP', 'No test data found to cleanup');
        }
      } catch (cleanupError) {
        logError('CLEANUP', 'Cleanup process failed', cleanupError);
        throw new Error(`Cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : 'Unknown cleanup error'}`);
      }
    }

    // Generate family code
    log('FAMILY_CODE', 'Generating family code');
    const { data: familyCodeData, error: familyCodeError } = await supabase
      .rpc('generate_family_code');

    if (familyCodeError) {
      logError('FAMILY_CODE', 'Failed to generate family code', familyCodeError);
      throw new Error('Failed to generate family code');
    }

    const familyCode = familyCodeData;
    const internalName = `${displayName} (${familyCode})`;
    log('FAMILY_CODE', 'Family code generated', { familyCode, internalName });

    // Create family record with test metadata
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

    log('FAMILY_CREATE', 'Family record created', { 
      familyId: familyData.id, 
      familyCode: familyData.family_code 
    });

    // Prepare all family members
    log('MEMBER_PREP', 'Preparing family members list');
    const familyMembers: Array<{
      firstName: string;
      lastName: string;
      email: string;
      role: 'parent' | 'child';
    }> = [];

    // Add parent 1
    familyMembers.push({
      firstName: parent1.firstName,
      lastName: parent1.lastName,
      email: parent1.email,
      role: 'parent'
    });

    // Add parent 2 if provided
    if (parent2) {
      familyMembers.push({
        firstName: parent2.firstName,
        lastName: parent2.lastName,
        email: parent2.email,
        role: 'parent'
      });
    }

    // Add children
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

    // Create auth users and profiles for all family members with enhanced error handling
    const createdMembers = [];
    const failedMembers = [];
    
    // Generate strong password that meets validation requirements
    log('PASSWORD', 'Preparing password');
    let tempPassword = customPassword;
    if (!tempPassword) {
      tempPassword = generateStrongPassword();
      log('PASSWORD', 'Generated strong password for test family');
      
      // Validate the generated password
      const validation = PasswordValidator.validate(tempPassword);
      if (!validation.isValid) {
        logError('PASSWORD', 'Generated password failed validation', validation.feedback);
        throw new Error('Failed to generate valid password');
      }
      log('PASSWORD', 'Password validated successfully');
    } else {
      log('PASSWORD', 'Using custom password provided');
    }

    for (let i = 0; i < familyMembers.length; i++) {
      const member = familyMembers[i];
      const memberIndex = i + 1;
      
      log('MEMBER_CREATE', `Processing member ${memberIndex}/${familyMembers.length}`, {
        role: member.role,
        email: member.email,
        name: `${member.firstName} ${member.lastName}`
      });
      
      try {
        // Get unique email if requested
        log('EMAIL', `Getting unique email for ${member.email}`);
        const finalEmail = await getUniqueEmail(supabase, member.email, forceUniqueEmails, emailSuffix);
        
        if (finalEmail !== member.email) {
          log('EMAIL', `Email transformed: ${member.email} -> ${finalEmail}`);
        } else {
          log('EMAIL', `Using original email: ${finalEmail}`);
        }
        
        // Create auth user
        log('AUTH_CREATE', `Creating auth user: ${finalEmail}`);
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
          continue; // Continue with next member instead of failing entire operation
        }

        log('AUTH_CREATE', `Auth user created successfully`, { 
          userId: authData.user.id, 
          email: finalEmail 
        });

        try {
          // The handle_new_user() trigger will automatically create the profile and assign parent role
          // We need to update the role if it's a child
          if (member.role === 'child') {
            log('ROLE_ASSIGN', `Updating role to child for ${finalEmail}`);
            
            // Remove default parent role
            const { error: deleteRoleError } = await supabase
              .from('user_roles')
              .delete()
              .eq('user_id', authData.user.id)
              .eq('role', 'parent');
            
            if (deleteRoleError) {
              log('ROLE_ASSIGN', `Note: Could not remove parent role (may not exist): ${deleteRoleError.message}`);
            }

            // Add child role
            const { error: insertRoleError } = await supabase
              .from('user_roles')
              .insert({
                user_id: authData.user.id,
                role: 'child'
              });
            
            if (insertRoleError) {
              logError('ROLE_ASSIGN', `Failed to assign child role`, insertRoleError);
              throw new Error(`Failed to assign child role: ${insertRoleError.message}`);
            }
            
            log('ROLE_ASSIGN', `Child role assigned successfully`);
          } else {
            log('ROLE_ASSIGN', `Parent role (auto-assigned by trigger)`);
          }

          // Add to family_members table
          log('FAMILY_MEMBER', `Adding ${finalEmail} to family_members`);
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
            throw new Error(`Failed to add ${finalEmail} to family: ${familyMemberError.message}`);
          }

          log('FAMILY_MEMBER', `Added to family_members successfully`);

          // Create child_accounts record for children
          if (member.role === 'child') {
            log('CHILD_ACCOUNT', `Creating child_accounts record for ${finalEmail}`);
            
            const { data: childAccountData, error: childAccountError } = await supabase
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
                  creator_role: 'admin',
                  family_name: displayName,
                  created_via: 'test_family_creation',
                  is_test_account: true,
                  password_set_by_admin: true,
                  request_id: requestId
                }
              })
              .select()
              .single();

            if (childAccountError) {
              logError('CHILD_ACCOUNT', `Failed to create child_accounts record`, childAccountError);
              // Non-fatal - log but continue
              log('CHILD_ACCOUNT', `Warning: child_accounts record not created, but user was created successfully`);
            } else {
              log('CHILD_ACCOUNT', `child_accounts record created`, { 
                childAccountId: childAccountData?.id 
              });
            }
          }

          createdMembers.push({
            name: `${member.firstName} ${member.lastName}`,
            email: finalEmail,
            role: member.role,
            tempPassword: tempPassword,
            success: true
          });

          log('MEMBER_CREATE', `Member ${memberIndex}/${familyMembers.length} completed successfully`, {
            email: finalEmail,
            role: member.role
          });
          
        } catch (memberError) {
          // If family member creation fails, try to clean up the auth user
          logError('MEMBER_CREATE', `Member creation failed, cleaning up auth user`, memberError);
          try {
            await supabase.auth.admin.deleteUser(authData.user.id);
            log('MEMBER_CREATE', `Cleaned up auth user after failure: ${finalEmail}`);
          } catch (cleanupError) {
            logError('MEMBER_CREATE', `Failed to cleanup auth user ${finalEmail}`, cleanupError);
          }
          
          failedMembers.push({
            name: `${member.firstName} ${member.lastName}`,
            email: finalEmail,
            role: member.role,
            success: false,
            error: `Family member creation failed: ${memberError instanceof Error ? memberError.message : 'Unknown error'}`
          });
        }
        
      } catch (error) {
        logError('MEMBER_CREATE', `Failed to process member ${member.email}`, error);
        failedMembers.push({
          name: `${member.firstName} ${member.lastName}`,
          email: member.email,
          role: member.role,
          success: false,
          error: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    // Combine successful and failed members
    const allMembers = [...createdMembers, ...failedMembers];
    const hasFailures = failedMembers.length > 0;
    const hasSuccesses = createdMembers.length > 0;

    log('COMPLETE', 'Test family creation completed', {
      requestId,
      familyCode,
      displayName,
      membersCreated: createdMembers.length,
      membersFailed: failedMembers.length,
      cleanupPerformed: cleanupResults !== null,
      totalDuration: `${Date.now() - startTime}ms`,
      success: hasSuccesses
    });

    const response: CreateFamilyResponse = {
      success: hasSuccesses, // Consider successful if at least one member was created
      familyCode: hasSuccesses ? familyCode : undefined,
      familyId: hasSuccesses ? familyData.id : undefined,
      displayName: hasSuccesses ? displayName : undefined,
      internalName: hasSuccesses ? internalName : undefined,
      membersCreated: createdMembers.length,
      members: allMembers,
      tempPassword: hasSuccesses ? tempPassword : undefined,
      cleanupResults: cleanupResults || undefined,
      requestId
    };

    // If we have failures but some successes, return 207 (Multi-Status)
    // If complete failure, return 500
    // If complete success, return 200
    const statusCode = hasFailures ? (hasSuccesses ? 207 : 500) : 200;

    log('COMPLETE', `Returning response with status ${statusCode}`);

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    );

  } catch (error) {
    logError('FATAL', 'Unhandled error in create-test-family function', error);
    
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
