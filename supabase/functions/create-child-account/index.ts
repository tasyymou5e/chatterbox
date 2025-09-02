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

    const { firstName, lastName, parentUserId }: CreateChildAccountRequest = await req.json();
    
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
    const { data: childAccountCode, error: codeError } = await supabase
      .rpc('generate_child_account_code');

    if (codeError || !childAccountCode) {
      console.error('Error generating child account code:', codeError);
      throw new Error('Failed to generate child account code');
    }

    console.log('Generated child account code:', childAccountCode);

    // Create child account record
    const { data: childAccount, error: childAccountError } = await supabase
      .from('child_accounts')
      .insert({
        family_id: family.id,
        created_by: parentUserId,
        first_name: firstName,
        last_name: lastName,
        generated_email: childEmail,
        family_code: childAccountCode,
        status: 'pending',
        metadata: {
          parent_email: parentProfile.email,
          parent_name: `${parentProfile.first_name} ${parentProfile.last_name}`,
          family_name: family.name,
          created_via: 'parent_dashboard'
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
          account_code: childAccountCode
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
        instructions: {
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