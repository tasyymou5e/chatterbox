/**
 * Shared API Types for Supabase Edge Functions
 * 
 * @description Common type definitions used across all edge functions
 * for consistent request/response handling.
 * 
 * @module api-types
 */

// ============================================
// Response Types
// ============================================

/**
 * Standard API response wrapper for successful operations.
 * 
 * @template T - The type of data contained in the response
 * 
 * @example
 * const response: ApiResponse<User> = {
 *   success: true,
 *   data: { id: '123', email: 'user@example.com' },
 *   message: 'User created successfully'
 * };
 */
export interface ApiResponse<T = unknown> {
  /** Always true for successful responses */
  success: true;
  /** The response payload */
  data?: T;
  /** Optional success message */
  message?: string;
}

/**
 * Standard API error response.
 * 
 * @example
 * const errorResponse: ApiErrorResponse = {
 *   success: false,
 *   error: 'User not found',
 *   code: 'USER_NOT_FOUND',
 *   details: { userId: '123' }
 * };
 */
export interface ApiErrorResponse {
  /** Always false for error responses */
  success: false;
  /** Human-readable error message */
  error: string;
  /** Machine-readable error code for client handling */
  code?: string;
  /** Additional error context for debugging */
  details?: Record<string, unknown>;
}

/**
 * Union type for all API responses.
 * 
 * @template T - The type of successful response data
 */
export type ApiResult<T = unknown> = ApiResponse<T> | ApiErrorResponse;

// ============================================
// Pagination Types
// ============================================

/**
 * Standard pagination parameters for list endpoints.
 * 
 * @example
 * const params: PaginationParams = {
 *   page: 1,
 *   pageSize: 20,
 *   sortBy: 'created_at',
 *   sortOrder: 'desc'
 * };
 */
export interface PaginationParams {
  /** Page number (1-indexed) */
  page?: number;
  /** Number of items per page */
  pageSize?: number;
  /** Field to sort by */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response metadata.
 */
export interface PaginationMeta {
  /** Current page number */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total number of items */
  totalItems: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNextPage: boolean;
  /** Whether there is a previous page */
  hasPreviousPage: boolean;
}

/**
 * Paginated API response.
 * 
 * @template T - The type of items in the list
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  /** Pagination metadata */
  pagination: PaginationMeta;
}

// ============================================
// Authentication Types
// ============================================

/**
 * User role types in the application.
 */
export type UserRole = 'admin' | 'parent' | 'child' | 'read_only';

/**
 * Authentication context extracted from JWT.
 */
export interface AuthContext {
  /** Authenticated user's ID */
  userId: string;
  /** User's email address */
  email: string;
  /** User's roles */
  roles: UserRole[];
  /** Whether user has admin privileges */
  isAdmin: boolean;
  /** Session ID for tracking */
  sessionId?: string;
}

// ============================================
// Request Types
// ============================================

/**
 * Create child account request body.
 */
export interface CreateChildAccountRequest {
  /** Child's first name */
  firstName: string;
  /** Child's last name */
  lastName: string;
  /** ID of the requesting parent or admin */
  parentUserId: string;
  /** Account password (min 8 characters) */
  password: string;
  /** Target family ID (required for admins) */
  familyId?: string;
}

/**
 * Create child account success response.
 */
export interface CreateChildAccountResponse {
  success: true;
  childAccount: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    accountCode: string | null;
    status: 'pending' | 'completed' | 'expired';
  };
  family: {
    id: string;
    name: string;
    code: string;
  };
  instructions: {
    nextSteps: string[];
    loginUrl: string;
  };
}

/**
 * Admin create user request body.
 */
export interface AdminCreateUserRequest {
  /** User's email address */
  email: string;
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /** Roles to assign */
  roles: UserRole[];
  /** Custom password (optional - auto-generated if omitted) */
  customPassword?: string;
}

/**
 * Admin create user success response.
 */
export interface AdminCreateUserResponse {
  success: true;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    roles: UserRole[];
  };
  /** The password (generated or provided) - share with user securely */
  password: string;
}

/**
 * Send family email request body.
 */
export interface SendFamilyEmailRequest {
  /** Target family ID */
  familyId: string;
  /** Email subject */
  subject: string;
  /** Email body (HTML or plain text) */
  body: string;
  /** Recipients: 'all', 'parents', or array of user IDs */
  recipients: 'all' | 'parents' | string[];
}

/**
 * Text-to-speech request body.
 */
export interface TextToSpeechRequest {
  /** Text to convert (max 5000 characters) */
  text: string;
  /** Voice ID (provider-specific) */
  voice?: string;
  /** Playback speed (0.5 - 2.0) */
  speed?: number;
}

/**
 * Grok chat request body.
 */
export interface GrokChatRequest {
  /** Conversation messages */
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  /** Response randomness (0.0 - 1.0) */
  temperature?: number;
  /** Maximum response tokens */
  maxTokens?: number;
}

/**
 * Error collector request body.
 */
export interface ErrorCollectorRequest {
  /** Type/category of error */
  errorType: string;
  /** Error message */
  message: string;
  /** Stack trace if available */
  stackTrace?: string;
  /** Component where error occurred */
  componentName?: string;
  /** Route path where error occurred */
  routePath?: string;
  /** Browser information */
  browserInfo?: Record<string, unknown>;
  /** Device information */
  deviceInfo?: Record<string, unknown>;
  /** User ID if authenticated */
  userId?: string;
  /** Session ID for correlation */
  sessionId?: string;
}

/**
 * Security event request body.
 */
export interface SecurityEventRequest {
  /** Type of security event */
  eventType: string;
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Event details */
  details: Record<string, unknown>;
}

// ============================================
// CORS Configuration
// ============================================

/**
 * Standard CORS headers for edge functions.
 * 
 * @example
 * return new Response(JSON.stringify(data), {
 *   headers: { ...corsHeaders, 'Content-Type': 'application/json' }
 * });
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
} as const;

// ============================================
// Utility Types
// ============================================

/**
 * Make all properties of T optional except those in K.
 */
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Extract the data type from an ApiResponse.
 */
export type ExtractResponseData<T> = T extends ApiResponse<infer D> ? D : never;

/**
 * Type guard to check if response is an error.
 * 
 * @param response - API response to check
 * @returns True if response is an error
 * 
 * @example
 * const result = await callApi();
 * if (isApiError(result)) {
 *   console.error(result.error);
 * } else {
 *   console.log(result.data);
 * }
 */
export function isApiError(response: ApiResult): response is ApiErrorResponse {
  return response.success === false;
}

/**
 * Creates a standardized success response.
 * 
 * @template T - Type of response data
 * @param data - Response payload
 * @param message - Optional success message
 * @returns Formatted success response
 * 
 * @example
 * return new Response(
 *   JSON.stringify(createSuccessResponse({ user: newUser }, 'User created')),
 *   { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
 * );
 */
export function createSuccessResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
}

/**
 * Creates a standardized error response.
 * 
 * @param error - Human-readable error message
 * @param code - Machine-readable error code
 * @param details - Additional error context
 * @returns Formatted error response
 * 
 * @example
 * return new Response(
 *   JSON.stringify(createErrorResponse('User not found', 'USER_NOT_FOUND')),
 *   { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
 * );
 */
export function createErrorResponse(
  error: string,
  code?: string,
  details?: Record<string, unknown>
): ApiErrorResponse {
  return {
    success: false,
    error,
    ...(code && { code }),
    ...(details && { details }),
  };
}
