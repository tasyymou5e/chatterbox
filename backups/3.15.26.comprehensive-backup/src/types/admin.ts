/**
 * Type definitions for admin-related data structures
 * Replaces generic 'any' types with proper TypeScript interfaces
 */

/**
 * Metadata for family records
 */
export interface FamilyMetadata {
  is_test_family?: boolean;
  created_source?: 'manual' | 'test' | 'import';
  settings?: Record<string, unknown>;
  notes?: string;
}

/**
 * Result of test family creation operation
 */
export interface TestFamilyCreationResult {
  family: {
    id: string;
    name: string;
    code: string;
  };
  parent1: {
    id: string;
    email: string;
    name: string;
  };
  parent2?: {
    id: string;
    email: string;
    name: string;
  };
  children: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  credentials: {
    parent1Password: string;
    parent2Password?: string;
    childPasswords: Record<string, string>;
  };
  cleanedUp?: {
    families: number;
    users: number;
    profiles: number;
  };
}

/**
 * User search result for member management
 */
export interface UserSearchResult {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  roles?: string[];
}

/**
 * Role conflict detection result
 */
export interface RoleConflict {
  user_id: string;
  email: string;
  conflicting_roles: string[];
  conflict_type: 'admin_family' | 'multiple_admin' | 'orphaned_role';
  severity: 'low' | 'medium' | 'high';
  suggested_resolution?: string;
}

/**
 * Admin audit log entry
 */
export interface AdminAuditEntry {
  id: string;
  admin_user_id: string;
  operation_type: string;
  target_table?: string;
  target_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

/**
 * User creation data structure
 */
export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  generatePassword: boolean;
  adminRole: string;
  familyRole: string;
}

/**
 * Family member with profile data
 */
export interface FamilyMemberWithProfile {
  id: string;
  user_id: string;
  family_id: string;
  role: 'parent' | 'child' | 'guardian' | 'therapist';
  joined_at: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

/**
 * Bulk email recipient
 */
export interface EmailRecipient {
  email: string;
  name?: string;
  userId: string;
  role?: string;
}

/**
 * Content item for admin management
 */
export interface AdminContentItem {
  id: string;
  title: string;
  description?: string;
  url: string;
  thumbnail_url?: string;
  content_type: string;
  category_id?: string;
  tags: string[];
  age_min: number;
  age_max: number;
  content_rating: string;
  platform: string;
  is_free: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
