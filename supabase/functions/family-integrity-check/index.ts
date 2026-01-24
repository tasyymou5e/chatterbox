import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IntegrityIssue {
  issue_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  entity_type: string;
  entity_id: string;
  family_id?: string;
  user_id?: string;
  description: string;
  auto_fix_available: boolean;
  proposed_fix?: ProposedFix;
  fix_preview?: string;
  metadata?: Record<string, unknown>;
}

interface ProposedFix {
  action: 'delete' | 'insert' | 'update';
  table: string;
  where?: Record<string, unknown>;
  data?: Record<string, unknown>;
  reason: string;
}

interface CheckResult {
  status: 'healthy' | 'issues_found' | 'error';
  issues: IntegrityIssue[];
  duration_ms: number;
  error_message?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Parse request
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const issueId = url.searchParams.get('issueId');
    
    // Validate admin auth for all operations
    const authHeader = req.headers.get('Authorization');
    let adminId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: `Bearer ${token}` } }
      });
      
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        // Check if user is admin
        const { data: isAdmin } = await supabase.rpc('check_admin_role_secure', { 
          check_user_id: user.id 
        });
        
        if (isAdmin) {
          adminId = user.id;
        }
      }
    }

    // Handle execute-fix action
    if (action === 'execute-fix' && issueId) {
      if (!adminId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Admin authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const result = await executeFix(supabase, issueId, adminId);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle approve action
    if (action === 'approve' && issueId) {
      if (!adminId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Admin authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const body = await req.json().catch(() => ({}));
      const result = await approveIssue(supabase, issueId, adminId, body.notes);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle reject action
    if (action === 'reject' && issueId) {
      if (!adminId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Admin authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const body = await req.json().catch(() => ({}));
      const result = await rejectIssue(supabase, issueId, adminId, body.reason);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle ignore action
    if (action === 'ignore' && issueId) {
      if (!adminId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Admin authentication required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const result = await ignoreIssue(supabase, issueId, adminId);
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default: Run integrity check
    const body = await req.json().catch(() => ({}));
    const checkType = body.checkType || 'manual';
    
    console.log(`Starting ${checkType} integrity check...`);
    const startTime = Date.now();
    
    // Run all integrity checks
    const checkResult = await runIntegrityChecks(supabase);
    checkResult.duration_ms = Date.now() - startTime;
    
    // Create check log entry
    const { data: checkLog, error: logError } = await supabase
      .from('integrity_check_logs')
      .insert({
        check_type: checkType,
        status: checkResult.status,
        issues_found: checkResult.issues.length,
        issues_auto_fixable: checkResult.issues.filter(i => i.auto_fix_available).length,
        check_duration_ms: checkResult.duration_ms,
        error_message: checkResult.error_message,
        triggered_by: adminId
      })
      .select()
      .single();
    
    if (logError) {
      console.error('Failed to create check log:', logError);
    }
    
    // Insert issues if any found
    if (checkResult.issues.length > 0 && checkLog) {
      const issuesToInsert = checkResult.issues.map(issue => ({
        check_log_id: checkLog.id,
        issue_type: issue.issue_type,
        severity: issue.severity,
        entity_type: issue.entity_type,
        entity_id: issue.entity_id,
        family_id: issue.family_id,
        user_id: issue.user_id,
        description: issue.description,
        auto_fix_available: issue.auto_fix_available,
        proposed_fix: issue.proposed_fix,
        fix_preview: issue.fix_preview,
        status: 'pending_review',
        metadata: issue.metadata || {}
      }));
      
      const { error: issuesError } = await supabase
        .from('integrity_issues')
        .insert(issuesToInsert);
      
      if (issuesError) {
        console.error('Failed to insert issues:', issuesError);
      }
      
      // Create system alert for critical issues
      const criticalIssues = checkResult.issues.filter(i => i.severity === 'critical');
      if (criticalIssues.length > 0) {
        await supabase.from('system_alerts').insert({
          alert_type: 'integrity_critical',
          severity: 'high',
          title: `${criticalIssues.length} Critical Data Integrity Issues Found`,
          message: `Integrity check detected ${criticalIssues.length} critical issue(s) requiring immediate attention. Check the integrity dashboard for details.`,
          source: 'family-integrity-check',
          metadata: { 
            check_log_id: checkLog.id,
            critical_count: criticalIssues.length,
            total_count: checkResult.issues.length
          }
        });
      }
    }
    
    console.log(`Integrity check completed: ${checkResult.status}, ${checkResult.issues.length} issues found in ${checkResult.duration_ms}ms`);
    
    return new Response(
      JSON.stringify({
        success: true,
        check_log_id: checkLog?.id,
        status: checkResult.status,
        issues_found: checkResult.issues.length,
        issues_auto_fixable: checkResult.issues.filter(i => i.auto_fix_available).length,
        duration_ms: checkResult.duration_ms
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Integrity check error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function runIntegrityChecks(supabase: ReturnType<typeof createClient>): Promise<CheckResult> {
  const issues: IntegrityIssue[] = [];
  
  try {
    // Check 1: Orphaned child accounts (child_accounts without family_members entry)
    const { data: orphanedChildAccounts } = await supabase
      .from('child_accounts')
      .select(`
        id,
        user_id,
        family_id,
        display_name,
        profiles!inner(email)
      `)
      .not('family_id', 'is', null);
    
    if (orphanedChildAccounts) {
      for (const ca of orphanedChildAccounts) {
        const { data: membership } = await supabase
          .from('family_members')
          .select('id')
          .eq('user_id', ca.user_id)
          .eq('family_id', ca.family_id)
          .maybeSingle();
        
        if (!membership) {
          issues.push({
            issue_type: 'orphaned_child_account',
            severity: 'critical',
            entity_type: 'child_account',
            entity_id: ca.id,
            family_id: ca.family_id,
            user_id: ca.user_id,
            description: `Child account "${ca.display_name}" has no corresponding family membership`,
            auto_fix_available: false,
            metadata: { display_name: ca.display_name, email: ca.profiles?.email }
          });
        }
      }
    }

    // Check 2: Duplicate family memberships
    const { data: duplicateMemberships } = await supabase
      .rpc('find_duplicate_family_memberships');
    
    if (duplicateMemberships && duplicateMemberships.length > 0) {
      for (const dup of duplicateMemberships) {
        // Get the duplicate records
        const { data: members } = await supabase
          .from('family_members')
          .select('id, created_at, role')
          .eq('user_id', dup.user_id)
          .eq('family_id', dup.family_id)
          .order('created_at', { ascending: true });
        
        if (members && members.length > 1) {
          const keepRecord = members[0];
          const duplicates = members.slice(1);
          
          for (const duplicate of duplicates) {
            issues.push({
              issue_type: 'duplicate_family_membership',
              severity: 'medium',
              entity_type: 'family_member',
              entity_id: duplicate.id,
              family_id: dup.family_id,
              user_id: dup.user_id,
              description: `Duplicate family membership found - user belongs to same family ${duplicates.length + 1} times`,
              auto_fix_available: true,
              proposed_fix: {
                action: 'delete',
                table: 'family_members',
                where: { id: duplicate.id },
                reason: `Duplicate of older record ${keepRecord.id}`
              },
              fix_preview: `Delete duplicate family_members record (ID: ${duplicate.id}). Original record from ${new Date(keepRecord.created_at).toLocaleDateString()} will be preserved.`,
              metadata: { 
                keep_record_id: keepRecord.id,
                duplicate_count: duplicates.length
              }
            });
          }
        }
      }
    }

    // Check 3: Missing user roles (child in family_members but no 'child' role in user_roles)
    const { data: childMembers } = await supabase
      .from('family_members')
      .select('id, user_id, family_id')
      .eq('role', 'child');
    
    if (childMembers) {
      for (const member of childMembers) {
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', member.user_id)
          .eq('role', 'child')
          .maybeSingle();
        
        if (!userRole) {
          issues.push({
            issue_type: 'missing_user_role',
            severity: 'high',
            entity_type: 'family_member',
            entity_id: member.id,
            family_id: member.family_id,
            user_id: member.user_id,
            description: `User has 'child' role in family but missing 'child' role in user_roles table`,
            auto_fix_available: true,
            proposed_fix: {
              action: 'insert',
              table: 'user_roles',
              data: { user_id: member.user_id, role: 'child' },
              reason: 'User is a child in family_members but missing role entry'
            },
            fix_preview: `Insert missing 'child' role into user_roles for user ${member.user_id}`
          });
        }
      }
    }

    // Check 4: Role mismatch (family_members.role != user_roles.role for child users)
    const { data: roleMismatches } = await supabase
      .from('family_members')
      .select(`
        id,
        user_id,
        family_id,
        role,
        user_roles!inner(role)
      `)
      .eq('role', 'child')
      .neq('user_roles.role', 'child');
    
    if (roleMismatches) {
      for (const mismatch of roleMismatches) {
        const userRolesArray = mismatch.user_roles as unknown as { role: string }[];
        const currentRole = userRolesArray?.[0]?.role || 'unknown';
        
        issues.push({
          issue_type: 'role_mismatch',
          severity: 'medium',
          entity_type: 'user_role',
          entity_id: mismatch.id,
          family_id: mismatch.family_id,
          user_id: mismatch.user_id,
          description: `Role mismatch: family_members says 'child' but user_roles says '${currentRole}'`,
          auto_fix_available: true,
          proposed_fix: {
            action: 'update',
            table: 'user_roles',
            where: { user_id: mismatch.user_id },
            data: { role: 'child' },
            reason: 'Aligning user_roles with family_members role'
          },
          fix_preview: `Update user_roles to 'child' for user ${mismatch.user_id} (currently '${currentRole}')`,
          metadata: { current_role: currentRole, expected_role: 'child' }
        });
      }
    }

    // Check 5: Orphaned family members (family_members referencing deleted family)
    const { data: allMembers } = await supabase
      .from('family_members')
      .select('id, user_id, family_id');
    
    if (allMembers) {
      for (const member of allMembers) {
        const { data: family } = await supabase
          .from('families')
          .select('id')
          .eq('id', member.family_id)
          .maybeSingle();
        
        if (!family) {
          issues.push({
            issue_type: 'orphaned_family_member',
            severity: 'high',
            entity_type: 'family_member',
            entity_id: member.id,
            family_id: member.family_id,
            user_id: member.user_id,
            description: `Family member record references non-existent family ${member.family_id}`,
            auto_fix_available: true,
            proposed_fix: {
              action: 'delete',
              table: 'family_members',
              where: { id: member.id },
              reason: 'Referenced family no longer exists'
            },
            fix_preview: `Delete orphaned family_members record (ID: ${member.id}) - family ${member.family_id} no longer exists`
          });
        }
      }
    }

    // Check 6: Missing parent link (child in family with no parent member)
    const { data: families } = await supabase
      .from('families')
      .select('id, family_name');
    
    if (families) {
      for (const family of families) {
        const { data: children } = await supabase
          .from('family_members')
          .select('id, user_id')
          .eq('family_id', family.id)
          .eq('role', 'child');
        
        if (children && children.length > 0) {
          const { data: parents } = await supabase
            .from('family_members')
            .select('id')
            .eq('family_id', family.id)
            .eq('role', 'parent');
          
          if (!parents || parents.length === 0) {
            for (const child of children) {
              issues.push({
                issue_type: 'missing_parent_link',
                severity: 'critical',
                entity_type: 'family',
                entity_id: family.id,
                family_id: family.id,
                user_id: child.user_id,
                description: `Family "${family.family_name}" has ${children.length} child(ren) but no parent member`,
                auto_fix_available: false,
                metadata: { 
                  family_name: family.family_name,
                  child_count: children.length
                }
              });
            }
            break; // Only report once per family
          }
        }
      }
    }

    // Check 7: Invalid family reference in child_accounts
    const { data: childAccountsWithInvalidFamily } = await supabase
      .from('child_accounts')
      .select('id, user_id, family_id, display_name');
    
    if (childAccountsWithInvalidFamily) {
      for (const ca of childAccountsWithInvalidFamily) {
        if (ca.family_id) {
          const { data: family } = await supabase
            .from('families')
            .select('id')
            .eq('id', ca.family_id)
            .maybeSingle();
          
          if (!family) {
            issues.push({
              issue_type: 'invalid_family_reference',
              severity: 'critical',
              entity_type: 'child_account',
              entity_id: ca.id,
              family_id: ca.family_id,
              user_id: ca.user_id,
              description: `Child account "${ca.display_name}" references non-existent family`,
              auto_fix_available: false,
              metadata: { display_name: ca.display_name }
            });
          }
        }
      }
    }

    // Check 8: Missing profile records for family members
    const { data: membersWithoutProfiles } = await supabase
      .from('family_members')
      .select(`
        id,
        user_id,
        family_id,
        role,
        families(name)
      `);
    
    if (membersWithoutProfiles) {
      for (const member of membersWithoutProfiles) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', member.user_id)
          .maybeSingle();
        
        if (!profile) {
          // Try to get data to create the profile
          const { data: childAccount } = await supabase
            .from('child_accounts')
            .select('first_name, last_name')
            .eq('user_id', member.user_id)
            .maybeSingle();
          
          const { data: authUser } = await supabase.auth.admin.getUserById(member.user_id);
          
          const firstName = childAccount?.first_name || 
            authUser?.user?.user_metadata?.first_name || 
            authUser?.user?.email?.split('@')[0] || 
            'Unknown';
          const lastName = childAccount?.last_name || 
            authUser?.user?.user_metadata?.last_name || 
            '';
          
          const familyName = (member.families as { name?: string } | null)?.name || 'Unknown';
          
          issues.push({
            issue_type: 'missing_profile_record',
            severity: 'high',
            entity_type: 'family_member',
            entity_id: member.id,
            family_id: member.family_id,
            user_id: member.user_id,
            description: `Family member in "${familyName}" (${member.role}) has no profile record - prevents game assignments and other features`,
            auto_fix_available: true,
            proposed_fix: {
              action: 'insert',
              table: 'profiles',
              data: { 
                id: crypto.randomUUID(),
                user_id: member.user_id, 
                first_name: firstName,
                last_name: lastName,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              reason: 'Create missing profile record from available user data'
            },
            fix_preview: `Create profile for user ${member.user_id} with name "${firstName} ${lastName}"`,
            metadata: { 
              role: member.role,
              email: authUser?.user?.email,
              first_name: firstName,
              last_name: lastName
            }
          });
        }
      }
    }

    return {
      status: issues.length > 0 ? 'issues_found' : 'healthy',
      issues,
      duration_ms: 0
    };
    
  } catch (error) {
    console.error('Error running integrity checks:', error);
    return {
      status: 'error',
      issues: [],
      duration_ms: 0,
      error_message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function approveIssue(
  supabase: ReturnType<typeof createClient>,
  issueId: string,
  adminId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  // Get the issue
  const { data: issue, error: fetchError } = await supabase
    .from('integrity_issues')
    .select('*')
    .eq('id', issueId)
    .single();
  
  if (fetchError || !issue) {
    return { success: false, error: 'Issue not found' };
  }
  
  if (issue.status !== 'pending_review') {
    return { success: false, error: `Issue is already ${issue.status}` };
  }
  
  // Update status to approved
  const { error: updateError } = await supabase
    .from('integrity_issues')
    .update({
      status: 'approved',
      approved_by: adminId,
      approved_at: new Date().toISOString()
    })
    .eq('id', issueId);
  
  if (updateError) {
    return { success: false, error: updateError.message };
  }
  
  // Create audit log
  await supabase.from('integrity_fix_audit').insert({
    issue_id: issueId,
    action: 'approved',
    admin_id: adminId,
    notes
  });
  
  return { success: true };
}

async function rejectIssue(
  supabase: ReturnType<typeof createClient>,
  issueId: string,
  adminId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const { data: issue, error: fetchError } = await supabase
    .from('integrity_issues')
    .select('*')
    .eq('id', issueId)
    .single();
  
  if (fetchError || !issue) {
    return { success: false, error: 'Issue not found' };
  }
  
  const { error: updateError } = await supabase
    .from('integrity_issues')
    .update({
      status: 'rejected',
      rejection_reason: reason
    })
    .eq('id', issueId);
  
  if (updateError) {
    return { success: false, error: updateError.message };
  }
  
  await supabase.from('integrity_fix_audit').insert({
    issue_id: issueId,
    action: 'rejected',
    admin_id: adminId,
    notes: reason
  });
  
  return { success: true };
}

async function ignoreIssue(
  supabase: ReturnType<typeof createClient>,
  issueId: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  const { error: updateError } = await supabase
    .from('integrity_issues')
    .update({ status: 'ignored' })
    .eq('id', issueId);
  
  if (updateError) {
    return { success: false, error: updateError.message };
  }
  
  await supabase.from('integrity_fix_audit').insert({
    issue_id: issueId,
    action: 'ignored',
    admin_id: adminId
  });
  
  return { success: true };
}

async function executeFix(
  supabase: ReturnType<typeof createClient>,
  issueId: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  // Get the issue
  const { data: issue, error: fetchError } = await supabase
    .from('integrity_issues')
    .select('*')
    .eq('id', issueId)
    .single();
  
  if (fetchError || !issue) {
    return { success: false, error: 'Issue not found' };
  }
  
  if (issue.status !== 'approved') {
    return { success: false, error: 'Issue must be approved before execution' };
  }
  
  if (!issue.auto_fix_available || !issue.proposed_fix) {
    return { success: false, error: 'No auto-fix available for this issue' };
  }
  
  const fix = issue.proposed_fix as ProposedFix;
  let oldData: Record<string, unknown> | null = null;
  
  try {
    // Capture old data for audit
    if (fix.action !== 'insert' && fix.where) {
      const whereKey = Object.keys(fix.where)[0];
      const whereValue = fix.where[whereKey];
      
      const { data } = await supabase
        .from(fix.table)
        .select('*')
        .eq(whereKey, whereValue)
        .maybeSingle();
      
      oldData = data;
    }
    
    // Execute the fix
    if (fix.action === 'delete' && fix.where) {
      const whereKey = Object.keys(fix.where)[0];
      const whereValue = fix.where[whereKey];
      
      const { error } = await supabase
        .from(fix.table)
        .delete()
        .eq(whereKey, whereValue);
      
      if (error) throw error;
      
    } else if (fix.action === 'insert' && fix.data) {
      const { error } = await supabase
        .from(fix.table)
        .insert(fix.data);
      
      if (error) throw error;
      
    } else if (fix.action === 'update' && fix.where && fix.data) {
      const whereKey = Object.keys(fix.where)[0];
      const whereValue = fix.where[whereKey];
      
      const { error } = await supabase
        .from(fix.table)
        .update(fix.data)
        .eq(whereKey, whereValue);
      
      if (error) throw error;
    }
    
    // Update issue status
    await supabase
      .from('integrity_issues')
      .update({
        status: 'fixed',
        fixed_at: new Date().toISOString()
      })
      .eq('id', issueId);
    
    // Create audit log
    await supabase.from('integrity_fix_audit').insert({
      issue_id: issueId,
      action: 'executed',
      admin_id: adminId,
      old_data: oldData,
      new_data: fix.action === 'delete' ? null : fix.data
    });
    
    return { success: true };
    
  } catch (error) {
    console.error('Fix execution failed:', error);
    
    // Log failure
    await supabase.from('integrity_fix_audit').insert({
      issue_id: issueId,
      action: 'failed',
      admin_id: adminId,
      notes: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Fix execution failed' 
    };
  }
}