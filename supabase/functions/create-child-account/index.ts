import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

interface CreateChildAccountRequest {
  firstName: string;
  lastName: string;
  parentUserId: string;
  password: string;
  familyId?: string; // Optional - used by admins to specify which family
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
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

    const { firstName, lastName, parentUserId, password, familyId }: CreateChildAccountRequest = await req.json();
    
    // Validate required fields
    if (!firstName || !lastName || !parentUserId || !password) {
      console.error('Missing required fields:', { firstName: !!firstName, lastName: !!lastName, parentUserId: !!parentUserId, password: !!password });
      throw new Error('Missing required fields: firstName, lastName, parentUserId, or password');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    console.log('Creating child account for user:', parentUserId);

    // Verify the requesting user is a parent OR admin
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', parentUserId)
      .in('role', ['parent', 'admin'])
      .limit(1)
      .maybeSingle();

    if (roleError || !userRole) {
      console.error('Role verification failed:', roleError);
      throw new Error('Access denied: Parent or Admin role required');
    }

    const isAdmin = userRole.role === 'admin';
    console.log('User role:', userRole.role, 'isAdmin:', isAdmin);

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name')
      .eq('user_id', parentUserId)
      .single();

    if (profileError || !userProfile) {
      console.error('User profile not found:', profileError);
      throw new Error('User profile not found');
    }

    // Get user's email from auth.users
    const { data: userAuthData, error: userAuthError } = await supabase.auth.admin.getUserById(parentUserId);
    
    if (userAuthError || !userAuthData?.user?.email) {
      console.error('User auth data not found:', userAuthError);
      throw new Error('User account not found');
    }
    
    const creatorEmail = userAuthData.user.email;

    // Get the family - logic differs for admin vs parent
    let family;
    
    if (isAdmin) {
      // Admin must specify a familyId
      if (!familyId) {
        throw new Error('Admin users must specify a familyId to create child accounts');
      }
      
      const { data: adminFamily, error: adminFamilyError } = await supabase
        .from('families')
        .select('id, name, family_code, created_by')
        .eq('id', familyId)
        .single();

      if (adminFamilyError || !adminFamily) {
        console.error('Family not found for admin:', adminFamilyError);
        throw new Error('Specified family not found');
      }
      
      family = adminFamily;
      console.log('Admin creating child in family:', family.name);
    } else {
      // Parent creates in their own family
      const { data: parentFamily, error: parentFamilyError } = await supabase
        .from('families')
        .select('id, name, family_code, created_by')
        .eq('created_by', parentUserId)
        .single();

      if (parentFamilyError || !parentFamily) {
        console.error('Family not found for parent:', parentFamilyError);
        throw new Error('No family found for this parent. Please create a family first.');
      }
      
      family = parentFamily;
    }

    // For admin, get the family owner's email to use as base for child email
    let baseEmail = creatorEmail;
    if (isAdmin && family.created_by !== parentUserId) {
      const { data: familyOwnerAuth } = await supabase.auth.admin.getUserById(family.created_by);
      if (familyOwnerAuth?.user?.email) {
        baseEmail = familyOwnerAuth.user.email;
      }
    }

    // Generate child email and create auth user immediately
    const childEmail = `${baseEmail}.${firstName.toLowerCase()}`;
    
    console.log('Creating auth user with provided password');
    
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: childEmail,
      password: password.trim(),
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        created_by_parent: !isAdmin,
        created_by_admin: isAdmin,
        creator_user_id: parentUserId,
        family_id: family.id
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      throw new Error(`Failed to create auth user: ${authError.message}`);
    }

    const createdAuthUser = authUser.user;
    console.log('Created auth user:', createdAuthUser.id);

    // Create child account record
    const { data: childAccount, error: childAccountError } = await supabase
      .from('child_accounts')
      .insert({
        family_id: family.id,
        created_by: parentUserId,
        user_id: createdAuthUser.id,
        first_name: firstName,
        last_name: lastName,
        generated_email: childEmail,
        family_code: family.family_code,
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          creator_email: creatorEmail,
          creator_name: `${userProfile.first_name} ${userProfile.last_name}`,
          creator_role: userRole.role,
          family_name: family.name,
          created_via: isAdmin ? 'admin_dashboard' : 'parent_dashboard',
          password_set_by_creator: true
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

    // Create profile for the child
    const { error: childProfileError } = await supabase
      .from('profiles')
      .insert({
        user_id: createdAuthUser.id,
        email: childEmail,
        first_name: firstName,
        last_name: lastName
      });

    if (childProfileError) {
      console.error('Error creating child profile:', childProfileError);
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

    // Add child role to user_roles table
    const { error: childRoleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: createdAuthUser.id,
        role: 'child'
      });

    if (childRoleError) {
      console.error('Error assigning child role:', childRoleError);
      // Don't throw - role may have been created by trigger, just log it
    } else {
      console.log('Child role assigned in user_roles');
    }

    // Log the activity
    const { error: logError } = await supabase
      .rpc('log_family_activity', {
        p_family_id: family.id,
        p_user_id: parentUserId,
        p_member_role: isAdmin ? 'admin' : 'parent',
        p_activity_type: 'child_account_created',
        p_activity_details: {
          child_name: `${firstName} ${lastName}`,
          child_email: childEmail,
          child_account_id: childAccount.id,
          auth_user_created: true,
          password_set_by_creator: true,
          created_by_admin: isAdmin
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
          accountCode: null,
          status: 'completed'
        },
        family: {
          id: family.id,
          name: family.name,
          code: family.family_code
        },
        instructions: {
          nextSteps: [
            `${firstName} can now login with their email and password`,
            `Email: ${childEmail}`,
            'Password: The password you set'
          ],
          loginUrl: `${Deno.env.get('SUPABASE_URL') || 'https://your-app.com'}/auth`
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
        headers: { ...getCorsHeaders(req.headers.get('origin')), 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})
