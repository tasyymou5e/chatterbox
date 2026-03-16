import { deleteAllTestUsers } from './testUsers';
import { deleteAllTestFamilies } from './testFamilies';

/**
 * Clean up all test data created during test execution
 */
export async function cleanupAllTestData(): Promise<void> {
  try {
    console.log('🧹 Cleaning up test families...');
    await deleteAllTestFamilies();
    
    console.log('🧹 Cleaning up test users...');
    await deleteAllTestUsers();
    
    console.log('✅ Cleanup completed successfully');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    // Don't throw - we want tests to complete even if cleanup fails
  }
}
