import { expect } from 'vitest';
import type { PostgrestError } from '@supabase/supabase-js';

// Sensitive fields that should never be exposed to children
const CHILD_SENSITIVE_FIELDS = [
  'generated_email',
  'verification_pin',
  'pin_attempts',
  'locked_until',
] as const;

/**
 * Assert that a query was blocked by RLS
 */
export function expectRLSBlock(error: PostgrestError | null, data: any) {
  // RLS typically returns empty data rather than an error
  // But sometimes returns permission denied errors
  if (error) {
    const rlsErrorCodes = ['42501', 'PGRST301'];
    const isRLSError = rlsErrorCodes.some(code => 
      error.code === code || error.message.includes(code)
    );
    
    if (isRLSError) {
      return; // RLS blocked as expected
    }
  }
  
  // If no error, data should be empty
  expect(data).toEqual([]);
}

/**
 * Assert that a query succeeded and returned data
 */
export function expectRLSAllow(error: PostgrestError | null, data: any) {
  expect(error).toBeNull();
  expect(data).toBeDefined();
  
  if (Array.isArray(data)) {
    expect(data.length).toBeGreaterThan(0);
  } else {
    expect(data).not.toBeNull();
  }
}

/**
 * Assert that data contains only records matching a filter
 */
export function expectOnlyOwnData<T extends { user_id?: string; id?: string }>(
  data: T[],
  userId: string,
  field: keyof T = 'user_id'
) {
  expect(data).toBeDefined();
  expect(Array.isArray(data)).toBe(true);
  
  for (const record of data) {
    expect(record[field]).toBe(userId);
  }
}

/**
 * Assert that data contains only records from a specific family
 */
export function expectOnlyFamilyData<T extends { family_id?: string }>(
  data: T[],
  familyId: string
) {
  expect(data).toBeDefined();
  expect(Array.isArray(data)).toBe(true);
  
  for (const record of data) {
    expect(record.family_id).toBe(familyId);
  }
}

/**
 * Assert that an operation was denied (either error or empty result)
 */
export function expectAccessDenied(error: PostgrestError | null, data: any) {
  const hasError = error !== null;
  const isEmpty = data === null || (Array.isArray(data) && data.length === 0);
  
  expect(hasError || isEmpty).toBe(true);
}

/**
 * Assert that a specific error code was returned
 */
export function expectErrorCode(error: PostgrestError | null, code: string) {
  expect(error).not.toBeNull();
  expect(error?.code).toBe(code);
}

/**
 * Assert that data does not contain records from another family
 */
export function expectNoDataFromFamily<T extends { family_id?: string }>(
  data: T[],
  excludedFamilyId: string
) {
  expect(data).toBeDefined();
  
  if (Array.isArray(data)) {
    for (const record of data) {
      expect(record.family_id).not.toBe(excludedFamilyId);
    }
  }
}

/**
 * Assert that data does NOT contain a specific field
 */
export function expectFieldNotPresent<T extends Record<string, unknown>>(
  data: T | T[],
  fieldName: string
) {
  const records = Array.isArray(data) ? data : [data];
  for (const record of records) {
    if (record && typeof record === 'object') {
      expect(record).not.toHaveProperty(fieldName);
    }
  }
}

/**
 * Assert that generated_email is never exposed (recursively checks nested objects)
 * This is critical for COPPA compliance - children should NEVER see their auth email
 */
export function expectNoGeneratedEmail(data: unknown): void {
  if (!data) return;
  
  if (Array.isArray(data)) {
    for (const item of data) {
      expectNoGeneratedEmail(item);
    }
    return;
  }
  
  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>;
    
    // Check for the field directly
    expect(record).not.toHaveProperty('generated_email');
    expect(record).not.toHaveProperty('generatedEmail'); // camelCase variant
    
    // Recursively check nested objects
    for (const value of Object.values(record)) {
      if (typeof value === 'object' && value !== null) {
        expectNoGeneratedEmail(value);
      }
    }
  }
}

/**
 * Assert that multiple sensitive fields are excluded from data
 * Used to verify RPCs and views properly mask sensitive columns
 */
export function expectSensitiveFieldsExcluded(
  data: unknown,
  fields: readonly string[] = CHILD_SENSITIVE_FIELDS
): void {
  if (!data) return;
  
  const checkRecord = (record: Record<string, unknown>) => {
    for (const field of fields) {
      expect(record).not.toHaveProperty(field);
      // Also check camelCase variants
      const camelCase = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      if (camelCase !== field) {
        expect(record).not.toHaveProperty(camelCase);
      }
    }
  };
  
  if (Array.isArray(data)) {
    for (const item of data) {
      if (typeof item === 'object' && item !== null) {
        checkRecord(item as Record<string, unknown>);
      }
    }
  } else if (typeof data === 'object') {
    checkRecord(data as Record<string, unknown>);
  }
}

/**
 * Assert that a string value doesn't contain sensitive email patterns
 * Useful for checking error messages don't leak data
 */
export function expectNoEmailLeakInString(str: string): void {
  expect(str).not.toMatch(/@generated\./);
  expect(str).not.toMatch(/@chatterbox\.test/);
  expect(str).not.toMatch(/child\d+\.\d+@/);
}
