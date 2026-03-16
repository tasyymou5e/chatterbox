import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUser, deleteAllTestUsers } from '@tests/utils/testUsers';
import { createTestFamily, deleteAllTestFamilies } from '@tests/utils/testFamilies';
import { signInTestUser, getAnonClient } from '@tests/utils/testClient';
import { expectRLSBlock, expectRLSAllow, expectOnlyOwnData } from '@tests/utils/assertions';
import type { TestUser } from '@tests/utils/testUsers';
import type { TestFamily } from '@tests/utils/testFamilies';

describe('profiles table RLS policies', () => {
  let adminUser: TestUser;
  let parentUser1: TestUser;
  let parentUser2: TestUser;
  let childUser: TestUser;
  let family1: TestFamily;
  let family2: TestFamily;

  beforeAll(async () => {
    // Create test users
    adminUser = await createTestUser('admin');
    parentUser1 = await createTestUser('parent');
    parentUser2 = await createTestUser('parent');
    
    // Create families
    family1 = await createTestFamily(parentUser1.id, 'Test Family 1');
    family2 = await createTestFamily(parentUser2.id, 'Test Family 2');
    
    // Create child in family1
    childUser = await createTestUser('child', family1.id);
  });

  afterAll(async () => {
    await deleteAllTestFamilies();
    await deleteAllTestUsers();
  });

  describe('SELECT policies - profiles_secure_access', () => {
    it('should allow users to view their own profile', async () => {
      const { client } = await signInTestUser(parentUser1.email, parentUser1.password);
      
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', parentUser1.id)
        .single();
      
      expectRLSAllow(error, data);
      expect(data.id).toBe(parentUser1.id);
      expect(data.email).toBe(parentUser1.email);
    });

    it('should allow family members to view each other profiles', async () => {
      const { client } = await signInTestUser(parentUser1.email, parentUser1.password);
      
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', childUser.id)
        .single();
      
      expectRLSAllow(error, data);
      expect(data.id).toBe(childUser.id);
    });

    it('should block access to profiles from other families', async () => {
      const { client } = await signInTestUser(parentUser1.email, parentUser1.password);
      
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', parentUser2.id);
      
      expectRLSBlock(error, data);
    });

    it('should allow admins to view all profiles', async () => {
      const { client } = await signInTestUser(adminUser.email, adminUser.password);
      
      const { data, error } = await client
        .from('profiles')
        .select('*');
      
      expectRLSAllow(error, data);
      expect(data.length).toBeGreaterThanOrEqual(3);
    });

    it('should block anonymous access to profiles', async () => {
      const client = getAnonClient();
      
      const { data, error } = await client
        .from('profiles')
        .select('*');
      
      expectRLSBlock(error, data);
    });
  });

  describe('UPDATE policies - profiles_update_own', () => {
    it('should allow users to update their own profile', async () => {
      const { client } = await signInTestUser(parentUser1.email, parentUser1.password);
      const newFirstName = 'Updated Name';
      
      const { data, error } = await client
        .from('profiles')
        .update({ first_name: newFirstName })
        .eq('id', parentUser1.id)
        .select()
        .single();
      
      expectRLSAllow(error, data);
      expect(data.first_name).toBe(newFirstName);
    });

    it('should block users from updating other profiles', async () => {
      const { client } = await signInTestUser(parentUser1.email, parentUser1.password);
      
      const { data, error } = await client
        .from('profiles')
        .update({ first_name: 'Hacked' })
        .eq('id', parentUser2.id)
        .select();
      
      expectRLSBlock(error, data);
    });

    it('should block children from updating parent profiles', async () => {
      const { client } = await signInTestUser(childUser.email, childUser.password);
      
      const { data, error } = await client
        .from('profiles')
        .update({ first_name: 'Hacked' })
        .eq('id', parentUser1.id)
        .select();
      
      expectRLSBlock(error, data);
    });
  });

  describe('Edge Cases', () => {
    it('should handle queries with no results gracefully', async () => {
      const { client } = await signInTestUser(parentUser1.email, parentUser1.password);
      
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000000');
      
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });

    it('should prevent SQL injection via email field', async () => {
      const { client } = await signInTestUser(parentUser1.email, parentUser1.password);
      
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('email', "'; DROP TABLE profiles; --");
      
      expect(error).toBeNull();
      expect(data).toEqual([]);
    });
  });
});
