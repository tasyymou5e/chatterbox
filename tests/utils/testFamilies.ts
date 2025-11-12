import { getServiceRoleClient } from './testClient';

export interface TestFamily {
  id: string;
  name: string;
  createdBy: string;
}

const testFamilyRegistry: TestFamily[] = [];

/**
 * Create a test family
 */
export async function createTestFamily(
  creatorUserId: string,
  name?: string
): Promise<TestFamily> {
  const client = getServiceRoleClient();
  const timestamp = Date.now();
  const familyName = name || `Test Family ${timestamp}`;
  
  const { data, error } = await client
    .from('families')
    .insert({
      name: familyName,
      created_by: creatorUserId,
    })
    .select()
    .single();
  
  if (error || !data) {
    throw new Error(`Failed to create test family: ${error?.message}`);
  }
  
  // Add creator as family member (parent role)
  const { error: memberError } = await client
    .from('family_members')
    .insert({
      family_id: data.id,
      user_id: creatorUserId,
      role: 'parent',
    });
  
  if (memberError) {
    console.error('Failed to add creator as family member:', memberError);
  }
  
  const testFamily: TestFamily = {
    id: data.id,
    name: familyName,
    createdBy: creatorUserId,
  };
  
  testFamilyRegistry.push(testFamily);
  return testFamily;
}

/**
 * Add a user to a family
 */
export async function addUserToFamily(
  familyId: string,
  userId: string,
  role: 'parent' | 'child' | 'grandparent' | 'therapist' | 'teacher' | 'family_friend'
): Promise<void> {
  const client = getServiceRoleClient();
  
  const { error } = await client
    .from('family_members')
    .insert({
      family_id: familyId,
      user_id: userId,
      role,
    });
  
  if (error) {
    throw new Error(`Failed to add user to family: ${error.message}`);
  }
}

/**
 * Delete a test family
 */
export async function deleteTestFamily(familyId: string): Promise<void> {
  const client = getServiceRoleClient();
  
  // Delete family members first
  await client
    .from('family_members')
    .delete()
    .eq('family_id', familyId);
  
  // Delete family
  const { error } = await client
    .from('families')
    .delete()
    .eq('id', familyId);
  
  if (error) {
    console.error(`Failed to delete test family ${familyId}:`, error.message);
  }
  
  // Remove from registry
  const index = testFamilyRegistry.findIndex(f => f.id === familyId);
  if (index > -1) {
    testFamilyRegistry.splice(index, 1);
  }
}

/**
 * Delete all test families created in this test session
 */
export async function deleteAllTestFamilies(): Promise<void> {
  const deletePromises = testFamilyRegistry.map(family => deleteTestFamily(family.id));
  await Promise.all(deletePromises);
  testFamilyRegistry.length = 0;
}

/**
 * Get all test families created in this session
 */
export function getTestFamilyRegistry(): TestFamily[] {
  return [...testFamilyRegistry];
}
