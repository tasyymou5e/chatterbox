/**
 * Safely extract error messages from unknown error types
 * Use this instead of `catch (error: any)` patterns
 */

/**
 * Extract a user-friendly error message from an unknown error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object') {
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    if ('error' in error && typeof error.error === 'string') {
      return error.error;
    }
    // Handle Supabase-style errors
    if ('error_description' in error && typeof error.error_description === 'string') {
      return error.error_description;
    }
  }
  return 'An unexpected error occurred';
}

/**
 * Type guard to check if an error has a message property
 */
export function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

/**
 * Type guard to check if an error has a code property (common in Supabase/PostgreSQL errors)
 */
export function isErrorWithCode(error: unknown): error is { code: string; message: string } {
  return (
    isErrorWithMessage(error) &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  );
}

/**
 * Extract error code if available (useful for handling specific PostgreSQL/Supabase errors)
 */
export function getErrorCode(error: unknown): string | null {
  if (isErrorWithCode(error)) {
    return error.code;
  }
  return null;
}
