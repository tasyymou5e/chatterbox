import { getServiceRoleClient } from './testClient';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export interface TestUser {
  id: string;
  email: string;
  password: string;
  role: AppRole;
  accessToken?: string;
}

const TEST_PASSWORD = 'TestPassword123!@#';
const testUserRegistry: TestUser[] = [];

/**
 * Create a test user with specified role
 */
export async function createTestUser(
  role: AppRole,
  familyId?: string
): Promise<TestUser> {
  const client = getServiceRoleClient();
  const timestamp = Date.now();
  const email = `test-${role}-${timestamp}-${Math.random().toString(36).substring(7)}@test.com`;
  
  // Create auth user
  const { data: authData, error: authError } = await client.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  
  if (authError || !authData.user) {
    throw new Error(`Failed to create test user: ${authError?.message}`);
  }
  
  const userId = authData.user.id;
  
  // Create profile
  const { error: profileError } = await client
    .from('profiles')
    .insert({
      id: userId,
      email,
      first_name: `Test`,
      last_name: role.charAt(0).toUpperCase() + role.slice(1),
    });
  
  if (profileError) {
    console.error('Profile creation error:', profileError);
  }
  
  // Assign role
  const { error: roleError } = await client
    .from('user_roles')
    .insert({
      user_id: userId,
      role,
    });
  
  if (roleError) {
    throw new Error(`Failed to assign role: ${roleError.message}`);
  }
  
  // If family ID provided and role is parent/child, add to family
  if (familyId && (role === 'parent' || role === 'child')) {
    const { error: memberError } = await client
      .from('family_members')
      .insert({
        family_id: familyId,
        user_id: userId,
        role: role === 'parent' ? 'parent' : 'child',
      });
    
    if (memberError) {
      console.error('Family member creation error:', memberError);
    }
  }
  
  const testUser: TestUser = {
    id: userId,
    email,
    password: TEST_PASSWORD,
    role,
  };
  
  testUserRegistry.push(testUser);
  return testUser;
}

/**
 * Create multiple test users at once
 */
export async function createTestUsers(
  roles: AppRole[],
  familyId?: string
): Promise<TestUser[]> {
  const users = await Promise.all(
    roles.map(role => createTestUser(role, familyId))
  );
  return users;
}

/**
 * Delete a specific test user
 */
export async function deleteTestUser(userId: string): Promise<void> {
  const client = getServiceRoleClient();
  
  // Delete from auth (this should cascade to profiles)
  const { error } = await client.auth.admin.deleteUser(userId);
  
  if (error) {
    console.error(`Failed to delete test user ${userId}:`, error.message);
  }
  
  // Remove from registry
  const index = testUserRegistry.findIndex(u => u.id === userId);
  if (index > -1) {
    testUserRegistry.splice(index, 1);
  }
}

/**
 * Delete all test users created in this test session
 */
export async function deleteAllTestUsers(): Promise<void> {
  const deletePromises = testUserRegistry.map(user => deleteTestUser(user.id));
  await Promise.all(deletePromises);
  testUserRegistry.length = 0;
}

/**
 * Get all test users created in this session
 */
export function getTestUserRegistry(): TestUser[] {
  return [...testUserRegistry];
}
