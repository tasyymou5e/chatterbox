// Edge function: create-test-family
// Last deployment trigger: 2026-01-01T12:00:00Z
// Creates test families for development and testing purposes

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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate required environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing required environment variables:', { supabaseUrl: !!supabaseUrl, serviceRoleKey: !!serviceRoleKey });
      throw new Error('Missing required Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

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
      console.error('Missing required fields:', { displayName: !!displayName, parent1: !!parent1, createdBy: !!createdBy });
      throw new Error('Missing required fields: displayName, parent1, or createdBy');
    }

    console.log('Creating test family:', { displayName, parent1, parent2, children: children.length, cleanupFirst, forceUniqueEmails });

    let cleanupResults = null;

    // Cleanup existing test data if requested
    if (cleanupFirst) {
      console.log('Cleaning up existing test data...');
      try {
        const { data: cleanupData, error: cleanupError } = await supabase.rpc('cleanup_test_families');
        
        if (cleanupError) {
          console.error('Cleanup error:', cleanupError);
          throw new Error(`Cleanup failed: ${cleanupError.message}`);
        }
        
        if (cleanupData && cleanupData.length > 0) {
          cleanupResults = {
            familiesDeleted: cleanupData[0].families_deleted,
            usersDeleted: cleanupData[0].users_deleted
          };
          console.log('Cleanup completed:', cleanupResults);

          // Delete auth users (cleanup function can't do this directly)
          const cleanupDetails = cleanupData[0].cleanup_details;
          const userIds = cleanupDetails.test_user_ids || [];
          
          for (const userId of userIds) {
            try {
              await supabase.auth.admin.deleteUser(userId);
              console.log(`Deleted auth user: ${userId}`);
            } catch (authError) {
              console.error(`Failed to delete auth user ${userId}:`, authError);
              // Continue with other deletions
            }
          }
        }
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
        throw new Error(`Cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : 'Unknown cleanup error'}`);
      }
    }

    // Generate family code
    const { data: familyCodeData, error: familyCodeError } = await supabase
      .rpc('generate_family_code');

    if (familyCodeError) {
      console.error('Error generating family code:', familyCodeError);
      throw new Error('Failed to generate family code');
    }

    const familyCode = familyCodeData;
    const internalName = `${displayName} (${familyCode})`;

    console.log('Generated family code:', familyCode);

    // Create family record with test metadata
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
      console.error('Error creating family:', familyError);
      throw new Error('Failed to create family record');
    }

    console.log('Created family:', familyData);

    // Prepare all family members
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

    console.log('Creating family members:', familyMembers.length);

    // Create auth users and profiles for all family members with enhanced error handling
    const createdMembers = [];
    const failedMembers = [];
    
    // Generate strong password that meets validation requirements
    let tempPassword = customPassword;
    if (!tempPassword) {
      tempPassword = generateStrongPassword();
      console.log('Generated strong password for test family');
      
      // Validate the generated password
      const validation = PasswordValidator.validate(tempPassword);
      if (!validation.isValid) {
        console.error('Generated password failed validation:', validation.feedback);
        throw new Error('Failed to generate valid password');
      }
    }

    for (const member of familyMembers) {
      try {
        // Get unique email if requested
        const finalEmail = await getUniqueEmail(supabase, member.email, forceUniqueEmails, emailSuffix);
        
        console.log(`Creating user with email: ${finalEmail} (original: ${member.email})`);
        
        // Create auth user
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
          console.error(`Error creating user ${finalEmail}:`, authError);
          failedMembers.push({
            name: `${member.firstName} ${member.lastName}`,
            email: finalEmail,
            role: member.role,
            success: false,
            error: `Auth creation failed: ${authError.message}`
          });
          continue; // Continue with next member instead of failing entire operation
        }

        console.log(`Created auth user: ${finalEmail}`);

        try {
          // The handle_new_user() trigger will automatically create the profile and assign parent role
          // We need to update the role if it's a child
          if (member.role === 'child') {
            // Remove default parent role
            await supabase
              .from('user_roles')
              .delete()
              .eq('user_id', authData.user.id)
              .eq('role', 'parent');

            // Add child role
            await supabase
              .from('user_roles')
              .insert({
                user_id: authData.user.id,
                role: 'child'
              });
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
            console.error(`Error adding ${finalEmail} to family:`, familyMemberError);
            throw new Error(`Failed to add ${finalEmail} to family: ${familyMemberError.message}`);
          }

          createdMembers.push({
            name: `${member.firstName} ${member.lastName}`,
            email: finalEmail,
            role: member.role,
            tempPassword: tempPassword,
            success: true
          });

          console.log(`Successfully added ${finalEmail} to family ${familyCode}`);
          
        } catch (memberError) {
          // If family member creation fails, try to clean up the auth user
          try {
            await supabase.auth.admin.deleteUser(authData.user.id);
            console.log(`Cleaned up auth user after family member failure: ${finalEmail}`);
          } catch (cleanupError) {
            console.error(`Failed to cleanup auth user ${finalEmail}:`, cleanupError);
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
        console.error(`Failed to process member ${member.email}:`, error);
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

    console.log('Test family creation completed:', {
      familyCode,
      displayName,
      membersCreated: createdMembers.length,
      membersFailed: failedMembers.length,
      cleanupPerformed: cleanupResults !== null
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
      cleanupResults: cleanupResults || undefined
    };

    // If we have failures but some successes, return 207 (Multi-Status)
    // If complete failure, return 500
    // If complete success, return 200
    const statusCode = hasFailures ? (hasSuccesses ? 207 : 500) : 200;

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    );

  } catch (error) {
    console.error('Error in create-test-family function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})