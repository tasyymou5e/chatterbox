import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAdminDebug = () => {
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [isDebugging, setIsDebugging] = useState(false);

  const runDiagnostics = async () => {
    setIsDebugging(true);
    const logs: string[] = [];
    
    try {
      logs.push('🔍 Starting Admin Portal Diagnostics...\n');
      
      // Test 1: Supabase Connection
      logs.push('1. Testing Supabase Connection...');
      try {
        // Use a less sensitive table for connection test
        const { data, error } = await supabase.from('families').select('count').limit(1);
        if (error) {
          logs.push(`❌ Supabase Error: ${error.message}`);
        } else {
          logs.push('✅ Supabase Connection OK');
        }
      } catch (err) {
        logs.push(`❌ Supabase Connection Failed: ${err}`);
      }
      
      // Test 2: Auth Session
      logs.push('\n2. Checking Auth Session...');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          logs.push(`❌ Auth Session Error: ${error.message}`);
        } else if (session) {
          logs.push(`✅ Active Session: ${session.user.email}`);
        } else {
          logs.push('⚠️ No Active Session');
        }
      } catch (err) {
        logs.push(`❌ Auth Session Check Failed: ${err}`);
      }
      
      // Test 3: User Roles Table
      logs.push('\n3. Testing User Roles Table...');
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('*')
          .limit(1);
        if (error) {
          logs.push(`❌ User Roles Error: ${error.message}`);
        } else {
          logs.push(`✅ User Roles Table OK (${data?.length || 0} records checked)`);
        }
      } catch (err) {
        logs.push(`❌ User Roles Check Failed: ${err}`);
      }
      
      // Test 4: Admin Users Check
      logs.push('\n4. Checking for Admin Users...');
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .eq('role', 'admin');
        if (error) {
          logs.push(`❌ Admin Check Error: ${error.message}`);
        } else {
          logs.push(`✅ Found ${data?.length || 0} Admin Users`);
          if (data && data.length === 0) {
            logs.push('⚠️ WARNING: No admin users found in the system!');
          }
        }
      } catch (err) {
        logs.push(`❌ Admin Check Failed: ${err}`);
      }
      
      logs.push('\n🔍 Diagnostics Complete!\n');
      
    } catch (error) {
      logs.push(`❌ Diagnostics Failed: ${error}`);
    }
    
    setDebugInfo(logs.join('\n'));
    setIsDebugging(false);
  };

  const createTestAdmin = async (email: string, password: string) => {
    const logs: string[] = [];
    logs.push('🔧 Creating Test Admin User...\n');
    
    try {
      // Step 1: Create user account
      logs.push('1. Creating user account...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin/dashboard`
        }
      });
      
      if (authError) {
        logs.push(`❌ Account Creation Failed: ${authError.message}`);
        setDebugInfo(logs.join('\n'));
        return { success: false, error: authError.message };
      }
      
      if (!authData.user) {
        logs.push('❌ No user data returned');
        setDebugInfo(logs.join('\n'));
        return { success: false, error: 'No user data returned' };
      }
      
      logs.push(`✅ User Created: ${authData.user.email}`);
      
      // Step 2: Add admin role
      logs.push('2. Adding admin role...');
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([
          { user_id: authData.user.id, role: 'admin' }
        ]);
      
      if (roleError) {
        logs.push(`❌ Role Assignment Failed: ${roleError.message}`);
        setDebugInfo(logs.join('\n'));
        return { success: false, error: roleError.message };
      }
      
      logs.push('✅ Admin Role Assigned');
      logs.push('\n🎉 Test Admin User Created Successfully!');
      logs.push(`📧 Email: ${email}`);
      logs.push('🔑 You can now sign in with this account');
      
      setDebugInfo(logs.join('\n'));
      return { success: true };
      
    } catch (error) {
      logs.push(`❌ Unexpected Error: ${error}`);
      setDebugInfo(logs.join('\n'));
      return { success: false, error: String(error) };
    }
  };

  return {
    debugInfo,
    isDebugging,
    runDiagnostics,
    createTestAdmin
  };
};