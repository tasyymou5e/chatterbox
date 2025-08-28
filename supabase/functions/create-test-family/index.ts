import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    const { displayName, parent1, parent2, children, createdBy }: CreateFamilyRequest = await req.json();
    
    // Validate required fields
    if (!displayName || !parent1 || !createdBy) {
      console.error('Missing required fields:', { displayName: !!displayName, parent1: !!parent1, createdBy: !!createdBy });
      throw new Error('Missing required fields: displayName, parent1, or createdBy');
    }

    console.log('Creating test family:', { displayName, parent1, parent2, children: children.length });

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

    // Create family record
    const { data: familyData, error: familyError } = await supabase
      .from('families')
      .insert({
        display_name: displayName,
        family_code: familyCode,
        name: internalName,
        created_by: createdBy
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

    // Create auth users and profiles for all family members
    const createdMembers = [];
    const tempPassword = `temp${Date.now()}${Math.random().toString(36).substring(2, 6)}`;

    for (const member of familyMembers) {
      try {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: member.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            first_name: member.firstName,
            last_name: member.lastName
          }
        });

        if (authError) {
          console.error(`Error creating user ${member.email}:`, authError);
          throw new Error(`Failed to create user: ${member.email}`);
        }

        console.log(`Created auth user: ${member.email}`);

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
          console.error(`Error adding ${member.email} to family:`, familyMemberError);
          throw new Error(`Failed to add ${member.email} to family`);
        }

        createdMembers.push({
          name: `${member.firstName} ${member.lastName}`,
          email: member.email,
          role: member.role,
          tempPassword: tempPassword
        });

        console.log(`Added ${member.email} to family ${familyCode}`);
      } catch (error) {
        console.error(`Failed to process member ${member.email}:`, error);
        throw error;
      }
    }

    console.log('Successfully created test family:', {
      familyCode,
      displayName,
      membersCreated: createdMembers.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        familyCode,
        familyId: familyData.id,
        displayName,
        internalName,
        membersCreated: createdMembers.length,
        members: createdMembers,
        tempPassword
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
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