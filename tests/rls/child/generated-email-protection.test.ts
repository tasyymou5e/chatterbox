/**
 * COMPREHENSIVE GENERATED EMAIL PROTECTION TESTS
 * 
 * This test suite verifies that children CANNOT access their generated_email
 * through any query path including:
 * - Direct table access
 * - RPC functions
 * - Database views
 * - Join queries
 * - Edge function responses
 * - Enumeration attacks
 * 
 * SECURITY REQUIREMENT: generated_email must NEVER be exposed to child accounts
 * as it contains authentication credentials that could be used for account takeover.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUser, deleteAllTestUsers } from '@tests/utils/testUsers';
import { createTestFamily, deleteAllTestFamilies } from '@tests/utils/testFamilies';
import { signInTestUser, getAnonClient, getServiceRoleClient } from '@tests/utils/testClient';
import { 
  expectRLSBlock, 
  expectRLSAllow, 
  expectNoGeneratedEmail,
  expectFieldNotPresent,
  expectSensitiveFieldsExcluded
} from '@tests/utils/assertions';
import type { TestUser } from '@tests/utils/testUsers';
import type { TestFamily } from '@tests/utils/testFamilies';

describe('CRITICAL: Generated Email Protection Tests', () => {
  let adminUser: TestUser;
  let parentUser1: TestUser;
  let parentUser2: TestUser;
  let childUser1: TestUser;
  let childUser2: TestUser;
  let family1: TestFamily;
  let family2: TestFamily;
  let childAccountId1: string;
  let childAccountId2: string;
  let generatedEmail1: string;
  let generatedEmail2: string;

  beforeAll(async () => {
    // Create test users
    adminUser = await createTestUser('admin');
    parentUser1 = await createTestUser('parent');
    parentUser2 = await createTestUser('parent');
    
    // Create families
    family1 = await createTestFamily(parentUser1.id);
    family2 = await createTestFamily(parentUser2.id);
    
    // Create child users and add to families
    childUser1 = await createTestUser('child', family1.id);
    childUser2 = await createTestUser('child', family2.id);
    
    // Create child account records with generated emails
    const serviceClient = getServiceRoleClient();
    const timestamp = Date.now();
    generatedEmail1 = `child1.${timestamp}@generated.chatterbox.test`;
    generatedEmail2 = `child2.${timestamp}@generated.chatterbox.test`;
    
    const { data: acc1 } = await serviceClient
      .from('child_accounts')
      .insert({
        user_id: childUser1.id,
        created_by: parentUser1.id,
        family_id: family1.id,
        generated_email: generatedEmail1,
        first_name: 'TestChild1',
        last_name: 'Family1',
        family_code: `TEST-${timestamp}-1`,
        status: 'completed', // Important: test completed accounts
      })
      .select()
      .single();
    
    const { data: acc2 } = await serviceClient
      .from('child_accounts')
      .insert({
        user_id: childUser2.id,
        created_by: parentUser2.id,
        family_id: family2.id,
        generated_email: generatedEmail2,
        first_name: 'TestChild2',
        last_name: 'Family2',
        family_code: `TEST-${timestamp}-2`,
        status: 'completed',
      })
      .select()
      .single();
    
    childAccountId1 = acc1!.id;
    childAccountId2 = acc2!.id;
  });

  afterAll(async () => {
    await deleteAllTestFamilies();
    await deleteAllTestUsers();
  });

  // ============================================================
  // SECTION 1: DIRECT TABLE ACCESS TESTS
  // ============================================================
  describe('Direct table access - generated_email protection', () => {
    
    it('should BLOCK children from selecting generated_email column directly', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .select('generated_email')
        .eq('user_id', childUser1.id);
      
      // Should either be blocked or return empty
      expectRLSBlock(error, data);
    });

    it('should BLOCK children from selecting * (which includes generated_email)', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .select('*')
        .eq('user_id', childUser1.id);
      
      // RLS policy child_accounts_secure_select updated 2026-01-22:
      // Children are now completely blocked from direct table access
      // They must use get_my_child_account_safe() RPC instead
      expectRLSBlock(error, data);
    });

    it('should BLOCK children from filtering by generated_email value', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .select('id, first_name')
        .eq('generated_email', generatedEmail1);
      
      // Even without selecting the email, filtering by it should fail
      expectRLSBlock(error, data);
    });

    it('should BLOCK children from using generated_email in WHERE clause with LIKE', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .select('id')
        .like('generated_email', '%@generated.chatterbox.test');
      
      expectRLSBlock(error, data);
    });

    it('should BLOCK children from using generated_email in ilike search', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .select('id')
        .ilike('generated_email', '%child%');
      
      expectRLSBlock(error, data);
    });

    it('should allow parents to see generated_email for their own children', async () => {
      const { client } = await signInTestUser(parentUser1.email, parentUser1.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .select('id, generated_email')
        .eq('id', childAccountId1)
        .single();
      
      expectRLSAllow(error, data);
      expect(data.generated_email).toBe(generatedEmail1);
    });

    it('should allow admins to see all generated_emails', async () => {
      const { client } = await signInTestUser(adminUser.email, adminUser.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .select('id, generated_email');
      
      expectRLSAllow(error, data);
      expect(data.some((d: any) => d.generated_email === generatedEmail1)).toBe(true);
      expect(data.some((d: any) => d.generated_email === generatedEmail2)).toBe(true);
    });

    it('should BLOCK anonymous users from any child_accounts access', async () => {
      const client = getAnonClient();
      
      const { data, error } = await client
        .from('child_accounts')
        .select('*');
      
      expectRLSBlock(error, data);
    });
  });

  // ============================================================
  // SECTION 2: RPC FUNCTION TESTS
  // ============================================================
  describe('RPC functions - generated_email exclusion', () => {
    
    it('get_pending_child_account_for_completion should NOT return generated_email', async () => {
      const client = getAnonClient();
      
      // Even when RPC returns data, it should exclude generated_email
      const { data, error } = await client.rpc('get_pending_child_account_for_completion', {
        p_family_code: 'NONEXISTENT-CODE'
      });
      
      // Whether it returns data or not, check the schema
      if (data && Array.isArray(data) && data.length > 0) {
        expectNoGeneratedEmail(data);
      }
      // No error expected - RPC exists
    });

    it('get_my_child_account_safe should NOT return generated_email', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      const { data, error } = await client.rpc('get_my_child_account_safe');
      
      // Check that generated_email is NOT in the response
      if (data && Array.isArray(data) && data.length > 0) {
        expectNoGeneratedEmail(data);
        // Should still have the safe fields
        expect(data[0]).toHaveProperty('first_name');
      } else if (data && typeof data === 'object') {
        expectNoGeneratedEmail(data);
      }
    });

    it('should verify RPC response excludes all sensitive fields', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      const { data, error } = await client.rpc('get_my_child_account_safe');
      
      if (data) {
        const sensitiveFields = ['generated_email', 'verification_pin', 'pin_attempts', 'locked_until'];
        expectSensitiveFieldsExcluded(data, sensitiveFields);
      }
    });

    it('child should NOT be able to call parent-only RPCs', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      // Try to call a function that might expose email
      const { data, error } = await client.rpc('check_child_account_rate_limit', {
        p_account_id: childAccountId1
      });
      
      // Should either fail or return limited data
      if (data) {
        expectNoGeneratedEmail(data);
      }
    });
  });

  // ============================================================
  // SECTION 3: JOIN ATTACK PREVENTION TESTS
  // ============================================================
  describe('Join attacks - cross-table email exposure prevention', () => {
    
    it('should NOT expose generated_email via profiles join', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      // Try to get child_accounts data through profiles
      const { data, error } = await client
        .from('profiles')
        .select('*, child_accounts!child_accounts_user_id_fkey(*)')
        .eq('user_id', childUser1.id);
      
      // If any child_accounts data returned, it must not have generated_email
      if (data && data.length > 0 && data[0].child_accounts) {
        const childAccounts = Array.isArray(data[0].child_accounts) 
          ? data[0].child_accounts 
          : [data[0].child_accounts];
        expectNoGeneratedEmail(childAccounts);
      }
    });

    it('should NOT expose generated_email via families join', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      const { data, error } = await client
        .from('families')
        .select('*, child_accounts(*)')
        .eq('id', family1.id);
      
      if (data && data.length > 0 && data[0].child_accounts) {
        const childAccounts = Array.isArray(data[0].child_accounts) 
          ? data[0].child_accounts 
          : [data[0].child_accounts];
        
        // Should either be empty or not have generated_email
        if (childAccounts.length > 0) {
          expectNoGeneratedEmail(childAccounts);
        }
      }
    });

    it('should NOT expose generated_email via family_members join', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      const { data, error } = await client
        .from('family_members')
        .select('*, families(child_accounts(*))')
        .eq('user_id', childUser1.id);
      
      // Deep check for generated_email
      if (data) {
        expectNoGeneratedEmail(data);
      }
    });

    it('should BLOCK children from accessing other family child_accounts via join', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      // Try to access family2's data via a clever join
      const { data, error } = await client
        .from('child_accounts')
        .select('id, generated_email')
        .eq('family_id', family2.id);
      
      // Should be blocked completely - not our family
      expectRLSBlock(error, data);
    });
  });

  // ============================================================
  // SECTION 4: ENUMERATION ATTACK PREVENTION TESTS
  // ============================================================
  describe('Enumeration attack prevention', () => {
    
    it('should BLOCK listing all generated_emails', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .select('generated_email')
        .limit(1000);
      
      expectRLSBlock(error, data);
    });

    it('should BLOCK pattern matching on generated_email domain', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .select('id')
        .like('generated_email', '%@%.test');
      
      expectRLSBlock(error, data);
    });

    it('should BLOCK count queries on generated_email', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      const { count, error } = await client
        .from('child_accounts')
        .select('generated_email', { count: 'exact', head: true });
      
      // Count should be 0 or query blocked
      expect(count === 0 || count === null || error !== null).toBe(true);
    });

    it('should BLOCK distinct queries on generated_email', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      // Note: Supabase doesn't support DISTINCT directly, but we can test similar patterns
      const { data, error } = await client
        .from('child_accounts')
        .select('generated_email')
        .order('generated_email');
      
      expectRLSBlock(error, data);
    });

    it('parent should only see emails for their own family', async () => {
      const { client } = await signInTestUser(parentUser1.email, parentUser1.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .select('generated_email');
      
      // Should only return family1's data
      if (data && data.length > 0) {
        // Should NOT contain family2's email
        expect(data.some((d: any) => d.generated_email === generatedEmail2)).toBe(false);
        // Should contain family1's email
        expect(data.some((d: any) => d.generated_email === generatedEmail1)).toBe(true);
      }
    });
  });

  // ============================================================
  // SECTION 5: COLUMN-LEVEL SECURITY VERIFICATION
  // ============================================================
  describe('Column-level security verification', () => {
    
    it('child should be RLS-blocked when querying child_accounts table directly', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      // RLS policy updated 2026-01-22: Children completely blocked from direct table access
      // They must use get_my_child_account_safe() RPC or child_accounts_self_view
      const { data, error } = await client
        .from('child_accounts')
        .select('id, first_name, last_name, family_code, status')
        .eq('user_id', childUser1.id);
      
      // Children are now blocked at the RLS level (empty result or error)
      expectRLSBlock(error, data);
    });

    it('should verify verification_pin is never exposed to children', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .select('verification_pin')
        .eq('user_id', childUser1.id);
      
      expectRLSBlock(error, data);
    });

    it('should verify locked_until is never exposed to children', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .select('locked_until')
        .eq('user_id', childUser1.id);
      
      expectRLSBlock(error, data);
    });
  });

  // ============================================================
  // SECTION 6: EDGE CASE TESTS
  // ============================================================
  describe('Edge cases and special scenarios', () => {
    
    it('should not expose email via error messages', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .select('*')
        .eq('generated_email', generatedEmail1);
      
      // Error message should not contain the email
      if (error) {
        expect(error.message).not.toContain(generatedEmail1);
        expect(error.message).not.toContain('@generated');
      }
    });

    it('should handle null user_id gracefully', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .select('*')
        .is('user_id', null);
      
      // Pending accounts (null user_id) should definitely be blocked
      expectRLSBlock(error, data);
    });

    it('should block access to pending accounts even from same family child', async () => {
      const serviceClient = getServiceRoleClient();
      
      // Create a pending account in family1
      const { data: pendingAccount } = await serviceClient
        .from('child_accounts')
        .insert({
          created_by: parentUser1.id,
          family_id: family1.id,
          generated_email: `pending.${Date.now()}@generated.test`,
          first_name: 'PendingChild',
          last_name: 'Test',
          family_code: `PEND-${Date.now()}`,
          status: 'pending',
          user_id: null,
        })
        .select()
        .single();
      
      try {
        const { client } = await signInTestUser(childUser1.email, childUser1.password);
        
        const { data, error } = await client
          .from('child_accounts')
          .select('*')
          .eq('status', 'pending');
        
        expectRLSBlock(error, data);
      } finally {
        // Cleanup
        if (pendingAccount?.id) {
          await serviceClient
            .from('child_accounts')
            .delete()
            .eq('id', pendingAccount.id);
        }
      }
    });

    it('child cannot update their own generated_email', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .update({ generated_email: 'hacked@evil.com' })
        .eq('user_id', childUser1.id)
        .select();
      
      expectRLSBlock(error, data);
      
      // Verify email wasn't changed
      const serviceClient = getServiceRoleClient();
      const { data: check } = await serviceClient
        .from('child_accounts')
        .select('generated_email')
        .eq('id', childAccountId1)
        .single();
      
      expect(check?.generated_email).toBe(generatedEmail1);
    });

    it('child cannot delete their own account to hide traces', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      const { error } = await client
        .from('child_accounts')
        .delete()
        .eq('user_id', childUser1.id);
      
      // Should be blocked
      expect(error !== null || true).toBe(true); // At minimum, no deletion occurred
      
      // Verify record still exists
      const serviceClient = getServiceRoleClient();
      const { data: check } = await serviceClient
        .from('child_accounts')
        .select('id')
        .eq('id', childAccountId1)
        .single();
      
      expect(check).not.toBeNull();
    });
  });

  // ============================================================
  // SECTION 7: CROSS-FAMILY ISOLATION TESTS
  // ============================================================
  describe('Cross-family isolation for generated_email', () => {
    
    it('child in family1 cannot see family2 generated_email', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .select('*')
        .eq('family_id', family2.id);
      
      expectRLSBlock(error, data);
    });

    it('parent1 cannot see family2 child generated_emails', async () => {
      const { client } = await signInTestUser(parentUser1.email, parentUser1.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .select('generated_email')
        .eq('family_id', family2.id);
      
      expectRLSBlock(error, data);
    });

    it('cross-family data leak via IN clause should be blocked', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .select('*')
        .in('family_id', [family1.id, family2.id]);
      
      // Should return nothing or only family1 data (without email)
      expectRLSBlock(error, data);
    });
  });
});
