import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUser, deleteAllTestUsers } from '@tests/utils/testUsers';
import { createTestFamily, deleteAllTestFamilies } from '@tests/utils/testFamilies';
import { signInTestUser, getAnonClient, getServiceRoleClient } from '@tests/utils/testClient';
import { expectRLSBlock, expectRLSAllow } from '@tests/utils/assertions';
import type { TestUser } from '@tests/utils/testUsers';
import type { TestFamily } from '@tests/utils/testFamilies';

describe('child_accounts table RLS policies - COPPA Compliance', () => {
  let adminUser: TestUser;
  let parentUser1: TestUser;
  let parentUser2: TestUser;
  let childUser1: TestUser;
  let childUser2: TestUser;
  let family1: TestFamily;
  let family2: TestFamily;
  let childAccountId1: string;
  let childAccountId2: string;

  beforeAll(async () => {
    adminUser = await createTestUser('admin');
    parentUser1 = await createTestUser('parent');
    parentUser2 = await createTestUser('parent');
    
    family1 = await createTestFamily(parentUser1.id);
    family2 = await createTestFamily(parentUser2.id);
    
    childUser1 = await createTestUser('child', family1.id);
    childUser2 = await createTestUser('child', family2.id);
    
    // Create child account records using service role
    const serviceClient = getServiceRoleClient();
    
    const { data: acc1 } = await serviceClient
      .from('child_accounts')
      .insert({
        user_id: childUser1.id,
        parent_user_id: parentUser1.id,
        generated_email: `child1.${Date.now()}@generated.test`,
        date_of_birth: '2015-01-01',
      })
      .select()
      .single();
    
    const { data: acc2 } = await serviceClient
      .from('child_accounts')
      .insert({
        user_id: childUser2.id,
        parent_user_id: parentUser2.id,
        generated_email: `child2.${Date.now()}@generated.test`,
        date_of_birth: '2016-06-15',
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

  describe('SELECT policies - CRITICAL: Generated Email Protection', () => {
    it('should allow parents to view their own child accounts', async () => {
      const { client } = await signInTestUser(parentUser1.email, parentUser1.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .select('*')
        .eq('id', childAccountId1)
        .single();
      
      expectRLSAllow(error, data);
      expect(data.user_id).toBe(childUser1.id);
      expect(data.parent_user_id).toBe(parentUser1.id);
      expect(data.generated_email).toBeDefined();
    });

    it('should BLOCK parents from viewing other family child accounts', async () => {
      const { client } = await signInTestUser(parentUser1.email, parentUser1.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .select('*')
        .eq('id', childAccountId2);
      
      expectRLSBlock(error, data);
    });

    it('should BLOCK children from viewing their own child_account record', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .select('*')
        .eq('user_id', childUser1.id);
      
      // Children should not be able to see generated emails
      expectRLSBlock(error, data);
    });

    it('should allow admins to view all child accounts', async () => {
      const { client } = await signInTestUser(adminUser.email, adminUser.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .select('*');
      
      expectRLSAllow(error, data);
      expect(data.length).toBeGreaterThanOrEqual(2);
    });

    it('should BLOCK anonymous access to child accounts', async () => {
      const client = getAnonClient();
      
      const { data, error } = await client
        .from('child_accounts')
        .select('*');
      
      expectRLSBlock(error, data);
    });
  });

  describe('UPDATE policies - Parent Control', () => {
    it('should allow parents to update their child accounts', async () => {
      const { client } = await signInTestUser(parentUser1.email, parentUser1.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .update({ parent_consent_given: true })
        .eq('id', childAccountId1)
        .select()
        .single();
      
      expectRLSAllow(error, data);
      expect(data.parent_consent_given).toBe(true);
    });

    it('should BLOCK parents from updating other family child accounts', async () => {
      const { client } = await signInTestUser(parentUser1.email, parentUser1.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .update({ parent_consent_given: false })
        .eq('id', childAccountId2)
        .select();
      
      expectRLSBlock(error, data);
    });

    it('should BLOCK children from updating their own records', async () => {
      const { client } = await signInTestUser(childUser1.email, childUser1.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .update({ date_of_birth: '2020-01-01' })
        .eq('user_id', childUser1.id)
        .select();
      
      expectRLSBlock(error, data);
    });
  });

  describe('Security - Generated Email Exposure Prevention', () => {
    it('should not leak generated emails in profile queries', async () => {
      const { client } = await signInTestUser(parentUser2.email, parentUser2.password);
      
      // Try to join profiles with child_accounts
      const { data, error } = await client
        .from('profiles')
        .select('*, child_accounts(*)')
        .eq('id', childUser1.id);
      
      // Should either block or return empty child_accounts
      if (data && data.length > 0) {
        expect(data[0].child_accounts).toEqual([]);
      }
    });

    it('should prevent enumeration attacks on generated emails', async () => {
      const { client } = await signInTestUser(parentUser2.email, parentUser2.password);
      
      const { data, error } = await client
        .from('child_accounts')
        .select('generated_email')
        .limit(100);
      
      // Should return empty or only own family
      if (data) {
        expect(data.length).toBeLessThanOrEqual(1);
      }
    });
  });
});
