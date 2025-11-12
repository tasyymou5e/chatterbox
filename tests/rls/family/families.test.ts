import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUser, deleteAllTestUsers } from '@tests/utils/testUsers';
import { createTestFamily, deleteAllTestFamilies } from '@tests/utils/testFamilies';
import { signInTestUser, getAnonClient } from '@tests/utils/testClient';
import { expectRLSBlock, expectRLSAllow } from '@tests/utils/assertions';
import type { TestUser } from '@tests/utils/testUsers';
import type { TestFamily } from '@tests/utils/testFamilies';

describe('families table RLS policies', () => {
  let adminUser: TestUser;
  let parentUser1: TestUser;
  let parentUser2: TestUser;
  let orphanUser: TestUser;
  let family1: TestFamily;
  let family2: TestFamily;

  beforeAll(async () => {
    adminUser = await createTestUser('admin');
    parentUser1 = await createTestUser('parent');
    parentUser2 = await createTestUser('parent');
    orphanUser = await createTestUser('parent'); // User with no family
    
    family1 = await createTestFamily(parentUser1.id, 'Family 1');
    family2 = await createTestFamily(parentUser2.id, 'Family 2');
  });

  afterAll(async () => {
    await deleteAllTestFamilies();
    await deleteAllTestUsers();
  });

  describe('SELECT policies - families_select', () => {
    it('should allow users to view their own family', async () => {
      const { client } = await signInTestUser(parentUser1.email, parentUser1.password);
      
      const { data, error } = await client
        .from('families')
        .select('*')
        .eq('id', family1.id)
        .single();
      
      expectRLSAllow(error, data);
      expect(data.id).toBe(family1.id);
      expect(data.name).toBe('Family 1');
    });

    it('should block access to other families', async () => {
      const { client } = await signInTestUser(parentUser1.email, parentUser1.password);
      
      const { data, error } = await client
        .from('families')
        .select('*')
        .eq('id', family2.id);
      
      expectRLSBlock(error, data);
    });

    it('should allow admins to view all families', async () => {
      const { client } = await signInTestUser(adminUser.email, adminUser.password);
      
      const { data, error } = await client
        .from('families')
        .select('*');
      
      expectRLSAllow(error, data);
      expect(data.length).toBeGreaterThanOrEqual(2);
    });

    it('should block anonymous access', async () => {
      const client = getAnonClient();
      
      const { data, error } = await client
        .from('families')
        .select('*');
      
      expectRLSBlock(error, data);
    });

    it('should return empty for users without family', async () => {
      const { client } = await signInTestUser(orphanUser.email, orphanUser.password);
      
      const { data, error } = await client
        .from('families')
        .select('*');
      
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });

  describe('INSERT policies - families_insert', () => {
    it('should allow authenticated users to create families', async () => {
      const { client, userId } = await signInTestUser(orphanUser.email, orphanUser.password);
      
      const { data, error } = await client
        .from('families')
        .insert({
          name: 'New Family',
          created_by: userId,
        })
        .select()
        .single();
      
      expectRLSAllow(error, data);
      expect(data.name).toBe('New Family');
      expect(data.created_by).toBe(userId);
    });

    it('should block anonymous family creation', async () => {
      const client = getAnonClient();
      
      const { data, error } = await client
        .from('families')
        .insert({
          name: 'Anonymous Family',
          created_by: '00000000-0000-0000-0000-000000000000',
        })
        .select();
      
      expectRLSBlock(error, data);
    });
  });

  describe('UPDATE policies - families_update', () => {
    it('should allow family creators to update their family', async () => {
      const { client } = await signInTestUser(parentUser1.email, parentUser1.password);
      
      const { data, error } = await client
        .from('families')
        .update({ name: 'Updated Family Name' })
        .eq('id', family1.id)
        .select()
        .single();
      
      expectRLSAllow(error, data);
      expect(data.name).toBe('Updated Family Name');
    });

    it('should block non-members from updating families', async () => {
      const { client } = await signInTestUser(parentUser1.email, parentUser1.password);
      
      const { data, error } = await client
        .from('families')
        .update({ name: 'Hacked Family' })
        .eq('id', family2.id)
        .select();
      
      expectRLSBlock(error, data);
    });
  });

  describe('DELETE policies - families_delete', () => {
    it('should block regular users from deleting families', async () => {
      const { client } = await signInTestUser(parentUser1.email, parentUser1.password);
      
      const { data, error } = await client
        .from('families')
        .delete()
        .eq('id', family1.id)
        .select();
      
      // Delete should be blocked or return empty
      expectRLSBlock(error, data);
    });
  });
});
