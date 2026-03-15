

# Database Optimization Plan

## Current State Assessment

**Database size**: Small (59 tables, largest table `edge_function_health_logs` at 4,070 rows / 1.6 MB). Total database is under 10 MB. This means most optimizations are preventive — preparing for growth rather than fixing current bottlenecks.

**Key findings:**

### 1. Unused Indexes (wasteful writes)
20 indexes with `idx_scan = 0` — never used since last stats reset. Notable:
- `edge_function_health_logs_pkey` (232 KB, never scanned — rows are INSERT-only, never looked up by PK)
- `idx_security_audit_logs_user_events` (40 KB)
- `idx_content_items_skill_levels`, `idx_life_skill_catalog_category`, `idx_life_skill_catalog_domain`
- `idx_llm_providers_active`

Some are PKEYs (can't drop) or too small to matter. But several custom indexes are dead weight slowing inserts on high-write tables.

### 2. Over-indexed log tables
- `security_audit_logs`: 10 indexes on 225 rows (192 KB indexes vs 168 KB data)
- `user_activity_logs`: 8 indexes on 234 rows
- `user_sessions`: 8 indexes on 0 active rows (328 KB total)
- `edge_function_health_logs`: 4 indexes but highest write volume (4,070 rows)

For append-heavy log tables, each index adds write overhead.

### 3. SELECT * queries (3 active files)
Per project convention, all queries should use explicit column lists:
- `AdminAutoRepairLogs.tsx` → `select('*')` on `auto_repair_logs`
- `EnhancedSecurityDashboard.tsx` → `select('*')` on `security_audit_logs`
- `LLMHealthCheckLogs.tsx` → `select('*')` on `llm_health_check_logs`

### 4. Missing indexes on high-query patterns
- `edge_function_health_logs` has no index on `function_name` or `created_at` (most queries filter by these)
- `system_errors` queries filter by `severity`, `component`, `resolved` — only some are indexed

### 5. RLS linter warnings
- 1 overly permissive RLS policy (USING true on non-SELECT)
- Leaked password protection still disabled (dashboard config)

## Optimization Plan

### Fix 1: Drop unused custom indexes
Drop 5-6 custom indexes that have zero scans and aren't PKEYs or unique constraints. This reduces write overhead on log tables.

**Migration SQL**: `DROP INDEX IF EXISTS` for each confirmed unused custom index.

### Fix 2: Add missing indexes for common query patterns
- `edge_function_health_logs(created_at DESC)` — supports time-range queries
- `edge_function_health_logs(function_name, created_at DESC)` — supports filtered dashboard queries

### Fix 3: Replace SELECT * with explicit columns
Update 3 files to use explicit column lists:
- `AdminAutoRepairLogs.tsx`
- `EnhancedSecurityDashboard.tsx`  
- `LLMHealthCheckLogs.tsx`

### Fix 4: Add table partitioning prep for edge_function_health_logs
At 4,070 rows it's not urgent, but this is the fastest-growing table. Add a comment/migration note for future range partitioning by `created_at` when it exceeds ~100K rows.

### Fix 5: Fix permissive RLS policies
The `site_settings_unified` RESTRICTIVE policy with `qual = true` on ALL operations is safe (RESTRICTIVE + combined with other policies). The remaining 4 "Service role" policies use `TO service_role` implicitly. Confirm and document.

### Files to modify
| File | Change |
|------|--------|
| Migration SQL | Drop unused indexes, add missing indexes |
| `src/pages/admin/AdminAutoRepairLogs.tsx` | Replace `select('*')` with explicit columns |
| `src/components/admin/EnhancedSecurityDashboard.tsx` | Replace `select('*')` with explicit columns |
| `src/components/admin/llm/LLMHealthCheckLogs.tsx` | Replace `select('*')` with explicit columns |

