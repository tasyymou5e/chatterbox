import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUser, deleteAllTestUsers } from '@tests/utils/testUsers';
import { createTestFamily, deleteAllTestFamilies } from '@tests/utils/testFamilies';
import { signInTestUser } from '@tests/utils/testClient';
import { expectRLSBlock } from '@tests/utils/assertions';
import type { TestUser } from '@tests/utils/testUsers';
import type { TestFamily } from '@tests/utils/testFamilies';

describe('Cross-Cutting: Family Data Isolation', () => {
  let parentUser1: TestUser;
  let parentUser2: TestUser;
  let family1: TestFamily;
  let family2: TestFamily;

  beforeAll(async () => {
    parentUser1 = await createTestUser('parent');
    parentUser2 = await createTestUser('parent');
    
    family1 = await createTestFamily(parentUser1.id, 'Isolated Family 1');
    family2 = await createTestFamily(parentUser2.id, 'Isolated Family 2');
  });

  afterAll(async () => {
    await deleteAllTestFamilies();
    await deleteAllTestUsers();
  });

  describe('Family-Scoped Tables Isolation', () => {
    const familyScopedTables = [
      'families',
      'family_members',
      'family_activity_logs',
      'family_invitations',
    ];

    familyScopedTables.forEach(tableName => {
      it(`should prevent cross-family access to ${tableName}`, async () => {
        const { client } = await signInTestUser(parentUser1.email, parentUser1.password);
        
        const { data, error } = await client
          .from(tableName as any)
          .select('*')
          .eq('family_id', family2.id);
        
        expectRLSBlock(error, data);
      });
    });
  });

  describe('Family Enumeration Prevention', () => {
    it('should not allow discovering other families via select all', async () => {
      const { client } = await signInTestUser(parentUser1.email, parentUser1.password);
      
      const { data, error } = await client
        .from('families')
        .select('*');
      
      expect(error).toBeNull();
      
      // Should only see own family
      if (data) {
        expect(data.length).toBeLessThanOrEqual(1);
        if (data.length === 1) {
          expect(data[0].id).toBe(family1.id);
        }
      }
    });

    it('should not reveal family member count of other families', async () => {
      const { client } = await signInTestUser(parentUser1.email, parentUser1.password);
      
      const { data, error } = await client
        .from('family_members')
        .select('*', { count: 'exact' })
        .eq('family_id', family2.id);
      
      expectRLSBlock(error, data);
    });
  });

  describe('Lateral Movement Prevention', () => {
    it('should prevent adding self to another family without invitation', async () => {
      const { client, userId } = await signInTestUser(parentUser1.email, parentUser1.password);
      
      const { data, error } = await client
        .from('family_members')
        .insert({
          family_id: family2.id,
          user_id: userId,
          role: 'parent',
        })
        .select();
      
      expectRLSBlock(error, data);
    });
  });
});
