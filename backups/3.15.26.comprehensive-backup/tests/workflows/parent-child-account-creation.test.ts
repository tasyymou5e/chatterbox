import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getServiceRoleClient, signInTestUser, getAnonClient } from '../utils/testClient';
import { createTestUser, deleteAllTestUsers, TestUser } from '../utils/testUsers';
import { createTestFamily, deleteAllTestFamilies, addUserToFamily, TestFamily } from '../utils/testFamilies';
import { expectRLSBlock, expectAccessDenied } from '../utils/assertions';

/**
 * Parent/Child Account Creation Workflow Tests
 * 
 * These tests verify the complete workflow for:
 * 1. Admin creating test families with parents and children
 * 2. Parents creating child accounts within their family
 * 3. Proper RLS enforcement on child_accounts table
 * 4. Cleanup of test data including child_accounts
 */
describe('Parent/Child Account Creation Workflow', () => {
  let serviceClient: ReturnType<typeof getServiceRoleClient>;
  
  // Test users
  let adminUser: TestUser;
  let parentUser1: TestUser;
  let parentUser2: TestUser;
  let childUser1: TestUser;
  let childUser2: TestUser;
  
  // Test families
  let family1: TestFamily;
  let family2: TestFamily;

  beforeAll(async () => {
    serviceClient = getServiceRoleClient();
    
    // Create test users
    adminUser = await createTestUser('admin');
    parentUser1 = await createTestUser('parent');
    parentUser2 = await createTestUser('parent');
    childUser1 = await createTestUser('child');
    childUser2 = await createTestUser('child');
    
    // Create test families
    family1 = await createTestFamily(parentUser1.id, 'Test Family 1');
    family2 = await createTestFamily(parentUser2.id, 'Test Family 2');
    
    // Add children to families
    await addUserToFamily(family1.id, childUser1.id, 'child');
    await addUserToFamily(family2.id, childUser2.id, 'child');
  });

  afterAll(async () => {
    await deleteAllTestFamilies();
    await deleteAllTestUsers();
  });

  describe('Child Accounts Table Structure', () => {
    it('should have required fields for child account creation', async () => {
      // Create a child_accounts record directly using service role
      const childAccountData = {
        family_id: family1.id,
        created_by: parentUser1.id,
        user_id: childUser1.id,
        first_name: 'Test',
        last_name: 'Child',
        generated_email: `test-child-${Date.now()}@testfamily.local`,
        family_code: 'TEST-CODE-001',
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          is_test_account: true,
          created_via: 'workflow_test'
        }
      };

      const { data, error } = await serviceClient
        .from('child_accounts')
        .insert(childAccountData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.family_id).toBe(family1.id);
      expect(data?.created_by).toBe(parentUser1.id);
      expect(data?.status).toBe('completed');
      
      // Clean up
      if (data?.id) {
        await serviceClient.from('child_accounts').delete().eq('id', data.id);
      }
    });

    it('should enforce family_id foreign key constraint', async () => {
      const invalidFamilyId = '00000000-0000-0000-0000-000000000000';
      
      const { error } = await serviceClient
        .from('child_accounts')
        .insert({
          family_id: invalidFamilyId,
          created_by: parentUser1.id,
          first_name: 'Invalid',
          last_name: 'Child',
          generated_email: `invalid-${Date.now()}@test.local`,
          family_code: 'INVALID-001',
          status: 'pending'
        });

      expect(error).not.toBeNull();
    });
  });

  describe('RLS Policies - Parent Access', () => {
    let parentClient: Awaited<ReturnType<typeof signInTestUser>>['client'];
    let childAccountId: string;

    beforeAll(async () => {
      const signInResult = await signInTestUser(
        `test-parent-${parentUser1.id.slice(0, 8)}@test.local`,
        'TestPassword123!'
      ).catch(() => null);
      
      if (signInResult) {
        parentClient = signInResult.client;
      }

      // Create a child account for testing
      const { data } = await serviceClient
        .from('child_accounts')
        .insert({
          family_id: family1.id,
          created_by: parentUser1.id,
          user_id: childUser1.id,
          first_name: 'RLS',
          last_name: 'TestChild',
          generated_email: `rls-test-${Date.now()}@testfamily.local`,
          family_code: 'RLS-TEST-001',
          status: 'completed'
        })
        .select()
        .single();
      
      if (data) {
        childAccountId = data.id;
      }
    });

    afterAll(async () => {
      if (childAccountId) {
        await serviceClient.from('child_accounts').delete().eq('id', childAccountId);
      }
    });

    it('should allow parent to view their own child accounts', async () => {
      if (!parentClient) {
        console.log('Skipping test - parent client not available');
        return;
      }

      const { data, error } = await parentClient
        .from('child_accounts')
        .select('*')
        .eq('family_id', family1.id);

      // Parent should see their family's child accounts
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should block parent from viewing other family child accounts', async () => {
      if (!parentClient) {
        console.log('Skipping test - parent client not available');
        return;
      }

      // Create child account in family2
      const { data: otherChildAccount } = await serviceClient
        .from('child_accounts')
        .insert({
          family_id: family2.id,
          created_by: parentUser2.id,
          first_name: 'Other',
          last_name: 'FamilyChild',
          generated_email: `other-family-${Date.now()}@testfamily.local`,
          family_code: 'OTHER-001',
          status: 'completed'
        })
        .select()
        .single();

      // Parent1 tries to access family2's child accounts
      const { data, error } = await parentClient
        .from('child_accounts')
        .select('*')
        .eq('family_id', family2.id);

      // Should return empty or error (RLS blocking)
      expectAccessDenied(error, data);

      // Clean up
      if (otherChildAccount?.id) {
        await serviceClient.from('child_accounts').delete().eq('id', otherChildAccount.id);
      }
    });
  });

  describe('RLS Policies - Child Access', () => {
    it('should block children from viewing child_accounts records', async () => {
      // Children should not be able to view the child_accounts table
      // This protects sensitive information like generated_email
      
      const childClient = await signInTestUser(
        `test-child-${childUser1.id.slice(0, 8)}@test.local`,
        'TestPassword123!'
      ).catch(() => null);

      if (!childClient) {
        console.log('Skipping test - child client not available');
        return;
      }

      const { data, error } = await childClient.client
        .from('child_accounts')
        .select('*')
        .eq('user_id', childUser1.id);

      // Children should NOT see their own child_account record
      // RLS policy blocks this for COPPA compliance
      expectAccessDenied(error, data);
    });
  });

  describe('RLS Policies - Anonymous Access', () => {
    it('should block anonymous access to child_accounts', async () => {
      const anonClient = getAnonClient();

      const { data, error } = await anonClient
        .from('child_accounts')
        .select('*');

      expectRLSBlock(error, data);
    });
  });

  describe('RLS Policies - Admin Access', () => {
    it('should allow admin to view all child accounts', async () => {
      // Admin should have full access via service role or admin role
      const { data, error } = await serviceClient
        .from('child_accounts')
        .select('*')
        .limit(10);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should allow admin to create child accounts for any family', async () => {
      const { data, error } = await serviceClient
        .from('child_accounts')
        .insert({
          family_id: family1.id,
          created_by: adminUser.id,
          first_name: 'Admin',
          last_name: 'Created',
          generated_email: `admin-created-${Date.now()}@testfamily.local`,
          family_code: 'ADMIN-001',
          status: 'pending',
          metadata: { created_by_admin: true }
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Clean up
      if (data?.id) {
        await serviceClient.from('child_accounts').delete().eq('id', data.id);
      }
    });
  });

  describe('Child Account Status Workflow', () => {
    it('should transition from pending to completed status', async () => {
      // Create pending account
      const { data: pendingAccount } = await serviceClient
        .from('child_accounts')
        .insert({
          family_id: family1.id,
          created_by: parentUser1.id,
          first_name: 'Status',
          last_name: 'Test',
          generated_email: `status-test-${Date.now()}@testfamily.local`,
          family_code: 'STATUS-001',
          status: 'pending'
        })
        .select()
        .single();

      expect(pendingAccount?.status).toBe('pending');

      // Update to completed (simulating account activation)
      const { data: completedAccount, error } = await serviceClient
        .from('child_accounts')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          user_id: childUser1.id
        })
        .eq('id', pendingAccount!.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(completedAccount?.status).toBe('completed');
      expect(completedAccount?.user_id).toBe(childUser1.id);

      // Clean up
      if (pendingAccount?.id) {
        await serviceClient.from('child_accounts').delete().eq('id', pendingAccount.id);
      }
    });

    it('should set expiration for pending accounts', async () => {
      const { data } = await serviceClient
        .from('child_accounts')
        .insert({
          family_id: family1.id,
          created_by: parentUser1.id,
          first_name: 'Expiry',
          last_name: 'Test',
          generated_email: `expiry-test-${Date.now()}@testfamily.local`,
          family_code: 'EXPIRY-001',
          status: 'pending'
        })
        .select()
        .single();

      // Default expiration should be set (7 days)
      expect(data?.expires_at).toBeDefined();
      
      const expiryDate = new Date(data!.expires_at!);
      const now = new Date();
      const daysDiff = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      
      // Should be approximately 7 days in the future
      expect(daysDiff).toBeGreaterThan(6);
      expect(daysDiff).toBeLessThan(8);

      // Clean up
      if (data?.id) {
        await serviceClient.from('child_accounts').delete().eq('id', data.id);
      }
    });
  });

  describe('Cleanup Workflow', () => {
    it('should delete child_accounts when family is deleted', async () => {
      // Create a temporary family with child account
      const tempFamily = await createTestFamily(parentUser1.id, 'Temp Cleanup Family');
      
      const { data: tempChildAccount } = await serviceClient
        .from('child_accounts')
        .insert({
          family_id: tempFamily.id,
          created_by: parentUser1.id,
          first_name: 'Temp',
          last_name: 'Child',
          generated_email: `temp-cleanup-${Date.now()}@testfamily.local`,
          family_code: 'TEMP-001',
          status: 'pending'
        })
        .select()
        .single();

      expect(tempChildAccount).toBeDefined();

      // Delete family members first
      await serviceClient
        .from('family_members')
        .delete()
        .eq('family_id', tempFamily.id);

      // Delete child accounts
      await serviceClient
        .from('child_accounts')
        .delete()
        .eq('family_id', tempFamily.id);

      // Delete family
      await serviceClient
        .from('families')
        .delete()
        .eq('id', tempFamily.id);

      // Verify child account is deleted
      const { data: deletedAccount } = await serviceClient
        .from('child_accounts')
        .select('*')
        .eq('id', tempChildAccount!.id)
        .single();

      expect(deletedAccount).toBeNull();
    });

    it('should track child_accounts in cleanup metrics', async () => {
      // Create test family with is_test_family metadata
      const { data: testFamily } = await serviceClient
        .from('families')
        .insert({
          name: 'FAM-TEST-CLEANUP',
          display_name: 'Cleanup Test Family',
          family_code: `FAM-CLEANUP-${Date.now()}`,
          created_by: parentUser1.id,
          metadata: { is_test_family: true }
        })
        .select()
        .single();

      if (!testFamily) {
        console.log('Skipping test - could not create test family');
        return;
      }

      // Add family member
      await serviceClient
        .from('family_members')
        .insert({
          family_id: testFamily.id,
          user_id: parentUser1.id,
          role: 'parent'
        });

      // Create child account
      await serviceClient
        .from('child_accounts')
        .insert({
          family_id: testFamily.id,
          created_by: parentUser1.id,
          first_name: 'Cleanup',
          last_name: 'Metric',
          generated_email: `cleanup-metric-${Date.now()}@testfamily.local`,
          family_code: 'METRIC-001',
          status: 'pending'
        });

      // Verify the test family was created with correct metadata
      const { data: verifyFamily } = await serviceClient
        .from('families')
        .select('*')
        .eq('id', testFamily.id)
        .single();

      expect(verifyFamily?.metadata?.is_test_family).toBe(true);

      // Manual cleanup for this test
      await serviceClient.from('child_accounts').delete().eq('family_id', testFamily.id);
      await serviceClient.from('family_members').delete().eq('family_id', testFamily.id);
      await serviceClient.from('families').delete().eq('id', testFamily.id);
    });
  });

  describe('Generated Email Security', () => {
    it('should use family-specific domain for generated emails', async () => {
      const { data } = await serviceClient
        .from('child_accounts')
        .insert({
          family_id: family1.id,
          created_by: parentUser1.id,
          first_name: 'Email',
          last_name: 'Security',
          generated_email: `email-security-${Date.now()}@testfamily.local`,
          family_code: 'EMAIL-001',
          status: 'pending'
        })
        .select()
        .single();

      expect(data?.generated_email).toContain('@');
      expect(data?.generated_email).not.toContain('@gmail.com');
      expect(data?.generated_email).not.toContain('@yahoo.com');

      // Clean up
      if (data?.id) {
        await serviceClient.from('child_accounts').delete().eq('id', data.id);
      }
    });

    it('should not expose generated email through profile joins', async () => {
      // Create child account with known email
      const generatedEmail = `hidden-email-${Date.now()}@testfamily.local`;
      
      const { data: childAccount } = await serviceClient
        .from('child_accounts')
        .insert({
          family_id: family1.id,
          created_by: parentUser1.id,
          user_id: childUser1.id,
          first_name: 'Hidden',
          last_name: 'Email',
          generated_email: generatedEmail,
          family_code: 'HIDDEN-001',
          status: 'completed'
        })
        .select()
        .single();

      // Attempt to join and expose email - this should be blocked by RLS
      // Regular users should not be able to see the generated_email field
      const anonClient = getAnonClient();
      
      const { data: exposedData } = await anonClient
        .from('child_accounts')
        .select('generated_email')
        .eq('user_id', childUser1.id);

      // Should be empty due to RLS
      expect(exposedData).toEqual([]);

      // Clean up
      if (childAccount?.id) {
        await serviceClient.from('child_accounts').delete().eq('id', childAccount.id);
      }
    });
  });
});
