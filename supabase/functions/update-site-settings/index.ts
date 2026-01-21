import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the user is authenticated and is an admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has admin role
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (roleError || !userRoles || userRoles.length === 0) {
      return new Response(JSON.stringify({ error: 'Admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { setting_key, setting_value } = await req.json();

    if (!setting_key || setting_value === undefined) {
      return new Response(JSON.stringify({ error: 'setting_key and setting_value are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update the setting
    const { data, error } = await supabase
      .from('site_settings')
      .update({ 
        setting_value: setting_value,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', setting_key)
      .select()
      .single();

    if (error) {
      console.error('Error updating site setting:', error);
      return new Response(JSON.stringify({ error: 'Failed to update setting' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the admin activity
    await supabase.from('admin_audit_logs').insert({
      admin_user_id: user.id,
      operation_type: 'update_site_setting',
      target_table: 'site_settings',
      target_id: data.id,
      new_values: { setting_key, setting_value },
      metadata: {
        setting_description: data.description,
        timestamp: new Date().toISOString()
      }
    });

    return new Response(JSON.stringify({ 
      success: true, 
      data: data,
      message: `Setting '${setting_key}' updated successfully`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in update-site-settings function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
