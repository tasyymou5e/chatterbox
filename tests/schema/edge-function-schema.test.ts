/**
 * Edge Function Schema Validation Tests
 * 
 * These tests validate that edge functions have all the database
 * dependencies they need (tables, columns, RPCs) before deployment.
 * 
 * This prevents runtime errors like "column X does not exist" that
 * can occur when edge functions reference schema elements that have
 * been removed or renamed.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createSchemaValidationClient,
  validateColumnsExist,
  validateRPCsExist,
  getSchemaSnapshot,
  compareSchemaWithDependencies,
  formatValidationReport,
  type SchemaSnapshot,
} from '../utils/schemaValidator';
import {
  EDGE_FUNCTION_DEPENDENCIES,
  validateRegistryIntegrity,
  getAllReferencedTables,
  getAllReferencedRPCs,
  type EdgeFunctionDependency,
} from './edgeFunctionDependencies';

// Skip if no Supabase credentials
const hasSupabaseCredentials = !!(
  (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) &&
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

describe.skipIf(!hasSupabaseCredentials)('Edge Function Schema Validation', () => {
  let supabase: SupabaseClient;
  let schemaSnapshot: SchemaSnapshot;

  beforeAll(async () => {
    supabase = createSchemaValidationClient();
    // Get a single snapshot to use across all tests (efficient)
    schemaSnapshot = await getSchemaSnapshot(supabase);
  }, 30000); // 30 second timeout for initial snapshot

  afterAll(() => {
    // Cleanup if needed
  });

  describe('Registry Integrity', () => {
    it('should have a valid dependency registry', () => {
      const result = validateRegistryIntegrity();
      if (!result.valid) {
        console.error('Registry errors:', result.errors);
      }
      expect(result.valid).toBe(true);
    });

    it('should have dependencies declared for known edge functions', () => {
      const expectedFunctions = [
        'admin-create-user',
        'create-test-family',
        'create-child-account',
        'complete-child-account',
      ];

      for (const fn of expectedFunctions) {
        const dep = EDGE_FUNCTION_DEPENDENCIES.find((d) => d.name === fn);
        expect(dep, `Missing dependency declaration for ${fn}`).toBeDefined();
      }
    });
  });

  describe('Table Dependency Validation', () => {
    // Test each edge function's table dependencies
    it.each(EDGE_FUNCTION_DEPENDENCIES)(
      'should validate $name has all required table columns',
      async (dependency: EdgeFunctionDependency) => {
        const errors: string[] = [];

        for (const table of dependency.tables) {
          const result = await validateColumnsExist(
            supabase,
            table.name,
            table.requiredColumns
          );

          if (!result.valid) {
            errors.push(
              `Table "${table.name}" is missing columns: ${result.missing.join(', ')}`
            );
          }
        }

        if (errors.length > 0) {
          throw new Error(
            `Edge function "${dependency.name}" has schema mismatches:\n` +
              errors.map((e) => `  - ${e}`).join('\n')
          );
        }
      }
    );

    it('should validate all referenced tables exist in database', async () => {
      const referencedTables = getAllReferencedTables();
      const actualTables = Object.keys(schemaSnapshot.tables);

      const missingTables = referencedTables.filter(
        (t) => !actualTables.includes(t)
      );

      if (missingTables.length > 0) {
        throw new Error(
          `The following tables are referenced by edge functions but don't exist:\n` +
            missingTables.map((t) => `  - ${t}`).join('\n')
        );
      }
    });
  });

  describe('RPC Function Validation', () => {
    it.each(EDGE_FUNCTION_DEPENDENCIES)(
      'should validate $name has all required RPC functions',
      async (dependency: EdgeFunctionDependency) => {
        if (dependency.rpcs.length === 0) {
          // Skip functions with no RPC dependencies
          return;
        }

        const result = await validateRPCsExist(supabase, dependency.rpcs);

        if (!result.valid) {
          throw new Error(
            `Edge function "${dependency.name}" requires RPC functions that don't exist:\n` +
              result.missing.map((r) => `  - ${r}`).join('\n')
          );
        }
      }
    );

    it('should validate all referenced RPCs exist in database', async () => {
      const referencedRPCs = getAllReferencedRPCs();
      const missingRPCs = referencedRPCs.filter(
        (r) => !schemaSnapshot.rpcs.includes(r)
      );

      if (missingRPCs.length > 0) {
        throw new Error(
          `The following RPC functions are referenced but don't exist:\n` +
            missingRPCs.map((r) => `  - ${r}`).join('\n')
        );
      }
    });
  });

  describe('Schema Snapshot Validation', () => {
    it('should generate a valid schema snapshot', () => {
      expect(schemaSnapshot).toBeDefined();
      expect(schemaSnapshot.tables).toBeDefined();
      expect(schemaSnapshot.rpcs).toBeDefined();
      expect(schemaSnapshot.timestamp).toBeDefined();
    });

    it('should have core tables in snapshot', () => {
      const coreTables = ['profiles', 'families', 'family_members', 'user_roles'];
      
      for (const table of coreTables) {
        expect(
          schemaSnapshot.tables[table],
          `Core table "${table}" not found in schema`
        ).toBeDefined();
      }
    });

    it('should verify profiles table does NOT have email column', () => {
      // This is the specific bug we're preventing from recurring
      const profileColumns = schemaSnapshot.tables['profiles'];
      expect(profileColumns).toBeDefined();

      const hasEmailColumn = profileColumns?.some(
        (col) => col.column_name === 'email'
      );

      expect(
        hasEmailColumn,
        'profiles table should NOT have an email column - email is in auth.users'
      ).toBe(false);
    });
  });

  describe('Critical Function Validation', () => {
    it('should validate admin-create-user does not expect profiles.email', async () => {
      const adminCreateUser = EDGE_FUNCTION_DEPENDENCIES.find(
        (d) => d.name === 'admin-create-user'
      );
      
      expect(adminCreateUser).toBeDefined();
      
      const profilesDep = adminCreateUser?.tables.find((t) => t.name === 'profiles');
      expect(profilesDep).toBeDefined();
      
      // Ensure 'email' is NOT in required columns
      expect(profilesDep?.requiredColumns).not.toContain('email');
    });

    it('should validate create-test-family does not expect profiles.email', async () => {
      const createTestFamily = EDGE_FUNCTION_DEPENDENCIES.find(
        (d) => d.name === 'create-test-family'
      );
      
      expect(createTestFamily).toBeDefined();
      
      const profilesDep = createTestFamily?.tables.find((t) => t.name === 'profiles');
      
      if (profilesDep) {
        // If profiles is used, ensure 'email' is NOT in required columns
        expect(profilesDep.requiredColumns).not.toContain('email');
      }
    });
  });

  describe('Comparison Report Generation', () => {
    it('should generate human-readable validation reports', () => {
      // Test with a mock failed validation
      const mockResult = {
        valid: false,
        missingColumns: [
          { table: 'profiles', columns: ['nonexistent_column'] },
        ],
        missingRPCs: ['nonexistent_rpc'],
      };

      const report = formatValidationReport('test-function', mockResult);
      
      expect(report).toContain('test-function');
      expect(report).toContain('profiles');
      expect(report).toContain('nonexistent_column');
      expect(report).toContain('nonexistent_rpc');
    });

    it('should report success for valid dependencies', () => {
      const mockResult = {
        valid: true,
        missingColumns: [],
        missingRPCs: [],
      };

      const report = formatValidationReport('valid-function', mockResult);
      
      expect(report).toContain('✓');
      expect(report).toContain('valid-function');
    });
  });

  describe('Full Schema Comparison', () => {
    it('should compare snapshot against admin-create-user dependencies', () => {
      const adminDeps = EDGE_FUNCTION_DEPENDENCIES.find(
        (d) => d.name === 'admin-create-user'
      );
      
      expect(adminDeps).toBeDefined();
      
      if (!adminDeps) return;

      const result = compareSchemaWithDependencies(schemaSnapshot, {
        tables: adminDeps.tables.map((t) => ({
          name: t.name,
          requiredColumns: t.requiredColumns,
        })),
        rpcs: adminDeps.rpcs,
      });

      // If this fails, we've caught a schema mismatch
      expect(result.valid).toBe(true);
    });
  });
});

// Non-database tests that always run
describe('Edge Function Registry Tests', () => {
  it('should have valid registry structure', () => {
    const result = validateRegistryIntegrity();
    expect(result.valid).toBe(true);
  });

  it('should not have duplicate edge function names', () => {
    const names = EDGE_FUNCTION_DEPENDENCIES.map((d) => d.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('should have lastUpdated dates for all functions', () => {
    for (const dep of EDGE_FUNCTION_DEPENDENCIES) {
      expect(dep.lastUpdated, `${dep.name} missing lastUpdated`).toBeDefined();
      expect(dep.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('should document auth requirements for all functions', () => {
    for (const dep of EDGE_FUNCTION_DEPENDENCIES) {
      expect(
        typeof dep.requiresAuth,
        `${dep.name} missing requiresAuth`
      ).toBe('boolean');
      expect(
        typeof dep.requiresAdmin,
        `${dep.name} missing requiresAdmin`
      ).toBe('boolean');
    }
  });

  it('should have admin functions marked correctly', () => {
    const adminFunctions = EDGE_FUNCTION_DEPENDENCIES.filter(
      (d) => d.name.startsWith('admin-')
    );

    for (const fn of adminFunctions) {
      expect(
        fn.requiresAdmin,
        `${fn.name} should require admin privileges`
      ).toBe(true);
    }
  });
});
