/**
 * Schema Validation Utilities
 * 
 * Utilities for extracting and validating database schema information
 * to prevent edge function / database schema mismatches.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types
export interface TableColumn {
  column_name: string;
  data_type: string;
  is_nullable: boolean;
  column_default: string | null;
}

export interface TableInfo {
  table_name: string;
  columns: TableColumn[];
}

export interface RPCFunction {
  function_name: string;
  return_type: string;
}

export interface SchemaSnapshot {
  tables: Record<string, TableColumn[]>;
  rpcs: string[];
  timestamp: string;
}

export interface ColumnValidationResult {
  valid: boolean;
  table: string;
  missing: string[];
  found: string[];
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaValidationError[];
  warnings: SchemaValidationWarning[];
  timestamp: string;
}

export interface SchemaValidationError {
  type: 'missing_column' | 'missing_table' | 'missing_rpc' | 'type_mismatch';
  edgeFunction: string;
  table?: string;
  column?: string;
  rpc?: string;
  expected?: string;
  actual?: string;
  message: string;
}

export interface SchemaValidationWarning {
  type: 'deprecated_column' | 'nullable_required' | 'missing_index';
  edgeFunction: string;
  table?: string;
  column?: string;
  message: string;
}

/**
 * Creates a Supabase client for schema validation
 * Uses service role key for full schema access
 */
export function createSchemaValidationClient(): SupabaseClient {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'
    );
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Get all columns for a specific table
 */
export async function getTableColumns(
  supabase: SupabaseClient,
  tableName: string
): Promise<TableColumn[]> {
  const { data, error } = await supabase.rpc('get_table_columns', {
    p_table_name: tableName,
  });

  if (error) {
    console.error(`Error fetching columns for ${tableName}:`, error);
    return [];
  }

  return (data || []) as TableColumn[];
}

/**
 * Get all public tables in the database
 */
export async function getAllPublicTables(
  supabase: SupabaseClient
): Promise<string[]> {
  const { data, error } = await supabase.rpc('list_public_tables');

  if (error) {
    console.error('Error fetching public tables:', error);
    return [];
  }

  return (data || []).map((row: { table_name: string }) => row.table_name);
}

/**
 * Get all RPC functions in the public schema
 */
export async function getRPCFunctions(
  supabase: SupabaseClient
): Promise<RPCFunction[]> {
  const { data, error } = await supabase.rpc('list_rpc_functions');

  if (error) {
    console.error('Error fetching RPC functions:', error);
    return [];
  }

  return (data || []) as RPCFunction[];
}

/**
 * Check if a specific column exists in a table
 */
export async function validateColumnExists(
  supabase: SupabaseClient,
  tableName: string,
  columnName: string
): Promise<boolean> {
  const columns = await getTableColumns(supabase, tableName);
  return columns.some((col) => col.column_name === columnName);
}

/**
 * Validate multiple columns exist in a table
 */
export async function validateColumnsExist(
  supabase: SupabaseClient,
  tableName: string,
  requiredColumns: string[]
): Promise<ColumnValidationResult> {
  const columns = await getTableColumns(supabase, tableName);
  const columnNames = columns.map((col) => col.column_name);

  const missing: string[] = [];
  const found: string[] = [];

  for (const required of requiredColumns) {
    if (columnNames.includes(required)) {
      found.push(required);
    } else {
      missing.push(required);
    }
  }

  return {
    valid: missing.length === 0,
    table: tableName,
    missing,
    found,
  };
}

/**
 * Validate an RPC function exists
 */
export async function validateRPCExists(
  supabase: SupabaseClient,
  rpcName: string
): Promise<boolean> {
  const rpcs = await getRPCFunctions(supabase);
  return rpcs.some((rpc) => rpc.function_name === rpcName);
}

/**
 * Validate multiple RPC functions exist
 */
export async function validateRPCsExist(
  supabase: SupabaseClient,
  requiredRPCs: string[]
): Promise<{ valid: boolean; missing: string[]; found: string[] }> {
  const rpcs = await getRPCFunctions(supabase);
  const rpcNames = rpcs.map((rpc) => rpc.function_name);

  const missing: string[] = [];
  const found: string[] = [];

  for (const required of requiredRPCs) {
    if (rpcNames.includes(required)) {
      found.push(required);
    } else {
      missing.push(required);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
    found,
  };
}

/**
 * Generate a complete schema snapshot
 */
export async function getSchemaSnapshot(
  supabase: SupabaseClient
): Promise<SchemaSnapshot> {
  const tables = await getAllPublicTables(supabase);
  const rpcs = await getRPCFunctions(supabase);

  const tableSchemas: Record<string, TableColumn[]> = {};

  for (const tableName of tables) {
    tableSchemas[tableName] = await getTableColumns(supabase, tableName);
  }

  return {
    tables: tableSchemas,
    rpcs: rpcs.map((rpc) => rpc.function_name),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Compare a schema snapshot against expected dependencies
 */
export function compareSchemaWithDependencies(
  snapshot: SchemaSnapshot,
  dependencies: {
    tables: { name: string; requiredColumns: string[] }[];
    rpcs: string[];
  }
): { valid: boolean; missingColumns: { table: string; columns: string[] }[]; missingRPCs: string[] } {
  const missingColumns: { table: string; columns: string[] }[] = [];
  const missingRPCs: string[] = [];

  // Check tables and columns
  for (const tableReq of dependencies.tables) {
    const tableColumns = snapshot.tables[tableReq.name];
    
    if (!tableColumns) {
      missingColumns.push({
        table: tableReq.name,
        columns: tableReq.requiredColumns,
      });
      continue;
    }

    const columnNames = tableColumns.map((c) => c.column_name);
    const missing = tableReq.requiredColumns.filter(
      (col) => !columnNames.includes(col)
    );

    if (missing.length > 0) {
      missingColumns.push({
        table: tableReq.name,
        columns: missing,
      });
    }
  }

  // Check RPCs
  for (const rpc of dependencies.rpcs) {
    if (!snapshot.rpcs.includes(rpc)) {
      missingRPCs.push(rpc);
    }
  }

  return {
    valid: missingColumns.length === 0 && missingRPCs.length === 0,
    missingColumns,
    missingRPCs,
  };
}

/**
 * Format validation results as a human-readable report
 */
export function formatValidationReport(
  functionName: string,
  result: ReturnType<typeof compareSchemaWithDependencies>
): string {
  if (result.valid) {
    return `✓ ${functionName}: All dependencies validated successfully`;
  }

  const lines: string[] = [`✗ ${functionName}: Schema validation failed`];

  for (const missing of result.missingColumns) {
    lines.push(
      `  - Table "${missing.table}" is missing columns: ${missing.columns.join(', ')}`
    );
  }

  if (result.missingRPCs.length > 0) {
    lines.push(`  - Missing RPC functions: ${result.missingRPCs.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Quick validation check for a single edge function's dependencies
 */
export async function quickValidate(
  supabase: SupabaseClient,
  edgeFunctionName: string,
  tables: { name: string; columns: string[] }[],
  rpcs: string[]
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Validate tables
  for (const table of tables) {
    const result = await validateColumnsExist(supabase, table.name, table.columns);
    if (!result.valid) {
      errors.push(
        `${edgeFunctionName}: Table "${table.name}" missing columns: ${result.missing.join(', ')}`
      );
    }
  }

  // Validate RPCs
  const rpcResult = await validateRPCsExist(supabase, rpcs);
  if (!rpcResult.valid) {
    errors.push(
      `${edgeFunctionName}: Missing RPC functions: ${rpcResult.missing.join(', ')}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
