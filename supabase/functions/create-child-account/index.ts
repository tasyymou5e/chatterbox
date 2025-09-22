import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateChildAccountRequest {
  firstName: string;
  lastName: string;
  parentUserId: string;
  password?: string;
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

    const { firstName, lastName, parentUserId, password }: CreateChildAccountRequest = await req.json();
    
    // Validate required fields
    if (!firstName || !lastName || !parentUserId) {
      console.error('Missing required fields:', { firstName: !!firstName, lastName: !!lastName, parentUserId: !!parentUserId });
      throw new Error('Missing required fields: firstName, lastName, or parentUserId');
    }

    console.log('Creating child account for parent:', parentUserId);

    // Verify the requesting user is a parent and get their family
    const { data: parentProfile, error: parentError } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, email')
      .eq('user_id', parentUserId)
      .single();

    if (parentError || !parentProfile) {
      console.error('Parent not found:', parentError);
      throw new Error('Parent account not found');
    }

    // Check if parent has parent role
    const { data: parentRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', parentUserId)
      .eq('role', 'parent')
      .single();

    if (roleError || !parentRole) {
      console.error('Parent role verification failed:', roleError);
      throw new Error('Access denied: Parent role required');
    }

    // Get the parent's family
    const { data: family, error: familyError } = await supabase
      .from('families')
      .select('id, name, family_code')
      .eq('created_by', parentUserId)
      .single();

    if (familyError || !family) {
      console.error('Family not found for parent:', familyError);
      throw new Error('No family found for this parent. Please create a family first.');
    }

    // Generate child email and account code
    const childEmail = `${parentProfile.email}.${firstName.toLowerCase()}`;
    let childAccountCode = null;
    let createdAuthUser = null;

    // If password provided, create full auth user immediately
    if (password && password.trim()) {
      console.log('Creating full auth user with parent-provided password');
      
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: childEmail,
        password: password.trim(),
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          created_by_parent: true,
          parent_user_id: parentUserId,
          family_id: family.id
        }
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        throw new Error(`Failed to create auth user: ${authError.message}`);
      }

      createdAuthUser = authUser.user;
      console.log('Created auth user:', createdAuthUser.id);
    } else {
      // Generate account code for child signup flow
      const { data: generatedCode, error: codeError } = await supabase
        .rpc('generate_child_account_code');

      if (codeError || !generatedCode) {
        console.error('Error generating child account code:', codeError);
        throw new Error('Failed to generate child account code');
      }

      childAccountCode = generatedCode;
      console.log('Generated child account code:', childAccountCode);
    }

    // Create child account record
    const { data: childAccount, error: childAccountError } = await supabase
      .from('child_accounts')
      .insert({
        family_id: family.id,
        created_by: parentUserId,
        user_id: createdAuthUser ? createdAuthUser.id : null,
        first_name: firstName,
        last_name: lastName,
        generated_email: childEmail,
        family_code: childAccountCode,
        status: createdAuthUser ? 'completed' : 'pending',
        completed_at: createdAuthUser ? new Date().toISOString() : null,
        metadata: {
          parent_email: parentProfile.email,
          parent_name: `${parentProfile.first_name} ${parentProfile.last_name}`,
          family_name: family.name,
          created_via: 'parent_dashboard',
          password_set_by_parent: !!createdAuthUser
        }
      })
      .select()
      .single();

    if (childAccountError) {
      console.error('Error creating child account record:', childAccountError);
      
      // Check for duplicate email
      if (childAccountError.code === '23505' && childAccountError.message?.includes('generated_email')) {
        throw new Error(`A child account with email ${childEmail} already exists in this family`);
      }
      
      throw new Error('Failed to create child account record');
    }

    console.log('Created child account record:', childAccount.id);

    // If auth user was created, add them to family and set up profile
    if (createdAuthUser) {
      // Create profile for the child
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: createdAuthUser.id,
          email: childEmail,
          first_name: firstName,
          last_name: lastName
        });

      if (profileError) {
        console.error('Error creating child profile:', profileError);
        // Don't fail the whole operation for profile creation
      }

      // Add child to family members
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: family.id,
          user_id: createdAuthUser.id,
          role: 'child',
          invited_by: parentUserId
        });

      if (memberError) {
        console.error('Error adding child to family members:', memberError);
        // Don't fail the whole operation for family member creation
      }
    }

    // Log the activity
    const { error: logError } = await supabase
      .rpc('log_family_activity', {
        p_family_id: family.id,
        p_user_id: parentUserId,
        p_member_role: 'parent',
        p_activity_type: 'child_account_created',
        p_activity_details: {
          child_name: `${firstName} ${lastName}`,
          child_email: childEmail,
          child_account_id: childAccount.id,
          account_code: childAccountCode,
          auth_user_created: !!createdAuthUser,
          password_set_by_parent: !!createdAuthUser
        }
      });

    if (logError) {
      console.warn('Failed to log family activity:', logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        childAccount: {
          id: childAccount.id,
          firstName: firstName,
          lastName: lastName,
          email: childEmail,
          accountCode: childAccountCode,
          status: 'pending'
        },
        family: {
          id: family.id,
          name: family.name,
          code: family.family_code
        },
        instructions: createdAuthUser ? {
          nextSteps: [
            `${firstName} can now login with their email and password`,
            `Email: ${childEmail}`,
            'Password: The password you set'
          ],
          loginUrl: `${Deno.env.get('SUPABASE_URL') || 'https://your-app.com'}/auth`
        } : {
          nextSteps: [
            `Share the account code "${childAccountCode}" with ${firstName}`,
            `${firstName} should visit the signup page and use this code to complete their account`,
            'The child will need to create their own password during signup'
          ],
          signupUrl: `${Deno.env.get('SUPABASE_URL') || 'https://your-app.com'}/auth?tab=child-signup&code=${childAccountCode}`
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in create-child-account function:', error);
    
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