/**
 * Helper utilities for authentication-related operations
 */

/**
 * Returns the appropriate dashboard path based on user role
 */
export function getDashboardPath(role: string | null): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'parent':
      return '/parent';
    case 'child':
      return '/children/tasks';
    default:
      return '/parent-dashboard';
  }
}
