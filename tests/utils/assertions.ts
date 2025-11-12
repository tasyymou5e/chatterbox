import { expect } from 'vitest';
import type { PostgrestError } from '@supabase/supabase-js';

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
