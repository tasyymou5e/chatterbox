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
 * 
 * Total Functions: 23
 * Last Full Audit: 2026-01-23
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
 * 
 * Categories:
 * - Admin Functions (6): User/family management via admin portal
 * - Test Functions (2): Development and testing utilities
 * - Child Account Functions (2): Child account lifecycle
 * - Communication Functions (2): Email and TTS
 * - AI/LLM Functions (4): Chat, failover, provider management
 * - System/Monitoring Functions (7): Health checks, analytics, security
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
  {
    name: 'update-site-settings',
    description: 'Updates global site configuration settings',
    tables: [
      {
        name: 'user_roles',
        operations: ['select'],
        requiredColumns: ['user_id', 'role'],
      },
      {
        name: 'site_settings',
        operations: ['update', 'select'],
        requiredColumns: ['id', 'setting_key', 'setting_value', 'updated_by', 'updated_at'],
        optionalColumns: ['description'],
      },
      {
        name: 'admin_audit_logs',
        operations: ['insert'],
        requiredColumns: ['admin_user_id', 'operation_type', 'target_table', 'target_id'],
        optionalColumns: ['new_values', 'metadata'],
      },
    ],
    rpcs: [],
    requiresAuth: true,
    requiresAdmin: true,
    lastUpdated: '2026-01-23',
  },
  {
    name: 'manage-llm-provider',
    description: 'CRUD operations for LLM provider configurations',
    tables: [
      {
        name: 'user_roles',
        operations: ['select'],
        requiredColumns: ['user_id', 'role'],
      },
      {
        name: 'llm_providers',
        operations: ['select', 'insert', 'update', 'delete'],
        requiredColumns: ['provider_key', 'display_name', 'api_endpoint', 'is_active', 'is_custom'],
        optionalColumns: ['models', 'pricing_config', 'api_key_configured', 'health_status', 'last_health_check', 'updated_at'],
      },
    ],
    rpcs: [],
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

  // ============ Communication Functions ============
  {
    name: 'send-family-email',
    description: 'Sends bulk emails to family members via Resend',
    tables: [
      {
        name: 'user_activity_logs',
        operations: ['insert'],
        requiredColumns: ['user_id', 'activity_type', 'success'],
        optionalColumns: ['metadata', 'failure_reason'],
      },
    ],
    rpcs: ['check_admin_role_secure'],
    requiresAuth: true,
    requiresAdmin: true,
    lastUpdated: '2026-01-23',
  },
  {
    name: 'text-to-speech',
    description: 'Converts text to speech using Grok TTS API',
    tables: [
      {
        name: 'llm_api_calls',
        operations: ['insert'],
        requiredColumns: ['provider', 'model', 'function_name', 'status', 'response_time_ms'],
        optionalColumns: ['prompt_tokens', 'total_tokens', 'cost_usd', 'error_message', 'user_id', 'request_metadata'],
      },
    ],
    rpcs: [],
    requiresAuth: false,
    requiresAdmin: false,
    lastUpdated: '2026-01-23',
  },

  // ============ AI/LLM Functions ============
  {
    name: 'grok-chat',
    description: 'Proxy for Grok AI chat completions',
    tables: [
      {
        name: 'llm_api_calls',
        operations: ['insert'],
        requiredColumns: ['provider', 'model', 'function_name', 'status', 'response_time_ms'],
        optionalColumns: ['prompt_tokens', 'completion_tokens', 'total_tokens', 'cost_usd', 'error_message', 'user_id'],
      },
    ],
    rpcs: [],
    requiresAuth: false,
    requiresAdmin: false,
    lastUpdated: '2026-01-23',
  },
  {
    name: 'llm-with-failover',
    description: 'LLM proxy with automatic failover between providers',
    tables: [
      {
        name: 'llm_failover_config',
        operations: ['select'],
        requiredColumns: ['id', 'primary_provider_key', 'backup_provider_key', 'priority', 'is_active'],
        optionalColumns: ['trigger_on_rate_limit', 'trigger_on_timeout', 'trigger_on_error', 'timeout_threshold_ms', 'max_retries_before_failover', 'cooldown_seconds'],
      },
      {
        name: 'llm_provider_status',
        operations: ['select', 'upsert', 'update'],
        requiredColumns: ['provider_key', 'is_healthy', 'failure_count', 'updated_at'],
        optionalColumns: ['last_failure_at', 'cooldown_until'],
      },
      {
        name: 'llm_providers',
        operations: ['select'],
        requiredColumns: ['provider_key', 'api_endpoint'],
      },
      {
        name: 'llm_failover_events',
        operations: ['insert'],
        requiredColumns: ['config_id', 'primary_provider', 'backup_provider', 'trigger_reason', 'backup_success', 'response_time_ms'],
        optionalColumns: ['original_error'],
      },
      {
        name: 'llm_api_calls',
        operations: ['insert'],
        requiredColumns: ['provider', 'model', 'function_name', 'status', 'response_time_ms'],
        optionalColumns: ['input_tokens', 'output_tokens', 'total_tokens', 'error_message'],
      },
    ],
    rpcs: [],
    requiresAuth: false,
    requiresAdmin: false,
    lastUpdated: '2026-01-23',
  },
  {
    name: 'scheduled-health-check',
    description: 'Periodically checks health of LLM providers',
    tables: [
      {
        name: 'llm_providers',
        operations: ['select', 'update'],
        requiredColumns: ['provider_key', 'display_name', 'api_endpoint', 'health_status', 'api_key_configured', 'is_active'],
        optionalColumns: ['last_health_check'],
      },
      {
        name: 'llm_provider_status',
        operations: ['upsert'],
        requiredColumns: ['provider_key', 'is_healthy', 'failure_count', 'updated_at'],
        optionalColumns: ['last_failure_at'],
      },
      {
        name: 'llm_health_check_logs',
        operations: ['insert'],
        requiredColumns: ['provider_key', 'check_type', 'previous_status', 'new_status', 'response_time_ms'],
        optionalColumns: ['error_message', 'metadata'],
      },
    ],
    rpcs: [],
    requiresAuth: false,
    requiresAdmin: false,
    lastUpdated: '2026-01-23',
  },

  // ============ System/Monitoring Functions ============
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
  {
    name: 'error-collector',
    description: 'Collects frontend errors for monitoring and debugging',
    tables: [],
    rpcs: ['log_system_error_secure'],
    requiresAuth: false,
    requiresAdmin: false,
    lastUpdated: '2026-01-23',
  },
  {
    name: 'supabase-analytics-query',
    description: 'Executes analytics queries against Supabase logs',
    tables: [],
    rpcs: ['execute_sql'],
    requiresAuth: false,
    requiresAdmin: false,
    lastUpdated: '2026-01-23',
  },
  {
    name: 'process-recurring-chores',
    description: 'Cron job to create new chore assignments from recurring patterns',
    tables: [
      {
        name: 'chore_assignments',
        operations: ['select', 'insert'],
        requiredColumns: ['id', 'chore_id', 'family_id', 'assigned_to', 'assigned_by', 'due_date', 'status'],
        optionalColumns: ['recurrence_pattern'],
      },
    ],
    rpcs: ['calculate_next_due_date'],
    requiresAuth: false,
    requiresAdmin: false,
    lastUpdated: '2026-01-23',
  },
  {
    name: 'edge-function-health-check',
    description: 'Monitors health of all edge functions with auto-recovery',
    tables: [
      {
        name: 'edge_function_alert_config',
        operations: ['select'],
        requiredColumns: ['function_name', 'response_time_threshold_ms', 'consecutive_failures_threshold', 'is_enabled'],
        optionalColumns: ['warmup_threshold', 'critical_threshold', 'max_recovery_attempts', 'recovery_cooldown_minutes'],
      },
      {
        name: 'edge_function_health_logs',
        operations: ['select', 'insert'],
        requiredColumns: ['function_name', 'status', 'response_time_ms', 'check_type'],
        optionalColumns: ['error_message', 'previous_status', 'http_status_code', 'metadata', 'created_at'],
      },
      {
        name: 'edge_function_recovery_attempts',
        operations: ['insert'],
        requiredColumns: ['function_name', 'attempt_number', 'attempt_type', 'status', 'response_time_ms', 'triggered_by', 'consecutive_failures_before'],
        optionalColumns: ['error_message', 'metadata'],
      },
      {
        name: 'system_alerts',
        operations: ['insert'],
        requiredColumns: ['alert_type', 'severity', 'title', 'message'],
        optionalColumns: ['metadata', 'resolved', 'resolved_at'],
      },
    ],
    rpcs: ['get_function_recovery_status'],
    requiresAuth: false,
    requiresAdmin: false,
    lastUpdated: '2026-01-23',
  },
  {
    name: 'security-monitoring',
    description: 'Analyzes access patterns and detects security threats',
    tables: [
      {
        name: 'user_activity_logs',
        operations: ['select'],
        requiredColumns: ['user_id', 'activity_type', 'created_at'],
        optionalColumns: ['metadata', 'ip_address', 'success'],
      },
      {
        name: 'security_audit_logs',
        operations: ['select', 'insert'],
        requiredColumns: ['user_id', 'event_type', 'severity', 'event_details'],
        optionalColumns: ['created_at'],
      },
      {
        name: 'system_errors',
        operations: ['select'],
        requiredColumns: ['id', 'created_at'],
      },
    ],
    rpcs: [],
    requiresAuth: true,
    requiresAdmin: true,
    lastUpdated: '2026-01-23',
  },
  {
    name: 'security-testing',
    description: 'Runs comprehensive security test suite against database',
    tables: [
      {
        name: 'profiles',
        operations: ['select'],
        requiredColumns: ['id', 'user_id'],
      },
      {
        name: 'admin_audit_logs',
        operations: ['select'],
        requiredColumns: ['id'],
      },
      {
        name: 'security_audit_logs',
        operations: ['insert'],
        requiredColumns: ['user_id', 'event_type', 'severity', 'event_details'],
      },
    ],
    rpcs: ['has_role', 'test_profiles_access', 'cleanup_expired_sessions'],
    requiresAuth: true,
    requiresAdmin: true,
    lastUpdated: '2026-01-23',
  },
];

// ============ Utility Functions ============

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
 * Get all edge functions that require admin privileges
 */
export function getAdminFunctions(): EdgeFunctionDependency[] {
  return EDGE_FUNCTION_DEPENDENCIES.filter((dep) => dep.requiresAdmin);
}

/**
 * Get all edge functions that don't require authentication
 */
export function getPublicFunctions(): EdgeFunctionDependency[] {
  return EDGE_FUNCTION_DEPENDENCIES.filter((dep) => !dep.requiresAuth);
}

/**
 * Get all edge functions suitable for cron/scheduled execution
 * (functions that don't require auth and are typically run internally)
 */
export function getCronFunctions(): EdgeFunctionDependency[] {
  const cronFunctionNames = [
    'process-recurring-chores',
    'scheduled-health-check',
    'edge-function-health-check',
    'cleanup-test-families',
  ];
  return EDGE_FUNCTION_DEPENDENCIES.filter((dep) => 
    cronFunctionNames.includes(dep.name)
  );
}

/**
 * Get edge functions by category
 */
export function getFunctionsByCategory(category: 'admin' | 'test' | 'child' | 'communication' | 'ai' | 'system'): EdgeFunctionDependency[] {
  const categoryMap: Record<string, string[]> = {
    admin: ['admin-create-user', 'admin-update-user', 'admin-add-family-member', 'admin-remove-family-member', 'update-site-settings', 'manage-llm-provider'],
    test: ['create-test-family', 'cleanup-test-families', 'delete-family-comprehensive'],
    child: ['create-child-account', 'complete-child-account'],
    communication: ['send-family-email', 'text-to-speech'],
    ai: ['grok-chat', 'llm-with-failover', 'scheduled-health-check', 'manage-llm-provider'],
    system: ['api-integration-status', 'error-collector', 'supabase-analytics-query', 'process-recurring-chores', 'edge-function-health-check', 'security-monitoring', 'security-testing'],
  };
  
  const names = categoryMap[category] || [];
  return EDGE_FUNCTION_DEPENDENCIES.filter((dep) => names.includes(dep.name));
}

/**
 * Validate that all required columns for an edge function are non-empty strings
 * This is a basic sanity check on the registry itself
 */
export function validateRegistryIntegrity(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const seenNames = new Set<string>();

  for (const dep of EDGE_FUNCTION_DEPENDENCIES) {
    // Check for empty or duplicate names
    if (!dep.name || dep.name.trim() === '') {
      errors.push('Found edge function with empty name');
    } else if (seenNames.has(dep.name)) {
      errors.push(`Duplicate edge function name: "${dep.name}"`);
    } else {
      seenNames.add(dep.name);
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dep.lastUpdated)) {
      errors.push(`Edge function "${dep.name}" has invalid lastUpdated format: "${dep.lastUpdated}"`);
    }

    // Validate tables
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

      // Check for duplicate columns
      const allCols = [...table.requiredColumns, ...(table.optionalColumns || [])];
      const uniqueCols = new Set(allCols);
      if (uniqueCols.size !== allCols.length) {
        errors.push(
          `Edge function "${dep.name}" table "${table.name}" has duplicate columns`
        );
      }
    }

    // Validate that admin functions require auth
    if (dep.requiresAdmin && !dep.requiresAuth) {
      errors.push(
        `Edge function "${dep.name}" requires admin but not auth - this is invalid`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a human-readable validation report
 */
export function generateValidationReport(
  results: { functionName: string; valid: boolean; missingColumns?: string[]; missingRpcs?: string[] }[]
): string {
  const lines: string[] = [
    '# Edge Function Schema Validation Report',
    `Generated: ${new Date().toISOString()}`,
    `Total Functions: ${results.length}`,
    `Passing: ${results.filter(r => r.valid).length}`,
    `Failing: ${results.filter(r => !r.valid).length}`,
    '',
  ];

  const failing = results.filter(r => !r.valid);
  if (failing.length > 0) {
    lines.push('## Failing Functions');
    for (const result of failing) {
      lines.push(`### ${result.functionName}`);
      if (result.missingColumns?.length) {
        lines.push(`- Missing columns: ${result.missingColumns.join(', ')}`);
      }
      if (result.missingRpcs?.length) {
        lines.push(`- Missing RPCs: ${result.missingRpcs.join(', ')}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
