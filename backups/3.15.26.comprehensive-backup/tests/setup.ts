import { config } from 'dotenv';
import { beforeAll, afterAll } from 'vitest';
import { cleanupAllTestData } from './utils/cleanup';

// Load environment variables
config();

// Global setup
beforeAll(async () => {
  console.log('🚀 Starting RLS Test Suite');
  console.log('📝 Supabase URL:', process.env.VITE_SUPABASE_URL?.substring(0, 30) + '...');
});

// Global cleanup
afterAll(async () => {
  console.log('🧹 Cleaning up test data...');
  await cleanupAllTestData();
  console.log('✅ Test suite completed');
});
