/**
 * Edge Function Dependency Registry
 * 
 * Centralized declaration of what each edge function expects from the database.
 * This registry is used by schema validation tests to ensure edge functions
 * won't fail due to schema mismatches.
 * 
 * IMPORTANT: Keep this file updated when:
 * - Adding new edge functions
 * - Modifying edge function database operations
 * - Running database migrations that affect tables used by edge functions
 */

export type DatabaseOperation = 'select' | 'insert' | 'update' | 'delete' | 'upsert';

export interface TableDependency {
  /** Table name in public schema */
  name: string;
  /** Operations performed on this table */
  operations: DatabaseOperation[];
  /** Columns that MUST exist for the function to work */
  requiredColumns: string[];
  /** Columns that are used but optional (may be nullable or have defaults) */
  optionalColumns?: string[];
  /** Notes about this dependency */
  notes?: string;
}

export interface EdgeFunctionDependency {
  /** Edge function name (folder name under supabase/functions/) */
  name: string;
  /** Brief description of what the function does */
  description: string;
  /** Database tables this function depends on */
  tables: TableDependency[];
  /** RPC functions this function calls */
  rpcs: string[];
  /** Database triggers this function depends on (if any) */
  triggers?: string[];
  /** Whether this function requires authentication */
  requiresAuth: boolean;
  /** Whether this function requires admin privileges */
  requiresAdmin: boolean;
  /** Last updated date for this dependency declaration */
  lastUpdated: string;
}

/**
 * Complete registry of edge function database dependencies
 * 
 * This is the source of truth for schema validation tests.
 */
export const EDGE_FUNCTION_DEPENDENCIES: EdgeFunctionDependency[] = [
  // ============ Admin Functions ============
  {
    name: 'admin-create-user',
    description: 'Creates new users via admin portal',
    tables: [
      {
        name: 'profiles',
        operations: ['insert', 'update', 'upsert'],
        requiredColumns: ['user_id', 'first_name', 'last_name'],
        optionalColumns: ['avatar_url', 'created_at', 'updated_at'],
        notes: 'Email is stored in auth.users, NOT in profiles table',
      },
      {
        name: 'user_roles',
        operations: ['insert', 'select'],
        requiredColumns: ['user_id', 'role', 'created_at'],
      },
      {
        name: 'admin_audit_logs',
        operations: ['insert'],
        requiredColumns: ['admin_user_id', 'operation_type', 'target_table', 'target_id'],
        optionalColumns: ['metadata', 'old_values', 'new_values'],
      },
      {
        name: 'security_events',
        operations: ['insert'],
        requiredColumns: ['event_type', 'user_id', 'metadata'],
      },
    ],
    rpcs: ['check_admin_role_secure'],
    requiresAuth: true,
    requiresAdmin: true,
    lastUpdated: '2026-01-23',
  },
  {
    name: 'admin-update-user',
    description: 'Updates user passwords via admin portal',
    tables: [
      {
        name: 'user_activity_logs',
        operations: ['insert'],
        requiredColumns: ['user_id', 'activity_type', 'success'],
        optionalColumns: ['metadata', 'ip_address'],
      },
    ],
    rpcs: ['check_admin_role_secure'],
    requiresAuth: true,
    requiresAdmin: true,
    lastUpdated: '2026-01-23',
  },
  {
    name: 'admin-add-family-member',
    description: 'Adds members to families via admin portal',
    tables: [
      {
        name: 'families',
        operations: ['select'],
        requiredColumns: ['id', 'display_name'],
      },
      {
        name: 'profiles',
        operations: ['select'],
        requiredColumns: ['user_id', 'first_name', 'last_name'],
      },
      {
        name: 'family_members',
        operations: ['insert', 'select'],
        requiredColumns: ['family_id', 'user_id', 'role'],
      },
      {
        name: 'admin_audit_logs',
        operations: ['insert'],
        requiredColumns: ['admin_user_id', 'operation_type', 'target_table'],
      },
      {
        name: 'security_events',
        operations: ['insert'],
        requiredColumns: ['event_type', 'user_id', 'metadata'],
      },
    ],
    rpcs: ['check_admin_role_secure', 'log_security_event'],
    requiresAuth: true,
    requiresAdmin: true,
    lastUpdated: '2026-01-23',
  },
  {
    name: 'admin-remove-family-member',
    description: 'Removes members from families via admin portal',
    tables: [
      {
        name: 'families',
        operations: ['select'],
        requiredColumns: ['id', 'created_by'],
      },
      {
        name: 'family_members',
        operations: ['select', 'delete'],
        requiredColumns: ['family_id', 'user_id', 'role'],
      },
      {
        name: 'admin_audit_logs',
        operations: ['insert'],
        requiredColumns: ['admin_user_id', 'operation_type', 'target_table'],
      },
    ],
    rpcs: ['check_admin_role_secure', 'log_security_event'],
    requiresAuth: true,
    requiresAdmin: true,
    lastUpdated: '2026-01-23',
  },

  // ============ Test Functions ============
  {
    name: 'create-test-family',
    description: 'Creates test families for development and testing',
    tables: [
      {
        name: 'families',
        operations: ['insert'],
        requiredColumns: ['display_name', 'family_code'],
        optionalColumns: ['created_by', 'settings'],
      },
      {
        name: 'family_members',
        operations: ['insert'],
        requiredColumns: ['family_id', 'user_id', 'role'],
      },
      {
        name: 'child_accounts',
        operations: ['insert'],
        requiredColumns: ['family_id', 'created_by', 'first_name', 'last_name', 'status', 'family_code', 'generated_email'],
        optionalColumns: ['verification_pin', 'metadata'],
      },
      {
        name: 'user_roles',
        operations: ['insert'],
        requiredColumns: ['user_id', 'role'],
      },
      {
        name: 'profiles',
        operations: ['select'],
        requiredColumns: ['user_id', 'first_name', 'last_name'],
        notes: 'Does NOT use profiles.email - email is in auth.users',
      },
    ],
    rpcs: ['generate_family_code', 'cleanup_test_families'],
    triggers: ['auto_create_family_for_parent'],
    requiresAuth: true,
    requiresAdmin: true,
    lastUpdated: '2026-01-23',
  },
  {
    name: 'cleanup-test-families',
    description: 'Cleans up test data from the database',
    tables: [
      {
        name: 'families',
        operations: ['select', 'delete'],
        requiredColumns: ['id', 'display_name'],
      },
    ],
    rpcs: ['cleanup_test_families'],
    requiresAuth: true,
    requiresAdmin: true,
    lastUpdated: '2026-01-23',
  },
  {
    name: 'delete-family-comprehensive',
    description: 'Comprehensively deletes a family and all related data',
    tables: [
      {
        name: 'families',
        operations: ['select', 'delete'],
        requiredColumns: ['id'],
      },
      {
        name: 'family_members',
        operations: ['select', 'delete'],
        requiredColumns: ['family_id', 'user_id'],
      },
      {
        name: 'child_accounts',
        operations: ['delete'],
        requiredColumns: ['family_id'],
      },
      {
        name: 'user_roles',
        operations: ['delete'],
        requiredColumns: ['user_id'],
      },
    ],
    rpcs: [],
    requiresAuth: true,
    requiresAdmin: true,
    lastUpdated: '2026-01-23',
  },

  // ============ Child Account Functions ============
  {
    name: 'create-child-account',
    description: 'Creates child accounts within a family',
    tables: [
      {
        name: 'child_accounts',
        operations: ['insert'],
        requiredColumns: ['family_id', 'created_by', 'first_name', 'last_name', 'status', 'family_code', 'generated_email'],
        optionalColumns: ['verification_pin', 'metadata', 'expires_at'],
      },
      {
        name: 'profiles',
        operations: ['insert'],
        requiredColumns: ['user_id', 'first_name', 'last_name'],
      },
      {
        name: 'family_members',
        operations: ['select', 'insert'],
        requiredColumns: ['family_id', 'user_id', 'role'],
      },
      {
        name: 'user_roles',
        operations: ['insert'],
        requiredColumns: ['user_id', 'role'],
      },
      {
        name: 'families',
        operations: ['select'],
        requiredColumns: ['id', 'family_code'],
      },
    ],
    rpcs: ['log_family_activity'],
    requiresAuth: true,
    requiresAdmin: false,
    lastUpdated: '2026-01-23',
  },
  {
    name: 'complete-child-account',
    description: 'Completes child account setup with password',
    tables: [
      {
        name: 'child_accounts',
        operations: ['select', 'update'],
        requiredColumns: ['id', 'family_code', 'status', 'generated_email', 'first_name', 'last_name', 'family_id', 'created_by'],
        optionalColumns: ['verification_pin', 'pin_attempts', 'locked_until'],
      },
      {
        name: 'profiles',
        operations: ['insert', 'update'],
        requiredColumns: ['user_id', 'first_name', 'last_name'],
      },
      {
        name: 'family_members',
        operations: ['insert'],
        requiredColumns: ['family_id', 'user_id', 'role'],
      },
      {
        name: 'user_roles',
        operations: ['insert'],
        requiredColumns: ['user_id', 'role'],
      },
      {
        name: 'security_events',
        operations: ['insert'],
        requiredColumns: ['event_type', 'user_id', 'metadata'],
      },
    ],
    rpcs: ['get_pending_child_account_for_completion', 'complete_child_account_secure', 'log_security_event'],
    requiresAuth: false,
    requiresAdmin: false,
    lastUpdated: '2026-01-23',
  },

  // ============ System Functions ============
  {
    name: 'api-integration-status',
    description: 'Checks status of AI API integrations',
    tables: [
      {
        name: 'llm_api_calls',
        operations: ['insert'],
        requiredColumns: ['provider', 'endpoint', 'request_timestamp'],
        optionalColumns: ['response_status', 'latency_ms', 'metadata'],
      },
    ],
    rpcs: [],
    requiresAuth: true,
    requiresAdmin: true,
    lastUpdated: '2026-01-23',
  },
];

/**
 * Get dependencies for a specific edge function
 */
export function getEdgeFunctionDependencies(
  functionName: string
): EdgeFunctionDependency | undefined {
  return EDGE_FUNCTION_DEPENDENCIES.find((dep) => dep.name === functionName);
}

/**
 * Get all edge functions that depend on a specific table
 */
export function getFunctionsDependingOnTable(tableName: string): string[] {
  return EDGE_FUNCTION_DEPENDENCIES
    .filter((dep) => dep.tables.some((t) => t.name === tableName))
    .map((dep) => dep.name);
}

/**
 * Get all edge functions that depend on a specific RPC
 */
export function getFunctionsDependingOnRPC(rpcName: string): string[] {
  return EDGE_FUNCTION_DEPENDENCIES
    .filter((dep) => dep.rpcs.includes(rpcName))
    .map((dep) => dep.name);
}

/**
 * Get all unique tables referenced across all edge functions
 */
export function getAllReferencedTables(): string[] {
  const tables = new Set<string>();
  for (const dep of EDGE_FUNCTION_DEPENDENCIES) {
    for (const table of dep.tables) {
      tables.add(table.name);
    }
  }
  return Array.from(tables).sort();
}

/**
 * Get all unique RPCs referenced across all edge functions
 */
export function getAllReferencedRPCs(): string[] {
  const rpcs = new Set<string>();
  for (const dep of EDGE_FUNCTION_DEPENDENCIES) {
    for (const rpc of dep.rpcs) {
      rpcs.add(rpc);
    }
  }
  return Array.from(rpcs).sort();
}

/**
 * Get all columns referenced for a specific table across all functions
 */
export function getAllColumnsForTable(tableName: string): string[] {
  const columns = new Set<string>();
  for (const dep of EDGE_FUNCTION_DEPENDENCIES) {
    for (const table of dep.tables) {
      if (table.name === tableName) {
        for (const col of table.requiredColumns) {
          columns.add(col);
        }
        for (const col of table.optionalColumns || []) {
          columns.add(col);
        }
      }
    }
  }
  return Array.from(columns).sort();
}

/**
 * Validate that all required columns for an edge function are non-empty strings
 * This is a basic sanity check on the registry itself
 */
export function validateRegistryIntegrity(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const dep of EDGE_FUNCTION_DEPENDENCIES) {
    if (!dep.name || dep.name.trim() === '') {
      errors.push('Found edge function with empty name');
    }

    for (const table of dep.tables) {
      if (!table.name || table.name.trim() === '') {
        errors.push(`Edge function "${dep.name}" has table with empty name`);
      }

      if (!table.requiredColumns || table.requiredColumns.length === 0) {
        errors.push(
          `Edge function "${dep.name}" table "${table.name}" has no required columns`
        );
      }

      for (const col of table.requiredColumns) {
        if (!col || col.trim() === '') {
          errors.push(
            `Edge function "${dep.name}" table "${table.name}" has empty column name`
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
